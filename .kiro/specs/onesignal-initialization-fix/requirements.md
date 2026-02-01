# OneSignal Initialization Fix - Requirements

## Introduction

The FireAlert mobile app is experiencing critical crashes due to OneSignal SDK methods being called before proper initialization. The error "Could not invoke OneSignal.hasNotificationPermission - Must call 'initWithContext' before use" indicates that OneSignal methods are being invoked before the SDK is ready.

## Root Cause Analysis

Based on the error and code review:

1. **Permission Check Before Initialization**: The `checkPermissions()` method in `OneSignalStateManager` is being called before OneSignal SDK is initialized
2. **Async Initialization Race Condition**: The permission checking interval (every 5 seconds) starts immediately, but initialization is async
3. **Missing Initialization Guards**: OneSignal API calls lack proper initialization state checks

## Glossary

- **SDK Initialization**: The process of calling `OneSignal.initialize(appId)` and waiting for the SDK to be ready
- **Permission Check**: Calling `OneSignal.Notifications.getPermissionAsync()` to check notification permissions
- **Initialization Guard**: A check to ensure OneSignal is initialized before calling SDK methods
- **Race Condition**: When async operations complete in unpredictable order, causing errors

## Requirements

### Requirement 1: Safe Permission Checking

**User Story:** As a developer, I want permission checks to only occur after OneSignal is properly initialized, so that the app doesn't crash with "Must call 'initWithContext' before use" errors.

#### Acceptance Criteria

1. WHEN `checkPermissions()` is called, THE system SHALL verify OneSignal is initialized before calling any SDK methods
2. WHEN OneSignal is not initialized, THE system SHALL skip permission checks and log a warning
3. WHEN OneSignal initialization is in progress, THE system SHALL wait for initialization to complete before checking permissions
4. WHEN permission checks fail due to SDK not being ready, THE system SHALL log the error and continue gracefully
5. WHEN the app starts, THE system SHALL not start permission checking intervals until after OneSignal initialization

### Requirement 2: Initialization State Management

**User Story:** As a developer, I want clear tracking of OneSignal initialization state, so that I can prevent SDK method calls before the SDK is ready.

#### Acceptance Criteria

1. WHEN OneSignal initialization starts, THE system SHALL set an internal flag indicating initialization is in progress
2. WHEN OneSignal initialization completes successfully, THE system SHALL set a flag indicating the SDK is ready for use
3. WHEN OneSignal initialization fails, THE system SHALL set a flag indicating the SDK is not available
4. WHEN any OneSignal SDK method is called, THE system SHALL check the initialization state first
5. WHEN the initialization state is checked, THE system SHALL return accurate status (not_started, initializing, ready, failed)

### Requirement 3: Graceful Error Handling

**User Story:** As a user, I want the app to handle OneSignal initialization errors gracefully, so that the app doesn't crash when push notifications are unavailable.

#### Acceptance Criteria

1. WHEN OneSignal initialization fails, THE system SHALL log the error with context and continue app operation
2. WHEN OneSignal SDK methods fail due to initialization issues, THE system SHALL catch errors and log them without crashing
3. WHEN OneSignal is unavailable, THE system SHALL disable push notification features gracefully
4. WHEN network issues prevent OneSignal initialization, THE system SHALL retry with exponential backoff
5. WHEN OneSignal permissions are denied, THE system SHALL handle this gracefully without affecting other app features

### Requirement 4: Initialization Timing

**User Story:** As a developer, I want OneSignal to initialize at the right time in the app lifecycle, so that it's ready when needed but doesn't block app startup.

#### Acceptance Criteria

1. WHEN the app starts and user is logged in, THE system SHALL initialize OneSignal before starting any permission checks
2. WHEN OneSignal initialization is triggered, THE system SHALL complete initialization before allowing SDK method calls
3. WHEN multiple components try to initialize OneSignal, THE system SHALL ensure only one initialization occurs
4. WHEN the user logs out and logs back in, THE system SHALL re-initialize OneSignal properly
5. WHEN the app comes to foreground, THE system SHALL only check permissions if OneSignal is already initialized

### Requirement 5: Comprehensive Logging

**User Story:** As a developer, I want detailed logs of OneSignal initialization and permission checking, so that I can debug issues in production.

#### Acceptance Criteria

1. WHEN OneSignal initialization starts, THE system SHALL log the attempt with timestamp and app state
2. WHEN OneSignal initialization completes, THE system SHALL log success with initialization duration
3. WHEN OneSignal initialization fails, THE system SHALL log the error with full context and stack trace
4. WHEN permission checks are skipped due to initialization state, THE system SHALL log the reason
5. WHEN OneSignal SDK methods are called, THE system SHALL log the method name and initialization state

### Requirement 6: Backward Compatibility

**User Story:** As a developer, I want the fix to maintain existing functionality, so that working features continue to work after the fix.

#### Acceptance Criteria

1. WHEN OneSignal is properly initialized, THE system SHALL maintain all existing notification functionality
2. WHEN device sync occurs, THE system SHALL continue to work as before once initialization is complete
3. WHEN Settings screen loads, THE system SHALL display device status correctly after initialization
4. WHEN notification handlers are set up, THE system SHALL continue to receive and handle notifications
5. WHEN the app is already working correctly, THE system SHALL not introduce new issues

## Implementation Constraints

- All changes must be confined to `apps/nativeapp/app/services/OneSignal/`
- No changes to the public API of `OneSignalStateManager`
- Must maintain compatibility with existing `useOneSignal` hook usage
- Cannot modify OneSignal SDK initialization parameters
- Must not introduce breaking changes to Settings screen integration

## Success Criteria

1. **No Crashes**: App no longer crashes with "Must call 'initWithContext' before use" error
2. **Proper Initialization**: OneSignal initializes correctly and all features work
3. **Graceful Degradation**: App continues to work even if OneSignal fails to initialize
4. **Clear Logging**: Developers can easily debug OneSignal issues from logs
5. **Production Stability**: App runs stably in production without OneSignal-related crashes

## Testing Requirements

- Test app startup with and without network connectivity
- Test user login/logout scenarios
- Test permission changes while app is running
- Test app backgrounding and foregrounding
- Test OneSignal initialization failures
- Test rapid permission checking scenarios
