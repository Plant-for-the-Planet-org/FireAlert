# Deep Linking — Verification & Fix Plan

## Context

The `features/notifications-deeplinking` branch adds deep linking support to FireAlert so that tapping a push notification (or a universal/app link) opens the correct alert or incident directly in the app. The implementation is largely complete and structurally sound, but has two production blockers (unfilled placeholders) and one functional gap (cold-start notifications not handled).

---

## Current State — What Is Working

| Area | Status |
|---|---|
| React Navigation `LinkingOptions` + custom `getStateFromPath` | ✅ Correct |
| `handleNotificationOpen` → extracts URL from notification, dispatches `reset()` | ✅ Correct |
| iOS custom URL scheme (`firealert://`) in `Info.plist` | ✅ Correct |
| iOS Associated Domains entitlement (`applinks:firealert.plant-for-the-planet.org`) | ✅ Correct |
| Android intent filters with `autoVerify` for `/alert`, `/incident`, `/verify` | ✅ Correct |
| Android custom URL scheme (`firealert://`) intent filter | ✅ Correct |
| `OneSignalProvider` import chain (`useOneSignal.ts` re-exports from context) | ✅ Correct |
| `navigationRef.isReady()` guard in `handleNotificationOpen` | ✅ Correct |
| Home screen `deepLinkHandledRef` dedup logic | ✅ Correct |
| OneSignal JS version 5.2.14 (Legacy Architecture compatible) | ✅ Fixed |

---

## Issues To Fix

### P0 — Production Blockers (Web Team)

#### 1. `apple-app-site-association` has placeholder Team ID
**File:** `apps/nativeapp/deeplinking/apple-app-site-association:6`
**Owner:** Web team — needs Apple Developer Team ID + server deployment to `/.well-known/`.
Add a `// TODO` comment and leave for web team to fill in.

#### 2. `assetlinks.json` has placeholder SHA256 fingerprint
**File:** `apps/nativeapp/deeplinking/assetlinks.json:8`
**Owner:** Web team — needs release keystore SHA256 + server deployment to `/.well-known/`.
Add a `// TODO` comment and leave for web team to fill in.

---

### P1 — Functional Gap (Cold Start)

#### 3. Notification tap when app is **terminated** is silently dropped
**File:** `apps/nativeapp/app/utils/linking/handleNotificationOpen.ts:69`
```typescript
if (!navigationRef.isReady()) {
  return; // ← deep link is lost here on cold start
}
```
When a user taps a notification with the app fully closed, the app launches and then `click` fires before `NavigationContainer` is mounted and `navigationRef.isReady()` returns true. The deep link is silently discarded.

OneSignal v5 provides `OneSignal.Notifications.getInitialNotification()` for this case.

**Fix:** In `OneSignalContext.tsx`, after `stateManager.initialize()` succeeds, call `getInitialNotification()` and pass the result to `handleNotificationOpen` if present. This must run after navigation is ready.

```typescript
// In OneSignalContext.tsx — inside initializeOneSignal(), after setIsInitialized(true)
import {OneSignal} from 'react-native-onesignal';

const initialNotification = await OneSignal.Notifications.getInitialNotification();
if (initialNotification) {
  // Wait for nav to be ready with a small poll (nav mounts async)
  const tryNavigate = (attempts = 0) => {
    if (navigationRef.isReady()) {
      handleNotificationOpen(initialNotification);
    } else if (attempts < 5) {
      setTimeout(() => tryNavigate(attempts + 1), 200);
    }
  };
  tryNavigate();
}
```

---

## Files To Modify

| File | Change |
|---|---|
| `apps/nativeapp/app/contexts/OneSignalContext.tsx` | Add `getInitialNotification()` handling after init (lines ~120-165) |

**Web team action required (out of scope for this branch):**
- Fill `REPLACE_TEAM_ID` in `deeplinking/apple-app-site-association` and deploy to `/.well-known/`
- Fill `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT` in `deeplinking/assetlinks.json` and deploy to `/.well-known/`

---

## Verification

### Custom URL scheme (works without server deployment)
```bash
# iOS simulator
xcrun simctl openurl booted "firealert://alert/test-alert-id"
xcrun simctl openurl booted "firealert://incident/test-incident-id"

# Android emulator
adb shell am start -W -a android.intent.action.VIEW -d "firealert://alert/test-alert-id" eco.pp.firealert
```
Expected: App opens and navigates Home screen with alertId/incidentId param.

### Universal / App Links (after server deployment)
```bash
# iOS — test with https scheme
xcrun simctl openurl booted "https://firealert.plant-for-the-planet.org/alert/test-id"

# Android — verify domain association
adb shell pm get-app-links eco.pp.firealert
# Should show: firealert.plant-for-the-planet.org: verified
```

### Cold start (notification tap when app terminated)
1. Kill the app completely
2. Send a test OneSignal push with `alertId` in `additionalData`
3. Tap the notification
4. Verify the app opens directly to the alert details (not just the home screen)

### Regression
- Existing navigation flows (login, map, settings) must be unaffected
- Run `yarn test` from `apps/nativeapp`
