# Push Notification Device & AlertMethod Sync

## 1. Overview

FireAlert sends device push notifications through **Firebase Cloud Messaging (FCM)**. Older app versions still use **OneSignal** until users update.

Each device is stored as an `AlertMethod` with `method: 'device'`. The app keeps this row in sync with the device's push state, so alerts reach the right device after a reinstall, a token change, a permission change, or an account switch.

The `pushProvider` column tells the server how to send:

| `pushProvider` | `destination` holds              | Sent through |
| :------------- | :------------------------------- | :----------- |
| `FCM`          | FCM registration token           | Firebase     |
| `ONESIGNAL`    | OneSignal subscription (player) ID | OneSignal  |
| `NULL`         | Legacy OneSignal ID (rows created before FCM) | OneSignal |

## 2. Supported Scenarios

| Scenario                     | Detection (in the app)                                                    | Result                                                                                   |
| :--------------------------- | :------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------- |
| **Fresh install**            | No `AlertMethod` for this `deviceId`.                                     | `createAlertMethod`                                                                      |
| **Upgrade from OneSignal**   | A row for this `deviceId` holds the old OneSignal ID.                     | `createAlertMethod` (FCM). The server then soft-deletes the OneSignal row.               |
| **Reinstall / token change** | A row for this `deviceId` holds an old FCM token.                         | `createAlertMethod` (new token). The server then soft-deletes the old row.               |
| **Permission change**        | The row for the current token exists, `isEnabled` differs from permission. | `updateAlertMethod`                                                                      |
| **Account switch**           | Another user's row has the same token or `deviceId`.                      | Server soft-deletes the other user's row after creating or restoring this user's row.   |
| **Multiple devices**         | Each device has its own `deviceId`.                                        | One `AlertMethod` per device.                                                            |

The app **never deletes first**. It creates the new row, and the server inactivates the replaced rows only after that succeeds. If the create fails (for example, FCM verification fails), the old row stays active and keeps sending.

`deviceId` comes from `react-native-device-info` `getUniqueId()`: `ANDROID_ID` on Android, `identifierForVendor` on iOS. Two phones of the same model never share it.

## 3. Architecture & File Responsibilities

### A. App: State & Provider Layer

- **`contexts/PushNotificationContext.tsx`**: React entry point. Provides push state to the app, starts the sync, and handles notification taps and foreground banners.
- **`services/PushNotification/PushNotificationStateManager.ts`**: Singleton that wraps FCM and Notifee. Asks for permission (Notifee), gets the FCM token, listens for token refresh, re-checks permission when the app becomes active, and creates the Android channel `firealert-alerts`.
- **`index.js`**: Registers the FCM background message handler and the Notifee background event handler.

### B. App: Logic & Orchestration Layer

- **`services/PushNotification/deviceSyncLogic.ts`**: Pure logic. Takes the current state and returns a `SyncAction`: `create`, `update` or `no_change`. No side effects.
- **`hooks/notification/useDeviceAlertMethodSync.ts`**: Orchestrator. Gets device info, refetches alert methods, calls the sync logic and runs the tRPC mutation. New rows are sent with `pushProvider: 'FCM'`.

### C. App: API Layer

- **`api/alertMethod.ts`**: tRPC queries and mutations (`useAlertMethodQueries`).

### D. Server

- **`server/api/routers/alertMethod.ts`** (`createAlertMethod`): Verifies the device (FCM dry-run send, or OneSignal player lookup), creates or restores the row, then calls `retireReplacedDeviceRows`.
- **`utils/routers/alertMethod.ts`** (`retireReplacedDeviceRows`): Soft-deletes (`deletedAt`) rows the new row replaces. It never hard-deletes and logs each change.
- **`Services/Notifier/Notifier/DeviceNotifier.ts`**: Sends each notification through FCM or OneSignal, based on the row's `pushProvider`.
- **`server/firebaseAdmin.ts`**: Lazy `firebase-admin` setup from `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.

## 4. Detailed Flows

### Initialization Flow

1. **AppNavigator** renders `PushNotificationProvider`.
2. The provider registers tap and foreground listeners on mount, so cold-start taps are not lost.
3. When the user is logged in, the provider calls `StateManager.initialize()`.
4. **StateManager** creates the Android channel, asks for permission if needed, registers for remote messages on iOS, and gets the FCM token.
5. **StateManager** listens for token refresh and app state changes, then the provider stores the state in context.

### Sync Flow

1. Triggered by: initialization, permission change, or token change.
2. **`useDeviceAlertMethodSync`** gets the device `deviceId` and `deviceName`.
3. **tRPC** refetches the user's alert methods.
4. **`deviceSyncLogic`** decides:
   - No row for the current token, or any stale row for this device → `create`.
   - Otherwise → `update` (sets `isEnabled` from the permission).
5. On `create`, the server creates (or finds, or restores) the row, then soft-deletes replaced rows.
6. **Loop guard**: `syncInProgressRef` makes sure only one sync runs at a time.

### Sending Flow

1. `notification-creator` queues notifications only for rows that are verified, enabled and not soft-deleted.
2. `notification-sender` checks the row is still enabled and not soft-deleted, then calls `DeviceNotifier`.
3. `DeviceNotifier` picks FCM or OneSignal by `pushProvider`.
4. Only invalid-token FCM errors (`registration-token-not-registered`, `invalid-registration-token`, `mismatched-credential`) raise `failCount`. Temporary errors do not.

## 5. Data Retention & Audit

- Replaced rows are **soft-deleted** (`deletedAt` set). They get no new notifications.
- The `db-cleanup` cron hard-deletes soft-deleted rows after 7 days, **except** device rows with `pushProvider` `ONESIGNAL` or `NULL`. Those are kept forever as an audit trail of the FCM migration.
- Each replaced row is logged:

  ```
  stage=PushMigration event=device_row_inactivated reason=onesignal_to_fcm|token_changed|account_switch ...
  ```

  The line includes the old and new alert method IDs, users, providers and the first 12 characters of the old destination.

## 6. Technical Gotchas

### tRPC Payload Wrapping

The mobile tRPC client needs every payload wrapped in a `json` object, for example `createAlertMethod.mutate({ json: { ...payload } })`. Without it, the server returns a "Required" Zod error. Responses are wrapped the same way (`body.json.data`).

### FCM Data Payload

FCM `data` values must be strings. The server turns objects and dates into strings (`toFcmData`).

### Foreground Notifications

FCM does not show a notification while the app is open. The app shows it with Notifee. Messages without a `notification` part (for example, OneSignal data-only payloads) are skipped, so no blank banner appears.

### iOS Lifecycle

iOS 27 requires the UIScene lifecycle. React Native starts from `SceneDelegate` in `AppDelegate.swift`, which also forwards deep links and universal links to `RCTLinkingManager`.

## 7. Release Order

1. Deploy the server and run the Prisma migration (adds the nullable `pushProvider` column).
2. Set the `FIREBASE_*` env vars on the server.
3. Publish the app. Each device moves to FCM the next time the user opens the updated app.
