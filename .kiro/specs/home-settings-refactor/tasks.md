# Implementation Plan: Home & Settings Screen Refactoring

## Overview

This implementation plan breaks down the refactoring of Home.tsx (~2006 LOC) and Settings.tsx (~2227 LOC) into smaller, maintainable, testable modules while maintaining strict feature parity. The refactoring follows 5 sequential phases with validation checkpoints.

## Tasks

- [x] 1. Phase 1: Foundation - Types & Styles

  - [x] 1.1 Create Home screen type definitions

    - Create `apps/nativeapp/app/screens/Home/types.ts`
    - Define all interfaces: HomeRouteParams, HomeNavigationProp, SiteFeature, SiteProperties, AlertData
    - Define component prop interfaces: HomeMapViewProps, HomeFloatingActionsProps, ProfileSheetProps, AlertDetailsSheetProps, SiteDetailsSheetProps, EditSiteModalProps, EditProfileModalProps, PermissionModalsProps
    - Define hook return type interfaces: UseHomeLocationReturn, UseHomeSiteActionsReturn, UseHomeIncidentCircleReturn, UseHomeMapSelectionReturn
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 1.2 Create Settings screen type definitions

    - Create `apps/nativeapp/app/screens/Settings/types.ts`
    - Define component prop interfaces: ProjectsSectionProps, MySitesSectionProps, NotificationsSectionProps, SiteRowProps, NotificationMethodRowProps, SiteInfoSheetProps, EditSiteModalProps, RadiusDropdownOverlayProps
    - Define hook return type interfaces: UseSettingsDataReturn, UseSettingsActionsReturn, UseAlertPreferencesVMReturn
    - Define utility types: GroupedProject, CategorizedAlertMethods, AlertMethodType
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 1.3 Create centralized navigation types

    - Create `apps/nativeapp/app/types/navigation.ts`
    - Define RootStackParamList with all screen route parameters
    - Define NavigationProp and RouteProps generic types
    - _Requirements: 2.3_

  - [x] 1.4 Extract Home screen styles

    - Create `apps/nativeapp/app/screens/Home/styles/sharedStyles.ts` with container and loading styles
    - Create `apps/nativeapp/app/screens/Home/styles/mapStyles.ts` with map, polygon, point, and alert marker styles
    - Create `apps/nativeapp/app/screens/Home/styles/modalStyles.ts` with modal and sheet styles
    - Create `apps/nativeapp/app/screens/Home/styles/actionStyles.ts` with floating button and debug overlay styles
    - Copy exact style values from existing Home.tsx (no visual changes)
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 7.1, 7.3, 7.4_

  - [x] 1.5 Extract Settings screen styles

    - Create `apps/nativeapp/app/screens/Settings/styles/sharedStyles.ts` with container, section header, and divider styles
    - Create `apps/nativeapp/app/screens/Settings/styles/sitesStyles.ts` with site row, add button, and empty state styles
    - Create `apps/nativeapp/app/screens/Settings/styles/notificationStyles.ts` with notification card and method row styles
    - Create `apps/nativeapp/app/screens/Settings/styles/modalStyles.ts` with sheet and radius dropdown styles
    - Create `apps/nativeapp/app/screens/Settings/styles/infoCardStyles.ts` with info card, warning card, and satellite section styles
    - Copy exact style values from existing Settings.tsx (no visual changes)
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 7.2, 7.3, 7.4_

  - [x] 1.6 Update style imports in existing files

    - Update `apps/nativeapp/app/screens/Settings/Badges.tsx` to import from `Settings/styles/sharedStyles.ts`
    - Update `apps/nativeapp/app/screens/Settings/ProtectedSitesSettings.tsx` to import from `Settings/styles/sharedStyles.ts`
    - _Requirements: 7.5, 7.6_

  - [x] 1.7 Phase 1 validation checkpoint
    - Run TypeScript compilation and verify zero errors
    - Run visual regression tests (screenshot comparison)
    - Verify all existing functionality works unchanged
    - _Requirements: 2.7, 4.8, 30.7_

- [x] 2. Phase 2: Redux Enhancements

  - [x] 2.1 Add typed selectors to loginSlice

    - Open `apps/nativeapp/app/redux/slices/login/loginSlice.ts`
    - Add typed selectors: selectIsLoggedIn, selectAccessToken, selectUserDetails, selectConfigData
    - Add memoized selectors using createSelector: selectUserName, selectUserEmail, selectUserAvatar
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 2.2 Add typed selectors to settingsSlice

    - Open `apps/nativeapp/app/redux/slices/login/settingsSlice.ts`
    - Add typed selectors: selectAlertMethodsEnabled, selectIsEmailEnabled, selectIsDeviceEnabled, selectIsSmsEnabled, selectIsWhatsAppEnabled, selectIsWebhookEnabled
    - Add memoized selector: selectAlertMethodEnabled
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [x] 2.3 Update Home.tsx to use typed selectors

    - Replace direct state access with typed selectors
    - Import selectors from loginSlice and settingsSlice
    - Verify no behavior changes
    - _Requirements: 8.4_

  - [x] 2.4 Update Settings.tsx to use typed selectors

    - Replace direct state access with typed selectors
    - Import selectors from loginSlice and settingsSlice
    - Verify no behavior changes
    - _Requirements: 8.4_

  - [x] 2.5 Phase 2 validation checkpoint
    - Verify Redux DevTools shows correct state structure
    - Verify selectors return expected values
    - Run performance benchmarks (no regressions)
    - _Requirements: 30.8_

- [ ] 3. Phase 3: Home Screen Decomposition

  - [x] 3.1 Implement useHomeLocation hook

    - Create `apps/nativeapp/app/screens/Home/hooks/useHomeLocation.ts`
    - Implement location permission request logic
    - Manage permission states: granted, denied, blocked
    - Return UseHomeLocationReturn interface
    - _Requirements: 5.1, 5.8, 5.9, 11.1, 11.2, 11.3_

  - [ ]\* 3.2 Write property test for useHomeLocation

    - **Property 11: Location Permission State Consistency**
    - **Validates: Requirements 11.1, 11.2, 11.3**
    - Test that permission states are mutually exclusive
    - Test that requestLocation updates state correctly

  - [x] 3.3 Implement useHomeSiteActions hook

    - Create `apps/nativeapp/app/screens/Home/hooks/useHomeSiteActions.ts`
    - Wrap tRPC mutations for site update and delete
    - Implement optimistic updates with rollback on error
    - Return UseHomeSiteActionsReturn interface with loading states
    - _Requirements: 5.2, 5.8, 10.1, 10.2, 12.3, 12.5, 12.8_

  - [ ]\* 3.4 Write property test for useHomeSiteActions optimistic updates

    - **Property 2: Optimistic Update Rollback**
    - **Validates: Requirements 10.2, 10.4**
    - Test that failed mutations restore previous cache state
    - Test that successful mutations update cache correctly

  - [x] 3.5 Implement useHomeIncidentCircle hook

    - Create `apps/nativeapp/app/screens/Home/hooks/useHomeIncidentCircle.ts`
    - Fetch incident data by siteIncidentId
    - Generate circle geometry using generateIncidentCircle utility
    - Return UseHomeIncidentCircleReturn interface
    - _Requirements: 5.3, 5.8, 22.1, 22.2_

  - [x] 3.6 Implement useHomeMapSelection hook

    - Create `apps/nativeapp/app/screens/Home/hooks/useHomeMapSelection.ts`
    - Manage selected site, alert, and area states
    - Provide clearSelection function
    - Return UseHomeMapSelectionReturn interface
    - _Requirements: 5.4, 5.8_

  - [x] 3.7 Extract HomeMapView component

    - Create `apps/nativeapp/app/screens/Home/components/HomeMapView.tsx`
    - Render MapboxGL.MapView with camera controls
    - Handle map ready and region change events
    - Accept HomeMapViewProps interface
    - _Requirements: 6.1, 6.10, 6.11, 15.7, 15.8_

  - [x] 3.8 Extract HomeMapSources component

    - Create `apps/nativeapp/app/screens/Home/components/HomeMapSources.tsx`
    - Render GeoJSON sources for sites, alerts, and incident circles
    - Handle marker press events
    - Apply conditional styling based on selection state
    - _Requirements: 6.2, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 3.9 Extract HomeFloatingActions component

    - Create `apps/nativeapp/app/screens/Home/components/HomeFloatingActions.tsx`
    - Render layer, my location, and profile buttons
    - Handle button press events
    - Display user avatar or placeholder
    - _Requirements: 6.3_

  - [x] 3.10 Extract IncidentDebugOverlay component

    - Create `apps/nativeapp/app/screens/Home/components/IncidentDebugOverlay.tsx`
    - Display debug information for incident circles
    - Conditionally render based on visibility flag
    - _Requirements: 22.5_

  - [x] 3.11 Extract ProfileSheet component

    - Create `apps/nativeapp/app/screens/Home/components/ProfileSheet.tsx`
    - Render BottomSheet with user profile display
    - Render edit, logout, and delete account buttons
    - Handle button press events and sheet close
    - _Requirements: 6.4_

  - [x] 3.12 Extract AlertDetailsSheet component

    - Create `apps/nativeapp/app/screens/Home/components/AlertDetailsSheet.tsx`
    - Render BottomSheet with alert information
    - Display confidence, detection time, location, and site name
    - Render "Open in Google Maps" button
    - _Requirements: 6.5, 15.3_

  - [x] 3.13 Extract SiteDetailsSheet component

    - Create `apps/nativeapp/app/screens/Home/components/SiteDetailsSheet.tsx`
    - Render BottomSheet with site details
    - Render monitoring toggle, edit, and delete buttons
    - Disable delete for Planet RO sites
    - _Requirements: 6.6, 12.6, 12.7, 15.4_

  - [x] 3.14 Extract EditSiteModal component

    - Create `apps/nativeapp/app/screens/Home/components/EditSiteModal.tsx`
    - Render Modal with KeyboardAvoidingView
    - Display FloatingInput for site name (min 5 characters)
    - Display DropDown for radius selection
    - Validate inputs before save
    - _Requirements: 6.7, 12.3, 12.4_

  - [ ]\* 3.15 Write property test for site name validation

    - **Property 1: Site Name Validation Consistency**
    - **Validates: Requirements 12.1, 12.3, 19.1**
    - Test that validation is consistent for all string inputs
    - Test that names >= 5 characters are valid

  - [x] 3.16 Extract EditProfileModal component

    - Create `apps/nativeapp/app/screens/Home/components/EditProfileModal.tsx`
    - Render Modal with KeyboardAvoidingView
    - Display FloatingInput for profile name
    - Handle save and cancel actions
    - _Requirements: 6.8_

  - [x] 3.17 Extract PermissionModals component

    - Create `apps/nativeapp/app/screens/Home/components/PermissionModals.tsx`
    - Render PermissionDeniedAlert and PermissionBlockedAlert
    - Handle retry, cancel, open settings, and exit actions
    - _Requirements: 6.9, 11.4, 11.5, 11.6_

  - [x] 3.18 Refactor Home.tsx container

    - Update Home.tsx to use all new hooks and components
    - Remove all business logic (orchestration only)
    - Maintain exact same behavior and navigation flows
    - Reduce to less than 500 lines of code
    - _Requirements: 1.1, 1.3, 1.6, 3.1, 3.2, 14.1, 14.2, 14.3_

  - [x] 3.19 Phase 3 validation checkpoint
    - Run all 18 Home-related manual QA scenarios
    - Verify no visual changes (screenshot comparison)
    - Verify no behavior changes
    - Verify TypeScript compiles without errors
    - _Requirements: 30.9_

- [ ] 4. Phase 4: Settings Screen Decomposition

  - [x] 4.1 Implement useSettingsData hook

    - Create `apps/nativeapp/app/screens/Settings/hooks/useSettingsData.ts`
    - Fetch sites data using tRPC site.getSites query
    - Fetch alert methods using tRPC alertMethod.getAlertMethods query
    - Compute grouped projects using groupSitesAsProject utility
    - Categorize alert methods using categorizedRes utility
    - Return UseSettingsDataReturn interface with loading states and refetch function
    - _Requirements: 5.5, 5.8, 9.1, 9.2, 23.1, 24.1_

  - [x] 4.2 Implement useSettingsActions hook

    - Create `apps/nativeapp/app/screens/Settings/hooks/useSettingsActions.ts`
    - Wrap site update, delete, and toggle monitoring mutations
    - Wrap alert method toggle and remove mutations
    - Implement optimistic updates with rollback on error
    - Return UseSettingsActionsReturn interface with granular loading states
    - _Requirements: 5.6, 5.8, 10.1, 10.2, 12.5, 12.7, 12.8, 13.2, 13.3_

  - [ ]\* 4.3 Write property test for site monitoring toggle

    - **Property 11: Site Monitoring Toggle Behavior**
    - **Validates: Requirements 12.7**
    - Test that toggle inverts stopAlerts boolean field
    - Test that optimistic update and rollback work correctly

  - [x] 4.4 Implement useAlertPreferencesVM hook

    - Create `apps/nativeapp/app/screens/Settings/hooks/useAlertPreferencesVM.ts`
    - Filter device alert methods by current device ID
    - Match OneSignal userId with alert method destination
    - Prioritize current device in results
    - Handle null OneSignal state gracefully
    - Return UseAlertPreferencesVMReturn interface
    - _Requirements: 5.7, 5.8, 13.6, 13.7, 25.1, 25.2, 25.3, 25.4, 25.5_

  - [ ]\* 4.5 Write property test for device alert preference filtering

    - **Property 3: Device Alert Preference Priority**
    - **Validates: Requirements 13.6, 25.1, 25.2, 25.3**
    - Test that current device appears first if it exists
    - Test that null OneSignal ID returns empty array

  - [x] 4.6 Extract ProjectsSection component

    - Create `apps/nativeapp/app/screens/Settings/components/ProjectsSection.tsx`
    - Render section header "My Projects"
    - Map over grouped projects and render project name with site count
    - Render SiteRow for each site in project
    - Handle site press and toggle monitoring events
    - _Requirements: 6.7, 23.2, 23.3_

  - [x] 4.7 Extract MySitesSection component

    - Create `apps/nativeapp/app/screens/Settings/components/MySitesSection.tsx`
    - Render section header "My Sites"
    - Render "Add Site" button
    - Render empty state if no sites
    - Map over sites and render SiteRow for each
    - Handle all site actions (press, toggle, edit, delete)
    - _Requirements: 6.8, 23.4_

  - [x] 4.8 Extract NotificationsSection component

    - Create `apps/nativeapp/app/screens/Settings/components/NotificationsSection.tsx`
    - Render section header "Notifications"
    - Render NotificationMethodRows for each method type
    - Handle toggle, add, verify, and remove actions
    - Display verification warnings for unverified methods
    - _Requirements: 6.9, 13.1, 13.2, 13.3, 13.4, 13.5, 24.4, 24.5_

  - [x] 4.9 Extract WarningSections component

    - Create `apps/nativeapp/app/screens/Settings/components/WarningSections.tsx`
    - Render DisabledNotificationInfo card
    - Render ComingSoonBadge and DisabledBadge
    - Display static warning messages
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_

  - [x] 4.10 Extract SatelliteInfoSection component

    - Create `apps/nativeapp/app/screens/Settings/components/SatelliteInfoSection.tsx`
    - Render NASA and Planet logos
    - Display satellite data source information
    - Render footer links (Imprint, Privacy, Terms, NASA, FIRMS)
    - Handle link press events using handleLink utility
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

  - [x] 4.11 Extract SiteRow component

    - Create `apps/nativeapp/app/screens/Settings/components/SiteRow.tsx`
    - Render site name and icon
    - Display radius if showRadius prop is true
    - Render monitoring toggle switch
    - Handle press and toggle events
    - _Requirements: 6.10_

  - [x] 4.12 Extract NotificationMethodRows component

    - Create `apps/nativeapp/app/screens/Settings/components/NotificationMethodRows.tsx`
    - Render method icon and label
    - Display destination (email, phone, device name)
    - Render enable/disable switch
    - Show verification warning if not verified
    - Render add, verify, and remove buttons
    - _Requirements: 6.11_

  - [x] 4.13 Extract SiteInfoSheet component

    - Create `apps/nativeapp/app/screens/Settings/components/SiteInfoSheet.tsx`
    - Render BottomSheet with detailed site information
    - Display site name, radius, geometry type, detection area
    - Render monitoring toggle, edit, delete, and view on map buttons
    - Disable delete for Planet RO sites
    - _Requirements: 6.12, 14.5_

  - [x] 4.14 Extract EditSiteModal component for Settings

    - Create `apps/nativeapp/app/screens/Settings/components/EditSiteModal.tsx`
    - Render Modal with KeyboardAvoidingView
    - Display FloatingInput for site name (min 5 characters)
    - Display DropDown for radius selection
    - Validate inputs before save
    - _Requirements: 6.13, 12.3, 12.4_

  - [x] 4.15 Extract RadiusDropdownOverlay component

    - Create `apps/nativeapp/app/screens/Settings/components/RadiusDropdownOverlay.tsx`
    - Render Modal with absolute positioning
    - Display radius options from RADIUS_ARR or POINT_RADIUS_ARR
    - Highlight current radius
    - Handle radius selection and close on backdrop press
    - _Requirements: 6.14, 12.4_

  - [ ]\* 4.16 Write property test for radius validation

    - **Property 9: Site Radius Validation**
    - **Validates: Requirements 12.2, 19.2**
    - Test that all selected radius values exist in predefined arrays
    - Test that invalid radius values are rejected

  - [x] 4.17 Refactor Settings.tsx container

    - Update Settings.tsx to use all new hooks and components
    - Remove all business logic (orchestration only)
    - Maintain exact same behavior and navigation flows
    - Reduce to less than 500 lines of code
    - _Requirements: 1.2, 1.3, 1.7, 3.1, 3.2, 14.4, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6_

  - [x] 4.18 Phase 4 validation checkpoint
    - Run all 12 Settings-related manual QA scenarios
    - Verify no visual changes (screenshot comparison)
    - Verify no behavior changes
    - Verify TypeScript compiles without errors
    - _Requirements: 30.10_

- [ ] 5. Phase 5: Testing & Documentation

  - [x] 5.1 Write unit tests for Home hooks

    - Test useHomeLocation: permission states, location updates, error handling
    - Test useHomeSiteActions: mutation success/failure, optimistic updates, cache invalidation
    - Test useHomeIncidentCircle: circle generation, data fetching, null states
    - Test useHomeMapSelection: selection state management, clear function
    - Target 80%+ coverage for hooks
    - _Requirements: 18.1, 18.4_

  - [x] 5.2 Write unit tests for Settings hooks

    - Test useSettingsData: query orchestration, data transformation, error handling
    - Test useSettingsActions: all mutation types, loading states, error handling
    - Test useAlertPreferencesVM: device filtering logic, OneSignal state handling
    - Target 80%+ coverage for hooks
    - _Requirements: 18.1, 18.4_

  - [x] 5.3 Write component tests for Home components

    - Snapshot tests for all presentational components
    - Interaction tests for buttons, toggles, and inputs
    - Prop validation tests
    - Conditional rendering tests (loading, error, empty states)
    - Target 70%+ coverage for components
    - _Requirements: 18.2, 18.5_

  - [x] 5.4 Write component tests for Settings components

    - Snapshot tests for all presentational components
    - Interaction tests for buttons, toggles, and inputs
    - Prop validation tests
    - Conditional rendering tests (loading, error, empty states)
    - Target 70%+ coverage for components
    - _Requirements: 18.2, 18.5_

  - [~] 5.5 Write Redux selector tests

    - Test selector return values
    - Test memoization behavior
    - Test derived data computation
    - _Requirements: 18.3_

  - [ ]\* 5.6 Write property test for cache invalidation

    - **Property 4: Cache Invalidation After Mutation**
    - **Validates: Requirements 9.5, 12.8**
    - Test that successful mutations invalidate relevant query caches
    - Test that cache invalidation triggers refetch

  - [ ]\* 5.7 Write property test for component render purity

    - **Property 5: Component Render Purity**
    - **Validates: Requirements 16.1**
    - Test that components with same props produce same output
    - Test React.memo optimization

  - [ ]\* 5.8 Write property test for mutation loading states

    - **Property 6: Mutation Loading State**
    - **Validates: Requirements 10.7**
    - Test that mutations in progress display loading indicators
    - Test that loading states clear after completion

  - [ ]\* 5.9 Write property test for mutation notifications

    - **Property 7: Mutation Success Notification**
    - **Property 8: Mutation Error Notification**
    - **Validates: Requirements 10.5, 10.6**
    - Test that successful mutations show success toast
    - Test that failed mutations show error toast

  - [ ]\* 5.10 Write property test for Planet RO site deletion prevention

    - **Property 10: Planet RO Site Deletion Prevention**
    - **Validates: Requirements 12.6, 19.10**
    - Test that isPlanetRO sites cannot be deleted
    - Test that delete button is disabled for Planet RO sites

  - [ ]\* 5.11 Write property test for project grouping

    - **Property 13: Project Grouping Consistency**
    - **Validates: Requirements 23.1, 23.2, 23.3**
    - Test that grouped sites share same projectId
    - Test that grouping is consistent across inputs

  - [ ]\* 5.12 Write property test for alert method categorization

    - **Property 14: Alert Method Categorization**
    - **Validates: Requirements 24.1, 24.2, 24.3**
    - Test that categorized methods share same method type
    - Test that categorization is consistent

  - [~] 5.13 Run full manual QA checklist

    - Execute all 30 manual QA scenarios
    - Document any failures or regressions
    - Verify feature parity across all scenarios
    - _Requirements: 18.10, 30.11_

  - [~] 5.14 Run performance benchmarks

    - Measure component render times
    - Verify memoization effectiveness
    - Check query cache hit rates
    - Ensure no performance regressions
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

  - [x] 5.15 Update documentation

    - Add JSDoc comments to all custom hooks
    - Add JSDoc comments to all utility functions
    - Add inline comments for complex logic
    - Update README for new directory structures
    - _Requirements: 21.1, 21.2, 21.3, 21.6, 21.7_

  - [x] 5.16 Final validation checkpoint
    - Verify all tests pass without failures
    - Verify test coverage meets targets (80% hooks, 70% components, 90% utilities)
    - Verify TypeScript compiles without errors
    - Verify lint checks pass
    - Run visual regression tests
    - _Requirements: 18.9, 30.11_

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Phases must be completed sequentially with validation checkpoints
- No visual or behavioral changes are allowed - strict feature parity required
- TypeScript must compile without errors at all checkpoints
- All 30 manual QA scenarios must pass before completion
