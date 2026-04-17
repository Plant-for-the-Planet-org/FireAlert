# FireAlert Remaining Tasks Implementation Plan

This plan addresses the three remaining tasks for completing the new Details UI for incidents and alerts: map zoom functionality, API versioning support, and deep link preparation.

## Task 1: Enhanced Map Zoom Functionality

### Current State
- Basic zoom implemented for alerts (fixed zoom level 15)
- No automatic zoom for incident boundaries
- Camera position tracking exists in Redux but not fully utilized

### Implementation Steps
1. **Incident Boundary Zoom Enhancement**
   - Modify `handleIncidentTap` to fetch incident boundary data
   - Calculate optimal zoom level based on incident polygon boundaries
   - Use MapboxGL `fitBounds` or calculate center + zoom for incident boundaries
   - Store camera position in Redux for navigation history

2. **Alert Zoom Refinement**
   - Enhance existing alert zoom with dynamic zoom levels based on alert type
   - Add zoom animation consistency between incident and alert views
   - Restore previous camera position when navigating back

3. **Camera Position Management**
   - Implement `updateCameraPosition` Redux action usage
   - Add camera position listeners to track user movements
   - Store and restore camera positions for navigation history

### Files to Modify
- `apps/nativeapp/app/screens/Home/Home.tsx` - Update tap handlers
- `apps/nativeapp/app/redux/slices/details/detailsUISlice.ts` - Enhance camera management
- `apps/nativeapp/app/screens/Home/components/IncidentDetailsBottomSheet.tsx` - Add boundary zoom

## Task 2: API Versioning Support

### Current State
- No version parameters in API calls
- trpc client configured without version handling
- Requirements specify date-based versioning (v=2026-03-20)

### Implementation Steps
1. **Version Management Utility**
   - Create `apps/nativeapp/app/utils/apiVersioning.ts`
   - Implement date-based version string generation
   - Add version validation and fallback logic

2. **trpc Client Enhancement**
   - Modify `apps/nativeapp/app/services/trpc.tsx`
   - Add version parameter to all API requests
   - Implement version header or query parameter injection

3. **Query Updates**
   - Update incident and alert related queries to include version
   - Add version-aware caching strategies
   - Implement version mismatch handling

### Files to Create/Modify
- `apps/nativeapp/app/utils/apiVersioning.ts` - New utility
- `apps/nativeapp/app/services/trpc.tsx` - Client enhancement
- `apps/nativeapp/app/config/index.ts` - Version configuration

## Task 3: Deep Link Preparation

### Current State
- Redux state structure supports navigation
- No URL parsing or external trigger handling
- Components ready for external state initialization

### Implementation Steps
1. **Deep Link Utilities**
   - Create `apps/nativeapp/app/utils/deepLinking.ts`
   - Implement URL parsing for incident and alert deep links
   - Add validation and error handling for deep link parameters

2. **External State Initialization**
   - Add Redux actions for deep link triggered navigation
   - Implement state restoration from deep link parameters
   - Add deep link ready state management

3. **Notification Integration Preparation**
   - Prepare notification tap handling infrastructure
   - Add notification-to-deep-link bridge functions
   - Implement notification data validation

### Files to Create/Modify
- `apps/nativeapp/app/utils/deepLinking.ts` - New utility
- `apps/nativeapp/app/redux/slices/details/detailsUISlice.ts` - Add deep link actions
- `apps/nativeapp/app/screens/Home/Home.tsx` - Add deep link handling

## Implementation Priority
1. **High Priority**: Map Zoom Functionality (core UX requirement)
2. **Medium Priority**: API Versioning (backend compatibility)
3. **Low Priority**: Deep Link Preparation (future feature readiness)

## Testing Strategy
- Map zoom: Test with various incident sizes and alert locations
- API versioning: Verify backward compatibility and version handling
- Deep links: Test URL parsing and state restoration flows

## Dependencies
- MapboxGL camera API documentation for boundary calculations
- trpc client configuration patterns for version parameters
- React Navigation deep linking patterns for reference

This plan ensures the remaining functionality is implemented while maintaining the existing architecture and preparing for future enhancements.
