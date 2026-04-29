# Notification Permission Fix — Plan

## Context

Push notifications stopped working in production after the deep-linking PR
(#331) shipped, even though email notifications still arrive and the mobile
app records the device in our DB.

OneSignal dashboard for a test device (`<DEVICE_NAME>` on Android `<VERSION>`) shows:

- Status: **Never Subscribed**
- Status details: **Permission Not Granted**
- Several sessions recorded across consecutive days

So the SDK is running on the device, but OneSignal has never observed a
permission grant, so it has no push token and no subscription. The server's
send call returns:

```json
{"id":"","errors":{"invalid_player_ids":["<ONE_SIGNAL_PLAYER_ID>"]}}
```

…with HTTP 200, which our current server code treats as success. Two bugs
combine to produce the observed silence: a mobile permission flow that
doesn't reliably request or observe permission, and a server response check
that swallows OneSignal's "no recipients reached" rejection.

Local emulator testing previously masked the mobile bug because older Android
emulators auto-granted notification permission. Android 13+ requires explicit
`POST_NOTIFICATIONS` runtime grant.

---

## Root cause

### Mobile — `apps/nativeapp/app/services/OneSignal/OneSignalStateManager.ts:78-80`

```typescript
OneSignal.initialize(appId);
OneSignal.Notifications.requestPermission(false);
OneSignal.login(userId);
```

Three problems on three lines:

1. **`requestPermission` is fire-and-forget.** It returns `Promise<boolean>`
   but is not awaited. The result is unobservable, and `login(userId)` can
   race ahead of the SDK's permission state machine.
2. **`fallbackToSettings = false`.** A user who denied once can never be
   prompted again from inside the app — the SDK won't deep-link them to
   system Settings to re-enable.
3. **No permission-change listener.** When the user toggles notifications on
   in Settings (which is how this user said they "allowed" it), the SDK has
   no observer registered, so OneSignal's internal subscription state stays
   at "Never Subscribed".

There is also no explicit `OneSignal.User.pushSubscription.optIn()` call
after a permission grant. v5 *should* auto-opt-in but doesn't reliably do so
when permission was previously denied or when the listener wasn't registered
in time.

### Server — `apps/server/src/Services/Notifier/Notifier/DeviceNotifier.ts:96`

```typescript
if (!response.ok) { /* mark fail */ }
return true;
```

Treats any HTTP 200 as success. OneSignal's API contract is more nuanced:

| Response | Body shape | Meaning |
|---|---|---|
| 200 | `{"id":"<id>","recipients":N}` | Real success |
| 200 | `{"id":"","errors":{"invalid_player_ids":[...]}}` | Total failure — zero recipients |
| 200 | `{"id":"<id>","recipients":N,"errors":{"invalid_player_ids":[...]}}` | Partial — some delivered, some rejected |
| 4xx/5xx | error body | API auth or rate limit failure |

Cases 2 and 3 are silently treated as success today. `failCount` never
increments, so the alertMethod is never disabled, and operators have no
signal that delivery is broken.

---

## Changes

### File 1: `apps/nativeapp/app/services/OneSignal/OneSignalStateManager.ts`

Replace the body of `_performInitialization` so that:

1. `initialize` runs first.
2. `login` runs second (sets external ID).
3. The `permissionChange` listener registers **before** any permission ask
   so we never miss the grant event.
4. The `pushSubscription.change` listener registers (existing behavior, kept).
5. `getPermissionAsync()` reads current state.
6. If permission is not yet granted → `requestPermission(true)` is awaited.
   `true` enables fallback to Settings for previously-denied users.
7. If `requestPermission` returns `true` (or permission was already granted),
   `optIn()` is called explicitly to flip the OneSignal subscription.
8. The `permissionChange` listener also calls `optIn()` on grant, so manual
   permission changes via system Settings flip the subscription too.
9. `permissionChange` dispatches a `permission_changed` event so
   `OneSignalContext`'s subscriber can re-sync the device record on the
   server.

Add a `private handlePermissionChange` method to centralize the listener
logic.

### File 2: `apps/server/src/Services/Notifier/Notifier/DeviceNotifier.ts`

Replace the `if (!response.ok)` block with a broader rejection check:

```typescript
const hasInvalidPlayers = !!responseBody?.errors?.invalid_player_ids?.length;
const noneDelivered =
  responseBody?.id === '' || responseBody?.recipients === 0;
const oneSignalRejection = hasInvalidPlayers || noneDelivered;

if (!response.ok || oneSignalRejection) {
  // log specific reason, call handleFailedNotification, return false
}
```

`handleFailedNotification` already exists and increments `failCount`. After
`MAX_FAIL_COUNT[DEVICE] = 3` failures, the alertMethod is auto-disabled and
the user is emailed (existing behavior, unchanged). On success,
`SendNotifications.ts` already resets `failCount` to 0, so a recovered
device returns to a clean slate naturally.

---

## Loop-safety review

The plan introduces one new event listener (`permissionChange`) and one new
explicit subscription mutation (`optIn()`). Walking each path:

**Path A — fresh install, user grants permission:**
1. `initialize` → `login` → listeners registered → `getPermissionAsync()`
   returns `false` → `requestPermission(true)` awaits → user taps Allow.
2. `permissionChange` listener fires with `true`.
3. Listener calls `updateDeviceState()` (read-only OneSignal calls,
   `setState` dispatches `state_updated`) and dispatches
   `permission_changed`.
4. Listener also calls `optIn()`. This triggers `pushSubscription.change`.
5. Existing `pushSubscription.change` handler runs `updateDeviceState()` and
   dispatches `subscription_changed`.
6. `OneSignalContext` subscriber sees `permission_changed` then
   `subscription_changed` → calls `performSync` twice. Internal
   `syncCompleted` ref dedupes the second call (subscription_changed resets
   the flag, but by then sync is already done; if sync is still running, the
   second call is awaited concurrently — safe).

No path causes a listener to re-trigger itself. `optIn()` does **not** fire
`permissionChange`. `getPermissionAsync()` is read-only. `setState` only
fires `state_updated`, which is not consumed for sync.

**Path B — user denies permission, later allows via Settings:**
1. `requestPermission(true)` returns `false`. No `optIn()` call.
2. Later, user opens system Settings and toggles on.
3. OneSignal's `permissionChange` listener fires with `true`.
4. Same flow as Path A from step 3.

**Path C — permission already granted at install (e.g., reinstall after
previous grant):**
1. `getPermissionAsync()` returns `true`.
2. We skip `requestPermission` and call `optIn()` directly.
3. `optIn()` triggers `pushSubscription.change`.
4. Single sync. No permission event fires (state didn't change).

**Path D — existing 5-second polling (`checkPermissions` in
`OneSignalContext`):**
- Polling reads OS permission and calls `setState({permission})` if changed.
- `setState` dispatches `state_updated` only, not `permission_changed`.
- `state_updated` does not trigger sync in `OneSignalContext`.
- Polling is now redundant with the `permissionChange` listener but causes
  no loop. Removal is **out of scope** for this PR (separate cleanup).

**Path E — `optIn()` called when subscription already opted in:**
- v5 docs say this is a no-op. No `subscription.change` event fires for
  no-op state. Confirmed safe.

**Path F — server `handleFailedNotification` cascades:**
- After 3 device failures, the alertMethod is disabled (`isEnabled=false`).
- `SendNotifications.ts` filters by `isEnabled=true`, so disabled methods
  are not retried. No retry loop at the server level.

No infinite loops in any path.

---

## Files modified

| File | Approx lines changed |
|---|---|
| `apps/nativeapp/app/services/OneSignal/OneSignalStateManager.ts` | ~40 added/changed |
| `apps/server/src/Services/Notifier/Notifier/DeviceNotifier.ts` | ~15 added/changed |

No new dependencies. No DB migration. No native (Pods/gradle) changes.

---

## Out of scope

- Removing the 5-second `checkPermissions` polling in `OneSignalContext`
  (now redundant — separate cleanup PR).
- Adding tests for the OneSignal state manager (no test scaffold for that
  folder yet).
- Touching `deviceSyncLogic.ts` — its `isEnabled = params.permission` is
  correct once permission is reliably tracked.

---

## Verification (local-first)

User testing setup:
- Local server with production OneSignal credentials in `.env`
- Local Postgres for FireAlert DB
- Android 16 emulator (Pixel 10) **or** a real Android 13+ device

### Steps

1. **Uninstall the app from the emulator** (clears OS permission state and
   any cached OneSignal subscription).
2. Build and install fresh from this branch.
3. On first launch, OS permission dialog should appear. Tap **Allow**.
4. In OneSignal dashboard → search the new Subscription ID. Status should
   change from "Never Subscribed" to **Subscribed** within seconds.
5. Hit the local cron endpoint or seed a test alert. Server logs should
   show `responseBody.id` populated (a real OneSignal notification ID, not
   empty) and `recipients >= 1`.
6. The push should land on the device.

### Regression cases

7. In Settings, toggle FireAlert notifications **off**. Trigger cron again.
   Server should log `invalid_player_ids` failure (the new check) and
   `failCount` should increment in the DB. Push does not arrive (expected).
8. Toggle FireAlert notifications **back on** in Settings. The
   `permissionChange` listener should fire, `optIn()` is called, OneSignal
   re-subscribes the device. Trigger cron again — push arrives.
9. Repeat the failure 3 times — alertMethod should auto-disable
   (`isEnabled=false`) and the user should receive a fallback email
   notification (existing behavior, just newly reachable).

### Recommended Android version

Android 16 emulator (Pixel 10) is correct — it matches the user's real
device and exercises the Android 13+ runtime permission path which is where
the bug lives. Older emulators (Android 12 and below) would not surface the
bug because permission is auto-granted.

---

## Rollout notes

- After merge, deploy server first (Vercel auto-deploys on develop merge).
  The new failure detection becomes active immediately. Existing broken
  installs will start incrementing `failCount` and will be auto-disabled
  after 3 cron runs. They were already not receiving notifications, so this
  is observability gain, not new breakage.
- Mobile fix ships in the next TestFlight/Play track build. Users who
  reinstall or update will have their permission flow corrected; on first
  successful send `failCount` resets to 0 (existing logic in
  `SendNotifications.ts`).
