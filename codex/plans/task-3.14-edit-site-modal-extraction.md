# Task 3.14: Extract EditSiteModal Component

## Overview

Extract the edit site modal from Home.tsx into a reusable component that allows users to edit site name and radius.

## Current Implementation Analysis

### Location in Home.tsx

- Lines 1634-1678: Modal with KeyboardAvoidingView
- State variables used:
  - `siteNameModalVisible`: Controls modal visibility
  - `siteName`: Site name input value
  - `siteId`: ID of site being edited
  - `siteGeometry`: Geometry type (Point vs Polygon) - determines radius options
  - `siteRad`: Selected radius object
  - `isEditSite`: Boolean flag indicating if site is from Planet RO (name editing disabled)
  - `modalToast`: Toast ref for validation messages

### Handlers

- `handleCloseSiteModal()`: Closes modal by setting `siteNameModalVisible` to false
- `handleEditSiteInfo()`: Validates and submits site update
  - Validates site name >= 5 characters
  - Calls `updateSite.mutate()` with payload
  - If `isEditSite` is true, removes name from payload (Planet RO sites can't change name)

### Dependencies

- Components: `Modal`, `KeyboardAvoidingView`, `TouchableOpacity`, `Text`, `View`, `Toast`, `FloatingInput`, `DropDown`, `CustomButton`, `CrossIcon`
- Constants: `RADIUS_ARR`, `POINT_RADIUS_ARR`
- Styles: `siteModalStyle`, `crossContainer`, `heading`, `commonPadding`, `title`, `btnContinueSiteModal`

## New Component Design

### File Location

`apps/nativeapp/app/screens/Home/components/EditSiteModal.tsx`

### Props Interface

```typescript
interface EditSiteModalProps {
  visible: boolean;
  onClose: () => void;
  siteId: string;
  siteName: string;
  siteRadius: number;
  siteGeometry: string;
  isPlanetROSite: boolean;
  onSave: (name: string, radius: number) => Promise<void>;
  isLoading: boolean;
}
```

### Component Structure

1. **Internal State**

   - `localSiteName`: Local copy of site name for editing
   - `localSiteRadius`: Local copy of radius object for editing
   - `toastRef`: Ref for internal toast notifications

2. **Effects**

   - Reset local state when modal opens (when `visible` changes to true)
   - Initialize `localSiteName` and `localSiteRadius` from props

3. **Handlers**

   - `handleSave()`: Validates name length >= 5, calls `onSave` prop with values
   - `handleClose()`: Calls `onClose` prop

4. **Validation**

   - Site name must be at least 5 characters
   - Show toast warning if validation fails
   - Disable save button if name is invalid

5. **Rendering**
   - Modal with slide animation
   - KeyboardAvoidingView for iOS
   - Close button (X icon)
   - Heading: "Enter Site Name"
   - FloatingInput for site name (disabled if `isPlanetROSite`)
   - DropDown for radius selection (uses `POINT_RADIUS_ARR` if geometry is Point, else `RADIUS_ARR`)
   - Continue button with loading state

### Styles to Extract

From Home.tsx styles:

- `siteModalStyle`
- `crossContainer`
- `heading`
- `commonPadding`
- `btnContinueSiteModal`
- `title`

These should be moved to `apps/nativeapp/app/screens/Home/styles/modalStyles.ts` (already exists from task 1.4)

## Implementation Steps

1. **Read existing modal styles** from Home.tsx to understand exact styling
2. **Check modalStyles.ts** to see if styles already exist from Phase 1
3. **Create EditSiteModal.tsx** with:
   - Import all required dependencies
   - Define EditSiteModalProps interface
   - Implement component with local state management
   - Add validation logic
   - Add proper TypeScript types
4. **Update Home.tsx** to:
   - Import EditSiteModal component
   - Replace inline modal JSX with EditSiteModal component
   - Pass appropriate props
   - Remove unused state/handlers if fully extracted
5. **Test** that modal works identically to before

## Requirements Validation

- ✅ 6.7: Extract EditSiteModal component
- ✅ 12.3: Site name validation (min 5 characters)
- ✅ 12.4: Radius selection via dropdown

## Notes

- Must maintain exact same behavior (no visual or functional changes)
- Planet RO sites cannot change name (editable prop on FloatingInput)
- Geometry type determines which radius array to use
- Toast notifications for validation errors
- KeyboardAvoidingView only for iOS
