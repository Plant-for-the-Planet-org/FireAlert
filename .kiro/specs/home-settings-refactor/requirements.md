# Requirements Document: Home & Settings Screen Refactoring

## Introduction

This document specifies the requirements for refactoring the Home and Settings screens in the FireAlert React Native mobile application. The refactoring transforms two monolithic components (Home.tsx ~2006 LOC, Settings.tsx ~2227 LOC) into smaller, maintainable, and testable modules while maintaining strict feature parity with the existing implementation.

The refactoring addresses code maintainability challenges without introducing any changes to user-facing behavior, visual design, copy text, or navigation flows. All existing functionality must remain identical from the user's perspective.

## Glossary

- **System**: The FireAlert React Native mobile application
- **Home_Screen**: The main map-based screen showing fire alerts and monitoring sites
- **Settings_Screen**: The configuration screen for managing sites and notification preferences
- **Container_Component**: A React component responsible for orchestration and composition only
- **UI_Component**: A presentational React component that receives data via props
- **Custom_Hook**: A React hook that encapsulates business logic and data fetching
- **Site**: A geographic area monitored for fire alerts (Point, Polygon, or MultiPolygon)
- **Alert_Method**: A notification channel (EMAIL, SMS, DEVICE, WHATSAPP, WEBHOOK)
- **Planet_RO_Site**: A site synced from Plant-for-the-Planet platform (restricted operations)
- **tRPC_Client**: Type-safe API client for server communication
- **React_Query**: Data fetching and caching library integrated with tRPC
- **Redux_Store**: Global state management for authentication and settings
- **Optimistic_Update**: UI update before server confirmation with rollback on failure
- **GeoJSON**: Geographic data format for site geometries
- **Route_Params**: Navigation parameters passed between screens
- **Bottom_Sheet**: Modal component that slides up from bottom of screen
- **Verification_Request**: Process to verify alert method ownership (email/SMS/device)

## Requirements

### Requirement 1: Code Organization and Module Structure

**User Story:** As a developer, I want the screen components organized into clear module boundaries, so that I can understand, maintain, and test the codebase effectively.

#### Acceptance Criteria

1. THE Home_Screen SHALL be decomposed into a Container_Component with orchestration logic only
2. THE Settings_Screen SHALL be decomposed into a Container_Component with orchestration logic only
3. WHEN a Container_Component is rendered THEN it SHALL contain no business logic beyond composition and event handling
4. THE System SHALL organize Home_Screen files into subdirectories: components/, hooks/, styles/, and types.ts
5. THE System SHALL organize Settings_Screen files into subdirectories: components/, hooks/, styles/, and types.ts
6. WHEN the refactoring is complete THEN Home.tsx SHALL be less than 500 lines of code
7. WHEN the refactoring is complete THEN Settings.tsx SHALL be less than 500 lines of code

### Requirement 2: Type Safety and Interface Definitions

**User Story:** As a developer, I want comprehensive TypeScript type definitions, so that I can catch errors at compile time and have clear contracts between modules.

#### Acceptance Criteria

1. THE System SHALL define all component prop interfaces in screen-level types.ts files
2. THE System SHALL define all custom hook return type interfaces in screen-level types.ts files
3. THE System SHALL define navigation types in a centralized app/types/navigation.ts file
4. WHEN a UI_Component is created THEN it SHALL have an explicit TypeScript interface for its props
5. WHEN a Custom_Hook is created THEN it SHALL have an explicit TypeScript interface for its return value
6. THE System SHALL use strict TypeScript mode with no implicit any types
7. WHEN TypeScript compilation runs THEN it SHALL complete with zero type errors

### Requirement 3: Feature Parity - No Behavioral Changes

**User Story:** As a user, I want the application to behave exactly as before the refactoring, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN a user interacts with Home_Screen THEN all behaviors SHALL match the pre-refactor implementation
2. WHEN a user interacts with Settings_Screen THEN all behaviors SHALL match the pre-refactor implementation
3. THE System SHALL maintain identical navigation flows between screens
4. THE System SHALL maintain identical modal and sheet presentation logic
5. THE System SHALL maintain identical error handling and toast notification behavior
6. THE System SHALL maintain identical loading states and indicators
7. THE System SHALL maintain identical data refresh behavior (pull-to-refresh)
8. WHEN route parameters are passed to Home_Screen THEN the map positioning SHALL behave identically
9. WHEN a site is selected THEN the selection highlighting SHALL behave identically
10. WHEN location permission is requested THEN the permission flow SHALL behave identically

### Requirement 4: Feature Parity - No Visual Changes

**User Story:** As a user, I want the application to look exactly as before the refactoring, so that I don't need to relearn the interface.

#### Acceptance Criteria

1. THE System SHALL maintain pixel-perfect visual consistency with the pre-refactor implementation
2. WHEN styles are extracted THEN all spacing values SHALL remain unchanged
3. WHEN styles are extracted THEN all color values SHALL remain unchanged
4. WHEN styles are extracted THEN all typography values SHALL remain unchanged
5. WHEN styles are extracted THEN all shadow and elevation values SHALL remain unchanged
6. THE System SHALL maintain identical component layouts and positioning
7. THE System SHALL maintain identical animation durations and easing functions
8. WHEN visual regression tests are run THEN screenshots SHALL match pre-refactor baseline

### Requirement 5: Custom Hooks for Business Logic

**User Story:** As a developer, I want business logic encapsulated in custom hooks, so that I can reuse and test logic independently of UI components.

#### Acceptance Criteria

1. THE System SHALL implement useHomeLocation hook for location permission and device location management
2. THE System SHALL implement useHomeSiteActions hook for site CRUD operations
3. THE System SHALL implement useHomeIncidentCircle hook for incident circle rendering logic
4. THE System SHALL implement useHomeMapSelection hook for map selection state management
5. THE System SHALL implement useSettingsData hook for data fetching and caching
6. THE System SHALL implement useSettingsActions hook for mutation operations
7. THE System SHALL implement useAlertPreferencesVM hook for device preference filtering
8. WHEN a Custom_Hook is called THEN it SHALL return a stable interface across re-renders
9. WHEN a Custom_Hook manages side effects THEN it SHALL clean up properly on unmount

### Requirement 6: UI Component Extraction and Composition

**User Story:** As a developer, I want presentational components separated from business logic, so that I can test and modify UI independently.

#### Acceptance Criteria

1. THE System SHALL extract HomeMapView component for map rendering
2. THE System SHALL extract HomeMapSources component for GeoJSON sources and layers
3. THE System SHALL extract HomeFloatingActions component for action buttons
4. THE System SHALL extract ProfileSheet component for user profile display
5. THE System SHALL extract AlertDetailsSheet component for alert information
6. THE System SHALL extract SiteDetailsSheet component for site management
7. THE System SHALL extract ProjectsSection component for project list rendering
8. THE System SHALL extract MySitesSection component for user sites list rendering
9. THE System SHALL extract NotificationsSection component for alert methods management
10. WHEN a UI_Component is rendered THEN it SHALL receive all data via props
11. WHEN a UI_Component needs to trigger actions THEN it SHALL use callback props
12. THE System SHALL ensure UI_Components make no direct API calls
13. THE System SHALL ensure UI_Components make no direct Redux store access

### Requirement 7: Style Organization and Consistency

**User Story:** As a developer, I want styles organized by section and purpose, so that I can find and modify styles efficiently.

#### Acceptance Criteria

1. THE System SHALL organize Home_Screen styles into: sharedStyles.ts, mapStyles.ts, modalStyles.ts, actionStyles.ts
2. THE System SHALL organize Settings_Screen styles into: sharedStyles.ts, sitesStyles.ts, notificationStyles.ts, modalStyles.ts, infoCardStyles.ts
3. WHEN styles are extracted THEN they SHALL use React Native StyleSheet.create()
4. WHEN styles are extracted THEN they SHALL reference shared theme tokens (Colors, Typography)
5. THE System SHALL update Badges.tsx to import from Settings/styles/sharedStyles.ts
6. THE System SHALL update ProtectedSitesSettings.tsx to import from Settings/styles/sharedStyles.ts
7. WHEN style files are created THEN they SHALL contain no logic, only StyleSheet definitions

### Requirement 8: Redux State Management Enhancement

**User Story:** As a developer, I want typed Redux selectors, so that I can access state safely and efficiently.

#### Acceptance Criteria

1. THE System SHALL add typed selectors to loginSlice.ts (selectIsLoggedIn, selectAccessToken, selectUserDetails, selectConfigData)
2. THE System SHALL add typed selectors to settingsSlice.ts (selectAlertMethodsEnabled, selectIsEmailEnabled, etc.)
3. THE System SHALL add memoized selectors using createSelector for derived data
4. WHEN a selector is called THEN it SHALL return the correct TypeScript type
5. WHEN a memoized selector is called multiple times with same input THEN it SHALL return cached result
6. THE System SHALL not migrate existing Redux state structure
7. THE System SHALL not add new Redux state beyond typed selectors

### Requirement 9: Data Fetching and Caching with React Query

**User Story:** As a user, I want fast and reliable data loading, so that I can access my sites and alerts without delays.

#### Acceptance Criteria

1. WHEN sites data is fetched THEN the System SHALL cache it with staleTime: Infinity
2. WHEN alert methods data is fetched THEN the System SHALL cache it with staleTime: 5 minutes
3. WHEN incident data is fetched THEN the System SHALL cache it with staleTime: 1 minute
4. WHEN a query fails THEN the System SHALL retry 3 times with exponential backoff
5. WHEN a mutation succeeds THEN the System SHALL invalidate relevant query caches
6. WHEN Settings_Screen is focused THEN the System SHALL prefetch alert methods data
7. WHEN an alert marker is tapped THEN the System SHALL prefetch incident data

### Requirement 10: Optimistic Updates and Error Handling

**User Story:** As a user, I want immediate UI feedback when I make changes, with automatic rollback if the operation fails.

#### Acceptance Criteria

1. WHEN a site is updated THEN the System SHALL apply optimistic update to cache before server response
2. WHEN a site update fails THEN the System SHALL rollback cache to previous state
3. WHEN an alert method is toggled THEN the System SHALL apply optimistic update before server response
4. WHEN an alert method toggle fails THEN the System SHALL rollback cache to previous state
5. WHEN a mutation succeeds THEN the System SHALL display success toast notification
6. WHEN a mutation fails THEN the System SHALL display error toast notification
7. WHEN a mutation is in progress THEN the System SHALL show loading indicator on affected UI element

### Requirement 11: Location Permission Management

**User Story:** As a user, I want clear guidance when location permission is needed, so that I can grant or deny permission appropriately.

#### Acceptance Criteria

1. WHEN Home_Screen loads and location permission is not determined THEN the System SHALL request location permission
2. WHEN location permission is denied THEN the System SHALL display PermissionDeniedAlert modal
3. WHEN location permission is blocked THEN the System SHALL display PermissionBlockedAlert modal
4. WHEN user taps retry in PermissionDeniedAlert THEN the System SHALL request permission again
5. WHEN user taps dismiss in PermissionDeniedAlert THEN the System SHALL clear permission state and continue
6. WHEN user taps open settings in PermissionBlockedAlert THEN the System SHALL open system settings
7. WHEN location permission is granted THEN the System SHALL update location state and show user location on map

### Requirement 12: Site Management Operations

**User Story:** As a user, I want to create, view, edit, and delete monitoring sites, so that I can customize my fire alert coverage.

#### Acceptance Criteria

1. WHEN a user creates a site THEN the System SHALL validate site name is at least 5 characters
2. WHEN a user creates a site THEN the System SHALL validate radius is in allowed range
3. WHEN a user edits a site name THEN the System SHALL enforce minimum 5 character validation
4. WHEN a user edits a site radius THEN the System SHALL show radius dropdown with valid options
5. WHEN a user deletes a site THEN the System SHALL remove it from cache and server
6. WHEN a user attempts to delete a Planet_RO_Site THEN the System SHALL prevent deletion
7. WHEN a user toggles site monitoring THEN the System SHALL update stopAlerts field
8. WHEN a site operation completes THEN the System SHALL invalidate sites query cache

### Requirement 13: Alert Method Management

**User Story:** As a user, I want to manage my notification methods, so that I receive fire alerts through my preferred channels.

#### Acceptance Criteria

1. WHEN a user adds an alert method THEN the System SHALL navigate to verification screen
2. WHEN a user toggles an alert method THEN the System SHALL update enabled field
3. WHEN a user removes an alert method THEN the System SHALL delete it from server and cache
4. WHEN an alert method is unverified THEN the System SHALL display verification warning
5. WHEN a user taps verify THEN the System SHALL navigate to OTP screen with method details
6. WHEN device alert preferences are loaded THEN the System SHALL filter by current device ID
7. WHEN OneSignal user ID is null THEN the System SHALL return empty device preferences array

### Requirement 14: Navigation and Deep Linking

**User Story:** As a user, I want to navigate between screens and deep link to specific sites, so that I can quickly access relevant information.

#### Acceptance Criteria

1. WHEN Home_Screen receives bboxGeo route param THEN the System SHALL fit map camera to bounding box
2. WHEN Home_Screen receives siteInfo route param THEN the System SHALL select and highlight the site
3. WHEN Home_Screen receives siteIncidentId route param THEN the System SHALL render incident circle
4. WHEN a user taps a site in Settings_Screen THEN the System SHALL navigate to Home_Screen with site details
5. WHEN a user taps "View on Map" in site sheet THEN the System SHALL navigate to Home_Screen with bboxGeo
6. WHEN navigation occurs THEN the System SHALL maintain navigation stack correctly
7. WHEN user presses back button THEN the System SHALL return to previous screen

### Requirement 15: Map Rendering and Interaction

**User Story:** As a user, I want to view my monitoring sites and fire alerts on an interactive map, so that I can understand geographic context.

#### Acceptance Criteria

1. THE System SHALL render sites as polygons, multipolygons, or point markers based on geometry type
2. THE System SHALL render fire alerts as marker icons at alert coordinates
3. WHEN a user taps an alert marker THEN the System SHALL open AlertDetailsSheet
4. WHEN a user taps a site polygon THEN the System SHALL open SiteDetailsSheet
5. WHEN a site is selected THEN the System SHALL highlight it with different styling
6. WHEN an incident circle exists THEN the System SHALL render it with appropriate color (active/resolved)
7. WHEN map layer is changed THEN the System SHALL update map style URL
8. WHEN my location button is tapped THEN the System SHALL center map on user location

### Requirement 16: Performance Optimization

**User Story:** As a user, I want the application to respond quickly to my interactions, so that I have a smooth experience.

#### Acceptance Criteria

1. WHEN a UI_Component receives same props THEN it SHALL not re-render (React.memo)
2. WHEN expensive computations are performed THEN they SHALL be memoized with useMemo
3. WHEN event handlers are passed to children THEN they SHALL be memoized with useCallback
4. WHEN long lists are rendered THEN the System SHALL use FlatList with keyExtractor
5. WHEN map camera moves THEN the System SHALL debounce camera change events
6. WHEN Redux selectors compute derived data THEN they SHALL use createSelector for memoization
7. WHEN modals are not visible THEN they SHALL not be rendered (lazy loading)

### Requirement 17: Error Handling and Recovery

**User Story:** As a user, I want clear error messages and recovery options when operations fail, so that I can resolve issues and continue using the app.

#### Acceptance Criteria

1. WHEN a tRPC query fails THEN the System SHALL display user-friendly error toast
2. WHEN a tRPC mutation fails THEN the System SHALL rollback optimistic updates
3. WHEN network connection is lost THEN the System SHALL retry queries on reconnection
4. WHEN site name validation fails THEN the System SHALL disable save button and show validation error
5. WHEN location permission is denied THEN the System SHALL show retry and dismiss options
6. WHEN location permission is blocked THEN the System SHALL show open settings and exit options
7. WHEN OneSignal is not initialized THEN the System SHALL handle gracefully without errors
8. WHEN alert method verification fails THEN the System SHALL allow user to retry with new code

### Requirement 18: Testing and Quality Assurance

**User Story:** As a developer, I want comprehensive test coverage, so that I can confidently refactor and maintain the codebase.

#### Acceptance Criteria

1. THE System SHALL achieve 80% or greater test coverage for custom hooks
2. THE System SHALL achieve 70% or greater test coverage for UI components
3. THE System SHALL achieve 90% or greater test coverage for utility functions
4. THE System SHALL implement unit tests for all custom hooks
5. THE System SHALL implement snapshot tests for all presentational components
6. THE System SHALL implement property-based tests for validation logic
7. THE System SHALL implement property-based tests for optimistic update rollback
8. THE System SHALL implement property-based tests for device filtering logic
9. WHEN all tests are run THEN they SHALL pass without failures
10. WHEN manual QA checklist is executed THEN all 30 scenarios SHALL pass

### Requirement 19: Security and Data Validation

**User Story:** As a user, I want my data protected and validated, so that I can trust the application with my information.

#### Acceptance Criteria

1. THE System SHALL validate site names are between 5 and 100 characters
2. THE System SHALL validate site radius is in predefined allowed values
3. THE System SHALL validate email addresses using RFC 5322 format
4. THE System SHALL validate phone numbers using E.164 format
5. THE System SHALL sanitize user-generated content before display
6. THE System SHALL validate GeoJSON before rendering on map
7. THE System SHALL validate URLs before opening in browser
8. THE System SHALL require authentication for all tRPC queries and mutations
9. THE System SHALL enforce backend authorization for site operations
10. THE System SHALL prevent deletion of Planet_RO_Sites at UI and backend levels

### Requirement 20: Dependency Management

**User Story:** As a developer, I want stable dependencies, so that the refactoring doesn't introduce breaking changes from library updates.

#### Acceptance Criteria

1. THE System SHALL not perform major version updates to any dependencies during refactoring
2. THE System SHALL only apply patch or minor version updates if necessary
3. WHEN a dependency update is considered THEN it SHALL be tested thoroughly in development
4. WHEN a dependency update causes regression THEN it SHALL be reverted
5. THE System SHALL document any skipped dependency updates with reasoning
6. THE System SHALL maintain current versions of: react-native, @react-navigation, @rnmapbox/maps, @tanstack/react-query, @reduxjs/toolkit, react-redux, @trpc/client

### Requirement 21: Documentation and Developer Experience

**User Story:** As a developer, I want clear documentation and well-organized code, so that I can understand and contribute to the codebase efficiently.

#### Acceptance Criteria

1. THE System SHALL include JSDoc comments for all custom hooks
2. THE System SHALL include JSDoc comments for all utility functions
3. THE System SHALL include inline comments for complex logic
4. THE System SHALL organize files following consistent naming conventions
5. THE System SHALL use descriptive variable and function names
6. THE System SHALL maintain README documentation for new directory structures
7. WHEN a developer reads a Custom_Hook THEN they SHALL understand its purpose and usage from documentation

### Requirement 22: Incident Circle Rendering

**User Story:** As a user, I want to see visual circles around fire incidents, so that I can understand the affected area.

#### Acceptance Criteria

1. WHEN Home_Screen receives siteIncidentId route param THEN the System SHALL fetch incident data
2. WHEN incident data is fetched THEN the System SHALL generate circle geometry
3. WHEN incident is active THEN the System SHALL render circle with active color
4. WHEN incident is resolved THEN the System SHALL render circle with resolved color
5. WHEN incident circle is rendered THEN the System SHALL display debug overlay with incident details
6. WHEN user navigates away THEN the System SHALL clear incident circle data

### Requirement 23: Project and Site Grouping

**User Story:** As a user, I want to see my Plant-for-the-Planet projects grouped with their sites, so that I can manage project-related monitoring easily.

#### Acceptance Criteria

1. WHEN Settings_Screen loads THEN the System SHALL group sites by projectId
2. WHEN sites are grouped THEN the System SHALL display project name and site count
3. WHEN a project has multiple sites THEN the System SHALL render all sites under project header
4. WHEN a site has no projectId THEN the System SHALL display it in "My Sites" section
5. THE System SHALL use groupSitesAsProject utility function for grouping logic

### Requirement 24: Alert Method Categorization

**User Story:** As a user, I want my notification methods organized by type, so that I can easily manage different channels.

#### Acceptance Criteria

1. WHEN alert methods are fetched THEN the System SHALL categorize them by method type
2. THE System SHALL create categories for: email, sms, device, whatsapp, webhook
3. WHEN alert methods are categorized THEN the System SHALL use categorizedRes utility function
4. WHEN a category has no methods THEN the System SHALL show empty state with add button
5. WHEN a category has methods THEN the System SHALL render NotificationMethodRows for each

### Requirement 25: Device-Specific Alert Preferences

**User Story:** As a user, I want to see my current device's notification settings prioritized, so that I can quickly manage alerts for this device.

#### Acceptance Criteria

1. WHEN device alert preferences are loaded THEN the System SHALL filter by OneSignal user ID
2. WHEN device alert preferences are loaded THEN the System SHALL filter by current device ID
3. WHEN current device has alert method THEN the System SHALL display it first in list
4. WHEN OneSignal user ID is null THEN the System SHALL return empty array
5. WHEN device has no alert method THEN the System SHALL show other devices' methods

### Requirement 26: Pull-to-Refresh Functionality

**User Story:** As a user, I want to manually refresh my data, so that I can ensure I'm viewing the latest information.

#### Acceptance Criteria

1. WHEN user pulls down in Settings_Screen THEN the System SHALL show refresh indicator
2. WHEN refresh is triggered THEN the System SHALL refetch sites data
3. WHEN refresh is triggered THEN the System SHALL refetch alert methods data
4. WHEN refresh is triggered THEN the System SHALL refresh device preferences
5. WHEN refresh completes THEN the System SHALL hide refresh indicator
6. WHEN refresh fails THEN the System SHALL display error toast and hide indicator

### Requirement 27: Modal and Sheet Management

**User Story:** As a user, I want modals and sheets to open and close smoothly, so that I have a polished interaction experience.

#### Acceptance Criteria

1. WHEN a sheet is opened THEN the System SHALL animate it from bottom of screen
2. WHEN a sheet backdrop is tapped THEN the System SHALL close the sheet
3. WHEN a modal is opened THEN the System SHALL dim background with overlay
4. WHEN a modal close button is tapped THEN the System SHALL close the modal
5. WHEN keyboard is shown in modal THEN the System SHALL use KeyboardAvoidingView
6. WHEN a sheet is closed THEN the System SHALL clear associated state
7. THE System SHALL ensure only one modal or sheet is visible at a time

### Requirement 28: Satellite Information Display

**User Story:** As a user, I want to see information about NASA FIRMS data sources, so that I understand where fire alerts come from.

#### Acceptance Criteria

1. THE System SHALL display NASA and Planet logos in Settings_Screen
2. THE System SHALL display satellite data source information text
3. THE System SHALL render footer links: Imprint, Privacy, Terms, NASA, FIRMS
4. WHEN a footer link is tapped THEN the System SHALL open URL in browser
5. THE System SHALL use handleLink utility function for link navigation

### Requirement 29: Warning and Info Cards

**User Story:** As a user, I want to see informational messages and warnings, so that I understand system limitations and upcoming features.

#### Acceptance Criteria

1. THE System SHALL display DisabledNotificationInfo card when applicable
2. THE System SHALL display ComingSoonBadge for future features
3. THE System SHALL display DisabledBadge for disabled features
4. WHEN info cards are rendered THEN they SHALL use consistent styling
5. WHEN warning cards are rendered THEN they SHALL use warning color scheme

### Requirement 30: Implementation Phases and Validation

**User Story:** As a project manager, I want the refactoring implemented in phases with validation at each step, so that we can catch issues early and maintain quality.

#### Acceptance Criteria

1. THE System SHALL implement Phase 1 (Foundation) before Phase 2
2. THE System SHALL implement Phase 2 (Redux) before Phase 3
3. THE System SHALL implement Phase 3 (Home Screen) before Phase 4
4. THE System SHALL implement Phase 4 (Settings Screen) before Phase 5
5. THE System SHALL implement Phase 5 (Testing) as final phase
6. WHEN each phase completes THEN validation criteria SHALL be met before proceeding
7. WHEN Phase 1 completes THEN TypeScript SHALL compile without errors and no visual changes SHALL exist
8. WHEN Phase 2 completes THEN Redux selectors SHALL return correct values
9. WHEN Phase 3 completes THEN all 18 Home-related QA scenarios SHALL pass
10. WHEN Phase 4 completes THEN all 12 Settings-related QA scenarios SHALL pass
11. WHEN Phase 5 completes THEN all 30 QA scenarios SHALL pass and test coverage SHALL meet targets
