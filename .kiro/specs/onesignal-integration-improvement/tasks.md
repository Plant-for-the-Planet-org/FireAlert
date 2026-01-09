# Implementation Plan: OneSignal Integration Improvement

## Overview

This implementation plan breaks down the OneSignal integration improvement into discrete, manageable tasks. Each task builds on previous tasks and includes property-based tests to verify correctness.

## Tasks

- [x] 1. Create OneSignal service foundation

  - Create `apps/nativeapp/app/services/OneSignal/` directory
  - Create TypeScript interfaces and types in `types.ts`
  - Create constants in `apps/nativeapp/app/utils/OneSignal/constants.ts`
  - _Requirements: 1.1, 8.1_

- [x] 1.1 Create OneSignalStateManager

  - Implement `apps/nativeapp/app/services/OneSignal/OneSignalStateManager.ts`
  - Implement device state caching
  - Implement state change event emission
  - Add logging with `[OneSignal]` prefix
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2_

- [ ]\* 1.2 Write property test for device state consistency

  - **Property 1: Device State Consistency**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 1.3 Create OneSignalDeviceSync

  - Implement `apps/nativeapp/app/services/OneSignal/OneSignalDeviceSync.ts`
  - Implement sync logic with retry (max 3 attempts)
  - Implement stale subscription cleanup
  - Add logging with `[DeviceSync]` prefix
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 2.3_

- [ ]\* 1.4 Write property test for sync idempotence

  - **Property 2: Sync Idempotence**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 1.5 Create service index and exports

  - Create `apps/nativeapp/app/services/OneSignal/index.ts`
  - Export OneSignalStateManager and OneSignalDeviceSync
  - _Requirements: 8.1_

- [x] 2. Integrate with useOneSignal hook

  - Update `apps/nativeapp/app/hooks/notification/useOneSignal.ts`
  - Initialize OneSignalStateManager
  - Trigger device sync on state changes
  - Set up notification event listeners
  - Add logging for hook lifecycle
  - _Requirements: 1.1, 3.1, 6.1, 2.1_

- [ ]\* 2.1 Write property test for permission change detection

  - **Property 3: Permission Change Detection**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 3. Update AppNavigator

  - Update `apps/nativeapp/app/routes/AppNavigator.tsx`
  - Ensure useOneSignal hook is called with proper handlers
  - Add logging for app lifecycle events
  - _Requirements: 1.1, 6.1_

- [x] 4. Update Settings screen

  - Update `apps/nativeapp/app/screens/Settings/Settings.tsx`
  - Subscribe to OneSignalStateManager events
  - Refresh device alert method status on state changes
  - Display "this device" indicator for current device
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 2.1_

- [ ]\* 4.1 Write property test for Settings screen sync

  - **Property 5: Settings Screen Sync**
  - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 5. Implement error logging

  - Add error logging with `[Error]` prefix throughout services
  - Log error context and retry attempts
  - Log network errors, permission errors, state errors
  - _Requirements: 2.4, 5.1, 5.2, 5.3_

- [ ]\* 5.1 Write property test for error handling

  - **Property 6: Type Safety & Error Handling**
  - **Validates: Requirements 8.1, 8.2**

- [x] 6. Checkpoint - Verify core functionality

  - Ensure OneSignalStateManager initializes correctly
  - Ensure device sync creates/updates alert methods
  - Ensure Settings screen displays device status
  - Ensure all operations are logged clearly
  - Verify no TypeScript errors

- [ ]\* 7. Implement stale subscription cleanup (optional)

  - Implement cleanup logic in OneSignalDeviceSync
  - Detect and handle device transfers between users
  - Mark old devices as stale
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]\* 7.1 Write property test for stale subscription cleanup

  - **Property 4: Stale Subscription Cleanup**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ]\* 8. Implement logout cleanup (optional)

  - Implement OneSignalStateManager.handleLogout()
  - Unsubscribe from OneSignal on logout
  - Clear device state
  - _Requirements: 1.4, 5.4_

- [ ]\* 9. Implement error recovery strategies (optional)

  - Implement exponential backoff retry logic
  - Implement offline queue for sync operations
  - Implement graceful degradation on permission denial
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Final checkpoint - Verify all requirements

  - Verify all 8 requirements are implemented
  - Verify all logging is in place
  - Verify Settings screen shows device status correctly
  - Verify device sync works on app launch
  - Verify permission changes are detected
  - Test on both iOS and Android

- [x] 11. Fix infinite loop in useOneSignal hook

  - **Root Cause**: The `handlers` object is created inline in AppNavigator on every render, causing the useEffect dependency to change on each render, triggering an infinite loop.
  - **Evidence**: Logs show `[OneSignal] useOneSignal hook initializing` repeating infinitely
  - _Requirements: Bug fix for Tasks 2, 3_

- [x] 11.1 Add diagnostic logging to identify dependency changes

  - Add logs to track which dependency is changing
  - Log when useEffect runs and why
  - This will confirm the root cause before fixing
  - _Requirements: Debugging_

- [x] 11.2 Fix handlers reference stability in AppNavigator

  - Wrap handlers object in useMemo in AppNavigator.tsx
  - Ensure handlers object has stable reference across renders
  - _Requirements: Bug fix_

- [x] 11.3 Make useOneSignal hook more resilient to handler changes

  - Use useRef to store handlers and avoid re-running initialization
  - Only re-run initialization when appId or userId changes
  - Handlers should be updated via ref without triggering re-initialization
  - _Requirements: Bug fix_

- [x] 11.4 Prevent state change events from triggering re-initialization

  - Ensure setDeviceState doesn't cause parent re-render that recreates handlers
  - Consider using useRef for internal state that doesn't need to trigger re-renders
  - _Requirements: Bug fix_

- [x] 11.5 Verify fix and remove diagnostic logging
  - Confirm infinite loop is fixed
  - Remove temporary diagnostic logs
  - Verify normal operation
  - _Requirements: Verification_

## Notes

- Tasks marked with `*` are optional and can be skipped for MVP
- Core functionality (tasks 1-6) should be completed first
- All logging uses prefixes: `[OneSignal]`, `[DeviceSync]`, `[Error]`
- Retry logic: max 3 attempts with 1s, 2s, 4s delays
- All changes confined to `apps/nativeapp`
- Only `trpc.alertMethod` queries/mutations can be modified
