# FireAlert Details UI Implementation Plan

This plan implements the new Details UI for incidents and alerts with enhanced BottomSheet interactions, map zoom functionality, and Redux state management.

## Current State Analysis

The app already has:
- `IncidentDetailsBottomSheet` component showing incident summary and alert list
- Basic incident and alert tap handling in Home Screen
- Redux store with minimal setup (login and settings slices)
- Map integration with MapboxGL

## Implementation Plan

### 1. Redux State Management Enhancement
- Create new Redux slice: `detailsUISlice` in `/app/redux/slices/details/`
- Manage state for:
  - Selected incident ID and alert ID
  - BottomSheet visibility states (incident, alert, navigation stack)
  - Map camera positions for navigation history
  - UI mode (incident-details vs alert-details)
- Add slice to Redux store

### 2. Enhanced Incident Details UI
- Modify existing `IncidentDetailsBottomSheet` to:
  - Open at 50% screen height (half screen)
  - Trigger map zoom to incident boundaries when opened
  - Show incident summary component (already implemented)
  - Display list of associated fires (SiteAlert) with improved styling
  - Add "Stop Alerts for the Incident" button (placeholder implementation)
  - Maintain map visibility behind BottomSheet

### 3. New Alert Details UI
- Create new `AlertDetailsBottomSheet` component
- Features:
  - Half-screen BottomSheet with map visible behind
  - Map zoom to specific alert location
  - Display existing alert details with enhanced layout
  - Back button when navigating from Incident Details UI
  - Maintain navigation stack state in Redux

### 4. Map Integration Enhancements
- Implement map zoom functionality:
  - Zoom to incident boundaries when incident details opened
  - Zoom to alert location when alert details opened
  - Restore previous zoom level when navigating back
- Store camera positions in Redux for navigation history
- Ensure fires/alerts remain visible on map during BottomSheet interactions

### 5. Navigation State Management
- Implement navigation flow:
  - Home → Incident Details (zoom to incident)
  - Incident Details → Alert Details (zoom to alert)
  - Alert Details → Back to Incident Details (restore incident zoom)
  - Close BottomSheet → Reset to Home map state
- Use Redux to manage navigation stack and camera positions

### 6. API Versioning Support
- Add version parameter support to API calls
- Use date-based versioning (e.g., `v=2026-03-20`)
- Ensure backward compatibility as specified

### 7. Deep Link Preparation
- Structure components and state management to support future deep linking
- Ensure UI can be opened programmatically with incident/alert IDs
- Maintain navigation state that can be restored from deep links

## Files to Create/Modify

### New Files:
- `/app/redux/slices/details/detailsUISlice.ts`
- `/app/screens/Home/components/AlertDetailsBottomSheet.tsx`
- `/app/hooks/useDetailsNavigation.ts` (custom hook for navigation logic)

### Modified Files:
- `/app/redux/store.ts` (add details slice)
- `/app/redux/slices/index.tsx` (export details slice)
- `/app/screens/Home/Home.tsx` (integrate Redux state and new components)
- `/app/screens/Home/components/IncidentDetailsBottomSheet.tsx` (enhance functionality)
- `/app/screens/Home/components/index.tsx` (export new component)

## Implementation Order

1. Create Redux details slice and update store
2. Create AlertDetailsBottomSheet component
3. Enhance IncidentDetailsBottomSheet with new features
4. Update Home.tsx with Redux integration and navigation logic
5. Add map zoom functionality and camera position management
6. Implement API versioning support
7. Test navigation flows and deep link readiness

## Technical Considerations

- Use existing BottomSheet component for consistency
- Leverage current trpc setup for API calls
- Maintain existing styling patterns with Colors and Typography
- Ensure proper TypeScript types for all new components
- Use existing incident circle utilities for map boundaries
- Follow current component structure and naming conventions
