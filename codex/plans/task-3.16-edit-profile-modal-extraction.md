# Task 3.16: Extract EditProfileModal Component

## Overview

Extract the profile edit modal from Home.tsx into a separate, reusable component following the established pattern from EditSiteModal.

## Current State Analysis

### Location in Home.tsx

- Lines: ~1603-1632
- State Dependencies:
  - profileEditModal (boolean) - visibility state
  - profileName (string) - input value
  - loading (boolean) - save operation state
- Functions:
  - handleEditProfileName() - saves profile name
  - handleCloseProfileModal() - closes modal
  - setProfileName() - updates input value

## Implementation Plan

### 1. Create New Component File

**Path**: `apps/nativeapp/app/screens/Home/components/EditProfileModal.tsx`

### 2. Component Structure

Following EditSiteModal pattern:

- Import necessary dependencies (Modal, KeyboardAvoidingView, etc.)
- Define component with EditProfileModalProps interface (already exists in types.ts)
- Use local state for profile name
- Include Toast ref for validation messages
- Implement validation (name length check if needed)

### 3. Props Interface (Already Defined)

```typescript
export interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  onSave: (name: string) => Promise<void>;
  isLoading: boolean;
}
```

### 4. Component Features

- Modal with slide animation
- KeyboardAvoidingView for iOS/Android
- Close button (CrossIcon)
- Heading: "Edit Your Name"
- FloatingInput for name entry (autoFocus, isFloat=false)
- CustomButton with loading state
- Validation: Check if name is not empty/whitespace before save

### 5. Styling

Use existing modalStyles from `styles/modalStyles.ts`:

- siteModalStyle
- crossContainer
- heading
- btnContinueSiteModal
- title

### 6. Update Home.tsx

Remove the modal JSX (lines ~1603-1632) and replace with:

```tsx
<EditProfileModal
  visible={profileEditModal}
  onClose={handleCloseProfileModal}
  userName={profileName}
  isLoading={loading}
  onSave={async (name) => {
    setLoading(true);
    const payload = { name: name.trim() };
    updateUser.mutate({ json: { body: payload } });
  }}
/>
```

### 7. State Management in Home.tsx

Keep existing state:

- profileEditModal - controls visibility
- profileName - initialized when modal opens via handlePencil()
- loading - managed by mutation callbacks

Update handlePencil() to set profileName before opening modal.

### 8. Validation Logic

In EditProfileModal component:

- Trim whitespace from input
- Check if name is not empty
- Show toast warning if validation fails
- Only call onSave if validation passes

## Files to Modify

1. **CREATE**: `apps/nativeapp/app/screens/Home/components/EditProfileModal.tsx`

   - New component file
   - ~120 lines (similar to EditSiteModal)

2. **MODIFY**: `apps/nativeapp/app/screens/Home/Home.tsx`

   - Remove modal JSX (lines ~1603-1632)
   - Add import for EditProfileModal
   - Replace with component usage
   - Keep existing state and handlers

3. **VERIFY**: `apps/nativeapp/app/screens/Home/types.ts`
   - EditProfileModalProps already defined ✓

## Testing Checklist

- [ ] Modal opens when edit profile is triggered
- [ ] Profile name is pre-filled correctly
- [ ] Input field has autofocus
- [ ] Keyboard avoiding works on iOS
- [ ] Close button dismisses modal
- [ ] Validation prevents empty names
- [ ] Save button shows loading state
- [ ] Profile name updates successfully
- [ ] Modal closes after successful save
- [ ] Error handling works correctly

## Success Criteria

- Component extracted successfully
- No visual or behavioral changes
- Follows EditSiteModal pattern
- Type-safe with proper interfaces
- Maintains all existing functionality
- Code is cleaner and more maintainable
