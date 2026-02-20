# Implementation Plan: Task 3.17 - Extract PermissionModals Component

## Overview

Task 3.17 requires extracting the PermissionModals component to handle location permission alerts. The component already exists at `apps/nativeapp/app/screens/Home/components/PermissionModals.tsx` and is properly typed in `types.ts`.

## Current State Analysis

### Existing Implementation

- **Component**: `apps/nativeapp/app/screens/Home/components/PermissionModals.tsx` ✓ Already exists
- **Types**: `PermissionModalsProps` interface defined in `types.ts` ✓ Already exists
- **Current Usage in Home.tsx**: Lines 1142-1156 render both alerts directly

### Current Home.tsx Implementation

```typescript
// Lines 761-767: Handler functions
const onPressPerBlockedAlertPrimaryBtn = () => {};
const onPressPerBlockedAlertSecondaryBtn = () => {
  setIsPermissionBlocked(false);
  BackHandler.exitApp();
};

const onPressPerDeniedAlertPrimaryBtn = () => checkPermission();
const onPressPerDeniedAlertSecondaryBtn = () => checkPermission();

// Lines 1142-1156: Current rendering
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

## Implementation Tasks

### Task 1: Verify PermissionModals Component Implementation

**Status**: Component exists but needs verification

- Verify the component correctly renders both PermissionDeniedAlert and PermissionBlockedAlert
- Verify it accepts all required props from PermissionModalsProps interface
- Verify it handles all callback functions correctly
- Verify it uses React.memo for performance optimization

### Task 2: Update Home.tsx to Use PermissionModals Component

**Status**: Needs implementation

- Replace direct rendering of PermissionBlockedAlert and PermissionDeniedAlert with PermissionModals component
- Pass all required props:
  - `isPermissionDenied`: boolean state
  - `isPermissionBlocked`: boolean state
  - `onRetry`: calls checkPermission()
  - `onDismiss`: clears permission denied state
  - `onOpenSettings`: opens system settings (empty function currently)
  - `onExit`: calls BackHandler.exitApp()
- Remove the individual handler functions that are now encapsulated in PermissionModals
- Verify the component is imported from './components/PermissionModals'

### Task 3: Verify Feature Parity

**Status**: Needs verification

- Ensure all permission alert behaviors remain identical
- Verify retry functionality works correctly
- Verify dismiss/cancel functionality works correctly
- Verify open settings functionality works correctly
- Verify exit functionality works correctly
- Verify no visual changes to alerts

### Task 4: TypeScript Validation

**Status**: Needs verification

- Run TypeScript compiler in apps/nativeapp folder
- Verify zero type errors
- Verify PermissionModalsProps interface is correctly used

## Requirements Mapping

- **Requirement 6.9**: Extract PermissionModals component ✓
- **Requirement 11.4**: Handle retry action ✓
- **Requirement 11.5**: Handle cancel/dismiss action ✓
- **Requirement 11.6**: Handle open settings and exit actions ✓

## Implementation Approach

### Step 1: Verify Existing Component

The PermissionModals component already exists and appears to be correctly implemented. We need to verify it matches the requirements.

### Step 2: Update Home.tsx

Replace the current direct rendering of permission alerts with the PermissionModals component, passing the appropriate handlers.

### Step 3: Validate

- Run TypeScript compilation
- Verify no behavioral changes
- Verify no visual changes

## Expected Outcome

- PermissionModals component properly extracted and used in Home.tsx
- All permission alert logic encapsulated in the component
- Feature parity maintained with existing implementation
- Zero TypeScript errors
- Task 3.17 marked as complete

## Notes

- The component already exists, so this is primarily about verifying it's correctly implemented and integrated
- No new files need to be created
- The PermissionModalsProps interface is already defined in types.ts
- The component uses React.memo for performance optimization
