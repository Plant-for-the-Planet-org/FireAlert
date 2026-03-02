# OneSignal Device & AlertMethod Sync Documentation

## 1. Overview

The OneSignal implementation in FireAlert is designed to keep the native device's push notification state perfectly synchronized with the backend's `AlertMethod` records. It ensures that regardless of whether a user reinstalls the app, changes devices, or toggles permissions, the system correctly routes notifications to the active device.

## 2. Supported Scenarios

| Scenario              | Detection Logic                                                                | Action                                                   |
| :-------------------- | :----------------------------------------------------------------------------- | :------------------------------------------------------- |
| **Fresh Install**     | No `AlertMethod` found for the current `deviceId`.                             | `createAlertMethod`                                      |
| **Reinstall**         | `AlertMethod` exists for `deviceId` but `destination` (OneSignal ID) differs.  | `deleteAlertMethod` (old) then `createAlertMethod` (new) |
| **Permission Change** | `deviceId` and `destination` match, but `isEnabled` differs from `permission`. | `updateAlertMethod`                                      |
| **Multiple Devices**  | Each device has a unique `deviceId`.                                           | Independent `AlertMethod` per device.                    |

---

## 3. Architecture & File Responsibilities

The implementation follows a **Clean Architecture** approach, separating SDK management, business logic, and API orchestration.

### A. State & Provider Layer

- **`OneSignalContext.tsx`**: The React entry point. It provides the OneSignal state to the entire app and orchestrates the "Sync" triggers based on state changes.
- **`OneSignalStateManager.ts`**: A singleton class that wraps the OneSignal SDK. It manages the low-level lifecycle (init, login, permission checks) and emits events to the context.

### B. Logic & Orchestration Layer

- **`deviceSyncLogic.ts`**: Pure functional logic. It takes current state as input and returns a `SyncAction` (`create`, `update`, `deleteThenCreate`, or `no_change`). It contains zero side effects, making it highly testable.
- **`useDeviceAlertMethodSync.ts`**: The "Orchestrator" hook. It fetches device info, calls the sync logic, and executes the necessary tRPC mutations in the correct order.

### C. API & Communication Layer

- **`api/alertMethod.ts`**: A dedicated layer for tRPC mutations and queries, ensuring type safety and consistent retry logic.
- **`OneSignalStateManager.ts` (Internal)**: Uses a `safeOneSignalCall` wrapper to prevent SDK calls before initialization is ready.

---

## 4. Detailed Flows

### Initialization Flow

1. **AppNavigator** renders `OneSignalProvider`.
2. **Provider** calls `StateManager.initialize()`.
3. **StateManager** initializes SDK, logs in the user, and fetches initial state.
4. **StateManager** registers a **Subscription Change Listener** (Option A).
5. **Provider** fills the React Context with the device state.

### Sync Flow (Orchestration)

1. Triggered by: Initialization, Permission changes, or Subscription ID assignment.
2. **`useDeviceAlertMethodSync`** fetches the device's unique ID and name.
3. **tRPC** refetches the user's existing `AlertMethods`.
4. **`deviceSyncLogic`** compares the device state vs. database state.
5. **Mutation Execution**:
   - If a mismatch is found (reinstall), it deletes the stale record before creating a new one.
   - If permissions changed, it sends an update request.
   - **Infinite Loop Prevention**: Uses a `syncInProgressRef` to ensure only one sync process runs at a time.

---

## 5. Technical Gotchas & Critical Fixes

### tRPC Payload Wrapping

The mobile tRPC client in this project requires all payloads to be wrapped in a `json` object.
_Example:_ `createAlertMethod.mutate({ json: { ...payload } })`. Failure to do this results in a "Required" Zod error on the server.

### Subscription ID Assignment

On a fresh install, OneSignal does not provide a `subscriptionId` (destination) immediately.

- **Solution**: We implemented a listener in the `StateManager` that detects the moment OneSignal assigns an ID and triggers a `subscription_changed` event.
- **Fallback**: A commented retry mechanism is provided in the code if event-driven updates fail in specific environments.

### The "Initializing" Guard

The SDK is callable as soon as `OneSignal.initialize()` runs, but our manager might still be fetching state. The `safeOneSignalCall` was updated to allow calls during the `INITIALIZING` phase, preventing null property assignment during the first sync.

---

## 6. Testing the Flow

To verify the implementation, look for these log prefixes in the console:

- `[ONESIGNAL]`: SDK/State changes.
- `[DEVICE_SYNC]`: Orchestration steps.
- `[DEVICE_SYNC_LOGIC]`: Decision-making logic.
- `[ALERT_METHOD_API]`: Network requests.
