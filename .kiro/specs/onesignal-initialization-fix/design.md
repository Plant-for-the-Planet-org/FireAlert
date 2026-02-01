# OneSignal Initialization Fix - Design

## Overview

This design fixes the critical OneSignal initialization issue that causes app crashes with "Must call 'initWithContext' before use" errors. The solution adds proper initialization state management and guards to prevent SDK method calls before OneSignal is ready.

## Root Cause Analysis

The current implementation has several issues:

1. **Race Condition**: `checkPermissions()` is called every 5 seconds starting immediately, but OneSignal initialization is async
2. **Missing Guards**: No checks to ensure OneSignal is initialized before calling SDK methods
3. **Unsafe Permission Checks**: `OneSignal.Notifications.getPermissionAsync()` called without initialization verification

## Solution Architecture

```mermaid
graph TB
    subgraph "OneSignal Initialization Flow"
        START[App Start] --> CHECK{User Logged In?}
        CHECK -->|Yes| INIT[Initialize OneSignal]
        CHECK -->|No| WAIT[Wait for Login]
        WAIT --> INIT

        INIT --> INIT_SDK[OneSignal.initialize(appId)]
        INIT_SDK --> SET_STATE[Set isInitializing = true]
        SET_STATE --> REQUEST_PERM[Request Permissions]
        REQUEST_PERM --> LOGIN_USER[OneSignal.login(userId)]
        LOGIN_USER --> UPDATE_STATE[Update Device State]
        UPDATE_STATE --> MARK_READY[Set isInitialized = true]
        MARK_READY --> START_CHECKS[Start Permission Checks]
    end

    subgraph "Permission Check Flow"
        PERM_CHECK[Permission Check Triggered] --> IS_INIT{OneSignal Initialized?}
        IS_INIT -->|No| SKIP[Skip Check & Log Warning]
        IS_INIT -->|Yes| GET_PERM[Get Permission Status]
        GET_PERM --> UPDATE_PERM[Update Permission State]
        SKIP --> END_CHECK[End Check]
        UPDATE_PERM --> END_CHECK
    end

    subgraph "Error Handling"
        ERROR[OneSignal Error] --> LOG_ERROR[Log Error with Context]
        LOG_ERROR --> GRACEFUL[Continue App Operation]
    end
```

## Implementation Changes

### 1. Enhanced Initialization State Management

Add comprehensive state tracking to `OneSignalStateManager`:

```typescript
enum InitializationState {
  NOT_STARTED = "not_started",
  INITIALIZING = "initializing",
  READY = "ready",
  FAILED = "failed",
}

interface InitializationStatus {
  state: InitializationState;
  error?: Error;
  startTime?: number;
  completionTime?: number;
}
```

### 2. Safe Permission Checking

Update `checkPermissions()` method with proper guards:

```typescript
async checkPermissions(): Promise<void> {
  // Guard: Only check if OneSignal is ready
  if (this.initializationStatus.state !== InitializationState.READY) {
    console.log(
      `${ONESIGNAL_LOG_PREFIXES.PERMISSION} Skipping permission check - OneSignal not ready (${this.initializationStatus.state})`
    );
    return;
  }

  try {
    const previousPermission = this.state.permission;
    const permission = await OneSignal.Notifications.getPermissionAsync();

    if (permission !== previousPermission) {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.PERMISSION} Permission changed: ${previousPermission} -> ${permission}`
      );
      this.setState({permission});
    }
  } catch (error) {
    console.error(
      `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to check permissions:`,
      error
    );
    // Don't throw - continue gracefully
  }
}
```

### 3. Initialization State Tracking

Add methods to track and query initialization state:

```typescript
class OneSignalStateManager {
  private initializationStatus: InitializationStatus = {
    state: InitializationState.NOT_STARTED,
  };

  isInitialized(): boolean {
    return this.initializationStatus.state === InitializationState.READY;
  }

  isInitializing(): boolean {
    return this.initializationStatus.state === InitializationState.INITIALIZING;
  }

  getInitializationStatus(): InitializationStatus {
    return { ...this.initializationStatus };
  }
}
```

### 4. Safe SDK Method Wrapper

Create a wrapper for all OneSignal SDK calls:

```typescript
private async safeOneSignalCall<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T | null> {
  if (!this.isInitialized()) {
    console.warn(
      `${ONESIGNAL_LOG_PREFIXES.ERROR} Attempted to call ${operationName} before OneSignal initialization`
    );
    return null;
  }

  try {
    return await operation();
  } catch (error) {
    console.error(
      `${ONESIGNAL_LOG_PREFIXES.ERROR} ${operationName} failed:`,
      error
    );
    return null;
  }
}
```

### 5. Updated useOneSignal Hook

Modify the permission checking interval to wait for initialization:

```typescript
// Check permissions on app foreground - only if initialized
useEffect(() => {
  const checkPermissions = async () => {
    if (stateManager.isInitialized()) {
      try {
        await stateManager.checkPermissions();
      } catch (err) {
        console.error(
          `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to check permissions:`,
          err
        );
      }
    }
  };

  const interval = setInterval(checkPermissions, 5000);
  return () => clearInterval(interval);
}, [stateManager]);
```

## Error Handling Strategy

### 1. Initialization Errors

```typescript
private async _performInitialization(appId: string, userId: string): Promise<void> {
  try {
    this.initializationStatus = {
      state: InitializationState.INITIALIZING,
      startTime: Date.now()
    };

    // ... initialization steps ...

    this.initializationStatus = {
      state: InitializationState.READY,
      startTime: this.initializationStatus.startTime,
      completionTime: Date.now()
    };
  } catch (error) {
    this.initializationStatus = {
      state: InitializationState.FAILED,
      error: error as Error,
      startTime: this.initializationStatus.startTime,
      completionTime: Date.now()
    };

    console.error(
      `${ONESIGNAL_LOG_PREFIXES.ERROR} OneSignal initialization failed:`,
      error
    );

    // Don't throw - allow app to continue
  }
}
```

### 2. SDK Method Call Errors

All OneSignal SDK method calls will be wrapped with try-catch blocks and proper logging. Errors will not crash the app but will be logged for debugging.

### 3. Graceful Degradation

When OneSignal fails to initialize:

- Push notifications will be disabled
- Settings screen will show "Push notifications unavailable"
- App continues to function normally
- Other notification methods (SMS, email) continue to work

## Logging Strategy

### Initialization Logging

```
[OneSignal] Initialization starting - appId: xxx, userId: yyy
[OneSignal] SDK initialized successfully
[OneSignal] Permission requested
[OneSignal] User logged in: yyy
[OneSignal] Device state updated
[OneSignal] Initialization completed in 1234ms
```

### Permission Check Logging

```
[Permission] Skipping permission check - OneSignal not ready (initializing)
[Permission] Permission check completed: true
[Permission] Permission changed: false -> true
```

### Error Logging

```
[Error] OneSignal initialization failed: Network timeout
  Context: { appId: xxx, userId: yyy, duration: 5000ms }
[Error] Permission check failed: Must call 'initWithContext' before use
  Context: { initState: not_started, lastInit: never }
```

## File Changes

### Modified Files

1. **`OneSignalStateManager.ts`**

   - Add `InitializationState` enum and `InitializationStatus` interface
   - Add initialization state tracking
   - Add guards to `checkPermissions()` method
   - Add `safeOneSignalCall()` wrapper method
   - Update error handling throughout

2. **`useOneSignal.ts`**
   - Update permission checking interval to respect initialization state
   - Add initialization state checks before starting intervals

### New Files

None - all changes are contained within existing files.

## Correctness Properties

### Property 1: Initialization Safety

**For any** OneSignal SDK method call, it should only execute after successful initialization.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: State Consistency

**For any** initialization state change, the internal state should accurately reflect the actual OneSignal SDK state.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: Error Resilience

**For any** OneSignal error, the app should continue to function without crashing.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 4: Timing Correctness

**For any** app lifecycle event, OneSignal operations should occur in the correct order.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

## Testing Strategy

### Unit Tests

- Test initialization state transitions
- Test permission checking with various initialization states
- Test error handling scenarios
- Test SDK method call guards

### Integration Tests

- Test full app startup flow
- Test user login/logout scenarios
- Test network failure scenarios
- Test permission change scenarios

### Manual Testing

- Test app startup on fresh install
- Test app startup with existing OneSignal data
- Test permission changes in system settings
- Test app backgrounding/foregrounding
- Test network connectivity issues

## Migration Strategy

This is a bug fix that maintains backward compatibility:

1. **No API Changes**: Public methods of `OneSignalStateManager` remain the same
2. **Enhanced Safety**: Existing functionality becomes more robust
3. **Graceful Degradation**: App works even when OneSignal fails
4. **Improved Logging**: Better debugging information available

## Performance Impact

- **Minimal Overhead**: State checks are simple boolean operations
- **Reduced Crashes**: Eliminates crash-causing race conditions
- **Better UX**: App starts faster and more reliably
- **Efficient Logging**: Structured logging for easier debugging
