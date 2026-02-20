# Task 3.17: Extract PermissionModals Component

## Overview

Extract the location permission alert logic from Home.tsx into a dedicated PermissionModals component. This component will render both PermissionDeniedAlert and PermissionBlockedAlert conditionally based on permission state.

## Requirements

- **Requirements**: 6.9, 11.4, 11.5, 11.6
- **Feature Parity**: Maintain exact same behavior and styling
- **Type Safety**: Use PermissionModalsProps interface from types.ts

## Current Implementation Analysis

### Current State in Home.tsx

- **State Variables**:

  - `isPermissionDenied`: boolean - tracks if permission was denied
  - `isPermissionBlocked`: boolean - tracks if permission was blocked

- **Handler Functions**:

  - `onPressPerBlockedAlertPrimaryBtn()`: Empty function (no-op)
  - `onPressPerBlockedAlertSecondaryBtn()`: Calls `BackHandler.exitApp()`
  - `onPressPerDeniedAlertPrimaryBtn()`: Calls `checkPermission()`
  - `onPressPerDeniedAlertSecondaryBtn()`: Calls `checkPermission()`

- **Current Rendering** (lines 1142-1156):
  ```jsx
  <PermissionBlockedAlert
    isPermissionBlockedAlertShow={isPermissionBlocked}
    setIsPermissionBlockedAlertShow={setIsPermissionBlocked}
    message={'You need to give location permission to continue.'}
    onPressPrimaryBtn={onPressPerBlockedAlertPrimaryBtn}
    onPressSecondaryBtn={onPressPerBlockedAlertSecondaryBtn}
  />
  <PermissionDeniedAlert
    isPermissionDeniedAlertShow={isPermissionDenied}
    setIsPermissionDeniedAlertShow={setIsPermissionDenied}
    message={'You need to give location permission to continue.'}
    onPressPrimaryBtn={onPressPerDeniedAlertPrimaryBtn}
    onPressSecondaryBtn={onPressPerDeniedAlertSecondaryBtn}
  />
  ```

### PermissionAlert Components

Located in `apps/nativeapp/app/screens/Home/PermissionAlert/LocationPermissionAlerts.tsx`

- **PermissionDeniedAlert**:

  - Props: `isPermissionDeniedAlertShow`, `setIsPermissionDeniedAlertShow`, `onPressPrimaryBtn`, `onPressSecondaryBtn`, `message`
  - Renders AlertModal with "Permission Denied" heading
  - Primary button: "Ok" → calls `onPressPrimaryBtn()`
  - Secondary button: "Back" → calls `onPressSecondaryBtn()`

- **PermissionBlockedAlert**:
  - Props: `isPermissionBlockedAlertShow`, `setIsPermissionBlockedAlertShow`, `onPressPrimaryBtn`, `onPressSecondaryBtn`, `message`
  - Renders AlertModal with "Permission Blocked" heading
  - Primary button: "Open Settings" → opens system settings + calls `onPressPrimaryBtn()`
  - Secondary button: "Back" → calls `onPressSecondaryBtn()`

## Implementation Plan

### Step 1: Verify PermissionModalsProps Interface

- Check if `PermissionModalsProps` is already defined in `apps/nativeapp/app/screens/Home/types.ts`
- If not present, add it with the following structure:
  ```typescript
  export interface PermissionModalsProps {
    isDenied: boolean;
    isBlocked: boolean;
    onDeniedRetry: () => void;
    onDeniedCancel: () => void;
    onBlockedOpenSettings: () => void;
    onBlockedExit: () => void;
  }
  ```

### Step 2: Create PermissionModals Component

- **File**: `apps/nativeapp/app/screens/Home/components/PermissionModals.tsx`
- **Responsibilities**:

  - Accept PermissionModalsProps
  - Render PermissionDeniedAlert when `isDenied` is true
  - Render PermissionBlockedAlert when `isBlocked` is true
  - Pass appropriate callbacks to each alert
  - Handle state clearing via callbacks

- **Implementation Details**:
  - Import PermissionDeniedAlert and PermissionBlockedAlert from `./PermissionAlert/LocationPermissionAlerts`
  - Import React and necessary types
  - Create functional component with proper TypeScript typing
  - Use React.memo for performance optimization
  - Add JSDoc comments

### Step 3: Update Home.tsx

- Remove the two separate alert renderings (lines 1142-1156)
- Replace with single `<PermissionModals />` component
- Pass state and handlers as props:
  ```jsx
  <PermissionModals
    isDenied={isPermissionDenied}
    isBlocked={isPermissionBlocked}
    onDeniedRetry={() => {
      setIsPermissionDenied(false);
      checkPermission();
    }}
    onDeniedCancel={() => setIsPermissionDenied(false)}
    onBlockedOpenSettings={() => setIsPermissionBlocked(false)}
    onBlockedExit={() => {
      setIsPermissionBlocked(false);
      BackHandler.exitApp();
    }}
  />
  ```

### Step 4: Validation

- Run TypeScript compilation: `yarn nativeapp typecheck`
- Verify no type errors
- Verify component renders correctly
- Verify all button handlers work as expected
- Verify feature parity with original implementation

## Files to Modify

1. **Create**: `apps/nativeapp/app/screens/Home/components/PermissionModals.tsx`
2. **Modify**: `apps/nativeapp/app/screens/Home/types.ts` (add PermissionModalsProps if needed)
3. **Modify**: `apps/nativeapp/app/screens/Home/Home.tsx` (replace alert renderings)

## Expected Outcome

- New PermissionModals component that encapsulates permission alert rendering logic
- Cleaner Home.tsx with reduced JSX complexity
- Maintained feature parity and behavior
- Improved code organization and reusability
- Zero TypeScript errors
