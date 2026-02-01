# Implementation Plan: OneSignal Initialization Fix

## Overview

This implementation plan fixes the critical OneSignal initialization issue causing app crashes. The tasks are ordered to ensure safe, incremental fixes with proper testing at each step.

## Tasks

- [x] 1. Add initialization state management

  - Add `InitializationState` enum to `OneSignalStateManager.ts`
  - Add `InitializationStatus` interface and tracking
  - Add `isInitialized()`, `isInitializing()`, and `getInitializationStatus()` methods
  - Update constructor to initialize state tracking
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Add safe SDK method wrapper

  - Implement `safeOneSignalCall()` method in `OneSignalStateManager.ts`
  - Add proper error handling and logging
  - Ensure all SDK calls are wrapped for safety
  - _Requirements: 1.1, 3.1, 3.2, 5.1, 5.5_

- [x] 3. Fix initialization state tracking

  - Update `_performInitialization()` to properly track state transitions
  - Set `INITIALIZING` state at start
  - Set `READY` state on success
  - Set `FAILED` state on error with context
  - Add initialization timing logs
  - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3_

- [x] 4. Add guards to checkPermissions method

  - Add initialization state check at start of `checkPermissions()`
  - Skip permission checks if OneSignal not ready
  - Log warning when skipping checks
  - Wrap permission API calls in try-catch
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.4_

- [x] 5. Update updateDeviceState method

  - Add initialization guards to `updateDeviceState()`
  - Use `safeOneSignalCall()` wrapper for all SDK calls
  - Handle errors gracefully without throwing
  - _Requirements: 1.1, 3.1, 3.2_

- [x] 6. Fix useOneSignal hook permission checking

  - Update permission checking interval in `useOneSignal.ts`
  - Only start interval after OneSignal is initialized
  - Add initialization state check in interval callback
  - _Requirements: 1.5, 4.1, 4.5_

- [x] 7. Add comprehensive error handling

  - Ensure all OneSignal SDK calls have try-catch blocks
  - Log errors with full context and stack traces
  - Prevent any OneSignal errors from crashing the app
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Enhance logging throughout

  - Add detailed initialization logging with timestamps
  - Log all state transitions with context
  - Add structured error logging with context
  - Log permission check skips with reasons
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]\* 9. Test initialization scenarios

  - Test app startup with valid OneSignal config
  - Test app startup with invalid OneSignal config
  - Test network failure during initialization
  - Test rapid permission checks during initialization
  - Verify no crashes occur in any scenario
  - _Requirements: 3.1, 3.3, 4.1, 4.2_

- [ ]\* 10. Test permission checking scenarios

  - Test permission checks before initialization
  - Test permission checks during initialization
  - Test permission checks after successful initialization
  - Test permission checks after failed initialization
  - Verify proper logging in all scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.4_

- [ ]\* 11. Test user lifecycle scenarios

  - Test user login triggering OneSignal initialization
  - Test user logout and re-login scenarios
  - Test app backgrounding and foregrounding
  - Test multiple initialization attempts
  - _Requirements: 4.3, 4.4, 6.1, 6.2, 6.3_

- [ ]\* 12. Verify backward compatibility

  - Ensure Settings screen still works correctly
  - Ensure device sync still works after initialization
  - Ensure notification handlers still work
  - Ensure no breaking changes to existing functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]\* 13. Production testing preparation

  - Add production-safe logging (no sensitive data)
  - Ensure graceful degradation when OneSignal unavailable
  - Test with various network conditions
  - Test with permission denied scenarios
  - _Requirements: 3.3, 3.4, 3.5, 5.1_

- [ ]\* 14. Final verification and cleanup

  - Verify no "Must call 'initWithContext' before use" errors
  - Verify app starts successfully in all scenarios
  - Verify OneSignal features work when properly initialized
  - Remove any temporary debugging code
  - _Requirements: All requirements verified_

## Critical Success Criteria

1. **No Crashes**: App must not crash with OneSignal initialization errors
2. **Proper Guards**: All OneSignal SDK calls must be guarded by initialization checks
3. **Graceful Degradation**: App must work even if OneSignal fails to initialize
4. **Clear Logging**: Developers must be able to debug issues from logs
5. **Backward Compatibility**: Existing functionality must continue to work

## Testing Checklist

### Initialization Testing

- [ ] App starts successfully with valid OneSignal config
- [ ] App starts successfully with invalid OneSignal config
- [ ] App handles network failures during initialization
- [ ] App handles OneSignal SDK errors gracefully

### Permission Testing

- [ ] Permission checks are skipped before initialization
- [ ] Permission checks work after successful initialization
- [ ] Permission checks handle errors gracefully
- [ ] Permission changes are detected correctly

### Lifecycle Testing

- [ ] User login triggers proper OneSignal initialization
- [ ] User logout clears OneSignal state properly
- [ ] App backgrounding/foregrounding works correctly
- [ ] Multiple initialization attempts are handled safely

### Error Handling Testing

- [ ] OneSignal initialization failures don't crash app
- [ ] OneSignal SDK method failures don't crash app
- [ ] Network errors are handled gracefully
- [ ] Permission denied scenarios work correctly

### Logging Testing

- [ ] Initialization process is logged clearly
- [ ] State transitions are logged with context
- [ ] Errors are logged with full context
- [ ] Permission check skips are logged with reasons

## Notes

- All changes confined to `apps/nativeapp/app/services/OneSignal/` and `apps/nativeapp/app/hooks/notification/`
- No changes to public APIs or interfaces
- Must maintain compatibility with existing Settings screen integration
- Focus on safety and error prevention over new features
- Comprehensive logging for production debugging
