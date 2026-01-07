# OneSignal Integration Improvement - Requirements

## Introduction

The FireAlert mobile app uses OneSignal for push notifications. Currently, the integration has several issues:

- Inconsistent device state synchronization between OneSignal and the backend
- Lack of proper error handling and logging for debugging
- Race conditions when users log in/out or switch devices
- No mechanism to detect and clean up stale device subscriptions
- Unpredictable behavior when device permissions change

This spec aims to make the OneSignal integration more robust, predictable, and maintainable by implementing proper state management, comprehensive logging, and synchronization mechanisms.

## Glossary

- **Device Subscription**: A OneSignal push subscription tied to a specific device (identified by OneSignal's userId/playerId)
- **Alert Method**: A backend database record representing a notification channel (device, email, SMS, webhook)
- **Device State**: The current state of OneSignal on the device (userId, pushToken, permissions, optedIn status)
- **Sync**: The process of ensuring device subscriptions in OneSignal match alert methods in the backend database
- **Stale Subscription**: A device subscription that exists in OneSignal but has no corresponding alert method in the backend

## Requirements

### Requirement 1: Robust Device State Management

**User Story:** As a developer, I want the app to reliably track and manage OneSignal device state, so that I can debug synchronization issues and ensure consistent behavior.

#### Acceptance Criteria

1. WHEN the app initializes OneSignal, THE OneSignalStateManager SHALL retrieve and cache the current device state (userId, pushToken, permissions, optedIn status)
2. WHEN device permissions change, THE OneSignalStateManager SHALL detect the change and update the cached state
3. WHEN the user logs in, THE OneSignalStateManager SHALL reset and reinitialize the device state
4. WHEN the user logs out, THE OneSignalStateManager SHALL clear the cached device state and unsubscribe from OneSignal
5. WHEN device state changes occur, THE OneSignalStateManager SHALL emit state change events for subscribers to react to

### Requirement 2: Comprehensive Logging for Development

**User Story:** As a developer, I want detailed logs of all OneSignal operations, so that I can troubleshoot synchronization issues and understand the flow of device state changes.

#### Acceptance Criteria

1. WHEN OneSignal operations occur (initialize, login, permission requests, state changes), THE system SHALL log the operation with timestamp, operation name, and relevant data
2. WHEN device state is retrieved, THE system SHALL log the complete device state including userId, pushToken, permissions, and optedIn status
3. WHEN sync operations occur, THE system SHALL log the sync attempt, comparison results, and any actions taken
4. WHEN errors occur during OneSignal operations, THE system SHALL log the error with stack trace and context information
5. WHEN the app is in development mode, THE system SHALL use console logging with clear formatting for easy reading

### Requirement 3: Automatic Device Subscription Synchronization

**User Story:** As a user, I want the app to automatically keep my device subscription in sync with the backend, so that I receive notifications reliably without manual intervention.

#### Acceptance Criteria

1. WHEN the app initializes and the user is logged in, THE system SHALL check if a device alert method exists in the backend for the current device
2. WHEN a device alert method does not exist in the backend, THE system SHALL create one using the current device state (userId, deviceName, deviceId)
3. WHEN a device alert method exists but the device state has changed (e.g., new userId), THE system SHALL update the backend record with the new state
4. WHEN the user grants push notification permissions, THE system SHALL automatically create or update the device alert method
5. WHEN the user revokes push notification permissions, THE system SHALL disable the device alert method in the backend (soft delete or mark as disabled)

### Requirement 4: Stale Subscription Cleanup

**User Story:** As a system, I want to detect and clean up stale device subscriptions, so that the backend database remains consistent and doesn't accumulate orphaned records.

#### Acceptance Criteria

1. WHEN a user logs in on a new device, THE system SHALL check for existing device alert methods from previous devices
2. WHEN a device alert method is found for a different device (different deviceId), THE system SHALL mark it as stale or delete it
3. WHEN the same device is used by multiple users (user logs out and another user logs in), THE system SHALL transfer the device alert method to the new user
4. WHEN a device alert method has not been updated for 30 days, THE system SHALL mark it as potentially stale (for backend cleanup)

### Requirement 5: Graceful Error Handling and Recovery

**User Story:** As a user, I want the app to handle OneSignal errors gracefully, so that temporary issues don't break the notification system.

#### Acceptance Criteria

1. IF OneSignal initialization fails, THE system SHALL retry with exponential backoff (1s, 2s, 4s, 8s max)
2. IF device state retrieval fails, THE system SHALL log the error and retry on the next app lifecycle event
3. IF creating a device alert method fails, THE system SHALL retry the operation and notify the user if it persists
4. IF the backend is unreachable, THE system SHALL queue the sync operation and retry when connectivity is restored
5. IF OneSignal permissions are denied, THE system SHALL gracefully disable device notifications and inform the user

### Requirement 6: Device Permission Change Detection

**User Story:** As a user, I want the app to detect when I change notification permissions, so that the backend stays in sync with my actual notification settings.

#### Acceptance Criteria

1. WHEN the app comes to foreground, THE system SHALL check if notification permissions have changed since the last check
2. WHEN notification permissions are granted, THE system SHALL create or enable the device alert method
3. WHEN notification permissions are revoked, THE system SHALL disable the device alert method
4. WHEN notification permissions change, THE system SHALL emit an event that the Settings screen can listen to for UI updates
5. WHEN the user manually changes permissions in system settings, THE system SHALL detect this on app foreground and sync accordingly

### Requirement 7: Settings Screen Integration

**User Story:** As a user, I want the Settings screen to accurately reflect my current device notification status, so that I can see what's enabled and make changes if needed.

#### Acceptance Criteria

1. WHEN the Settings screen loads, THE system SHALL display the current device alert method status (enabled/disabled, verified/unverified)
2. WHEN the device alert method is toggled in the Settings screen, THE system SHALL update the backend and reflect the change immediately
3. WHEN the device alert method is deleted in the Settings screen, THE system SHALL remove it from the backend
4. WHEN the user returns to the Settings screen after changing system permissions, THE system SHALL refresh the device alert method status
5. WHEN multiple devices are registered, THE system SHALL clearly indicate which device is "this device" and show all registered devices

### Requirement 8: Type Safety and Error Boundaries

**User Story:** As a developer, I want the OneSignal integration to have proper TypeScript types and error boundaries, so that I can catch issues at compile time and handle runtime errors gracefully.

#### Acceptance Criteria

1. THE OneSignalStateManager SHALL have proper TypeScript interfaces for all device state properties
2. THE system SHALL validate all OneSignal API responses before using them
3. THE system SHALL use try-catch blocks around all OneSignal operations
4. THE system SHALL have a custom error type for OneSignal-specific errors
5. THE system SHALL provide clear error messages that distinguish between network errors, permission errors, and state errors

## Implementation Notes

- All changes must be confined to `apps/nativeapp`
- Only OneSignal-related changes are allowed
- Only `trpc.alertMethod` queries and mutations can be modified
- The backend `apps/server` should not be modified
- Development logging should use `console.log` with clear prefixes like `[OneSignal]` or `[DeviceSync]`
- All async operations should handle errors gracefully
- The implementation should follow React hooks best practices
