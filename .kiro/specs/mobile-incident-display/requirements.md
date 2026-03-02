# Requirements Document: Mobile Incident Display Enhancement

## Introduction

This feature enhances the FireAlert mobile application to display incident information when users tap on fire alerts. Currently, when users tap on a fire marker, they see individual alert details. This enhancement will fetch and display associated incident data (if the alert is part of an incident), render an incident circle on the map using the same logic as the web application, and show an incident summary following the established color scheme and design patterns.

## Glossary

### Existing Entities

- **SiteAlert** (Database Entity): A record created when a GeoEvent falls within a user's Site geometry; represents a single fire detection at a specific location
- **SiteIncident** (Database Entity): Groups multiple related SiteAlerts occurring within a defined time window (activity period) for a specific Site
- **Alert Marker**: A fire icon displayed on the map representing a SiteAlert, with color indicating age (orange for today, purple for 1-3 days, blue for >3 days)

### Mobile-Specific Terms

- **Alert Details Modal**: The bottom sheet that appears when a user taps on a fire marker, showing detection information, location, and site details
- **Incident Circle**: A circular polygon rendered on the map that encompasses all fire alerts within an incident, with a 2km padding radius
- **Incident Summary Card**: A visual component displaying incident metadata including start/end times, total fires, and area affected

### API Integration

- **getIncidentPublic**: Public tRPC endpoint that returns incident data including all associated alerts, site information, and incident metadata
- **Incident Circle Calculation**: Uses Turf.js to calculate centroid, radius, and area from fire point coordinates

### Color Scheme

- **Active Incident**: Orange (#E86F56) - for ongoing incidents (isActive=true)
- **Resolved Incident**: Gray (#C6C3C2) - for closed incidents (isActive=false)
- **Alert Age Colors**:
  - Orange: Today (0 days old)
  - Purple: 1-3 days old
  - Blue: >3 days old

## Requirements

### Requirement 1

**User Story:** As a mobile user, when I tap on a fire alert marker, I want to see if that alert is part of an incident, so that I can understand the broader context of the fire activity.

#### Acceptance Criteria

1. WHEN a user taps on a fire alert marker THEN the system SHALL fetch the alert details using the existing `getAlert` API
2. WHEN the alert details are retrieved AND the alert has a `siteIncidentId` field that is not null THEN the system SHALL fetch the incident data using the `getIncidentPublic` API
3. WHEN the incident data is successfully fetched THEN the system SHALL store the incident data in component state for rendering
4. WHEN the incident data fetch fails OR the alert is not associated with an incident THEN the system SHALL display only the alert details as currently implemented
5. WHEN fetching incident data THEN the system SHALL handle loading states gracefully without blocking the alert details modal from displaying

### Requirement 2

**User Story:** As a mobile user, when viewing an alert that is part of an incident, I want to see a visual circle on the map encompassing all fires in that incident, so that I can understand the geographic extent of the fire activity.

#### Acceptance Criteria

1. WHEN incident data is available AND contains multiple fire alerts THEN the system SHALL calculate the incident circle using the same logic as the web application (centroid calculation with 2km padding)
2. WHEN the incident circle is calculated THEN the system SHALL render it on the map as a MapboxGL ShapeSource with fill and line layers
3. WHEN the incident is active (isActive=true) THEN the circle SHALL be rendered in orange (#E86F56) with 15% fill opacity and 80% line opacity
4. WHEN the incident is resolved (isActive=false) THEN the circle SHALL be rendered in gray (#6b7280) with 15% fill opacity and 80% line opacity
5. WHEN the user closes the alert details modal OR selects a different alert THEN the incident circle SHALL be removed from the map
6. WHEN rendering the incident circle THEN it SHALL appear below the alert markers and site polygons in the layer hierarchy

### Requirement 3

**User Story:** As a mobile user, when viewing an alert that is part of an incident, I want to see a summary of the incident including start time, end/latest time, total fires, and area affected, so that I can quickly assess the severity and duration of the fire activity.

#### Acceptance Criteria

1. WHEN incident data is available THEN the system SHALL display an Incident Summary Card above the alert details in the bottom sheet modal
2. WHEN rendering the Incident Summary Card THEN it SHALL display a header with "Fire Incident Summary" text and an incident icon
3. WHEN the incident is active THEN the card SHALL have an orange background (#E86F56 with 25% opacity) and display an "Active" badge
4. WHEN the incident is resolved THEN the card SHALL have a gray background (#C6C3C2 with 25% opacity) and display a "Resolved" badge
5. WHEN rendering incident timestamps THEN the system SHALL display "Started at" with date and time, and "Latest at" (for active) or "Ended at" (for resolved) with date and time
6. WHEN rendering incident statistics THEN the system SHALL display "Total Fires" count and "Area Affected" in km² calculated using the incident circle area
7. WHEN formatting dates THEN the system SHALL use the format "DD MMM YYYY" (e.g., "15 Jan 2024")
8. WHEN formatting times THEN the system SHALL use the format "HH:mm AM/PM" (e.g., "02:30 PM")

### Requirement 4

**User Story:** As a developer, I want the incident display feature to follow SOLID principles and existing mobile app patterns, so that the code is maintainable, testable, and consistent with the rest of the application.

#### Acceptance Criteria

1. WHEN implementing incident data fetching THEN the system SHALL create a custom hook (e.g., `useIncidentData`) that encapsulates the fetching logic and state management
2. WHEN implementing incident circle rendering THEN the system SHALL create a reusable utility function (e.g., `generateIncidentCircle`) that can be imported and used independently
3. WHEN implementing the Incident Summary Card THEN the system SHALL create a reusable component (e.g., `IncidentSummaryCard`) that accepts incident data as props
4. WHEN creating new components THEN they SHALL follow the existing component structure in `apps/nativeapp/app/components/`
5. WHEN creating new utilities THEN they SHALL follow the existing utility structure in `apps/nativeapp/app/utils/`
6. WHEN using tRPC APIs THEN the system SHALL use the existing tRPC client configuration in `apps/nativeapp/app/services/trpc`
7. WHEN styling components THEN the system SHALL use React Native StyleSheet and follow the existing color scheme from `apps/nativeapp/app/styles/Colors.ts`
8. WHEN handling errors THEN the system SHALL use the existing Toast notification pattern for user feedback

### Requirement 5

**User Story:** As a developer, I want to ensure the incident display feature uses existing packages and is compatible with the current mobile app architecture, so that there are no dependency conflicts or breaking changes.

#### Acceptance Criteria

1. WHEN calculating incident circles THEN the system SHALL use the existing `@turf/turf` package already installed in the mobile app
2. WHEN rendering map layers THEN the system SHALL use the existing `@rnmapbox/maps` package and MapboxGL components
3. WHEN formatting dates THEN the system SHALL use the existing `moment-timezone` package
4. WHEN making API calls THEN the system SHALL use the existing tRPC client with React Query integration
5. WHEN managing component state THEN the system SHALL use React hooks (useState, useEffect, useMemo) following existing patterns
6. WHEN the feature is implemented THEN it SHALL NOT require any new package installations or dependency updates
7. WHEN the feature is implemented THEN it SHALL NOT break existing alert display functionality for alerts without incidents

### Requirement 6

**User Story:** As a mobile user, I want the incident display feature to perform efficiently without impacting map responsiveness, so that I can interact with the map smoothly even when viewing incidents with many fire alerts.

#### Acceptance Criteria

1. WHEN calculating incident circles THEN the system SHALL use `useMemo` to cache calculations and avoid unnecessary recomputation
2. WHEN rendering incident circles THEN the system SHALL limit the circle polygon to 64 steps (matching web implementation) to balance visual quality and performance
3. WHEN fetching incident data THEN the system SHALL implement proper loading states to prevent UI blocking
4. WHEN switching between alerts THEN the system SHALL efficiently update the incident circle without re-rendering the entire map
5. WHEN an alert is not part of an incident THEN the system SHALL skip incident-related calculations and rendering entirely
6. WHEN the alert details modal is closed THEN the system SHALL properly clean up incident circle layers to prevent memory leaks

## Out of Scope

The following items are explicitly out of scope for this feature:

1. **Incident Management**: Creating, updating, or closing incidents from the mobile app (admin operations remain web-only)
2. **Incident History**: Viewing historical incidents for a site (future enhancement)
3. **Incident Notifications**: Modifying notification behavior or settings (already handled by backend)
4. **Multi-Incident Display**: Showing multiple incident circles simultaneously (only the selected alert's incident is shown)
5. **Incident Review Status**: Displaying or updating the review status field (to_review, in_review, reviewed)
6. **Offline Support**: Caching incident data for offline viewing
7. **Deep Linking**: Direct navigation to incident details from push notifications (future enhancement)

## Technical Constraints

1. **API Compatibility**: Must use existing tRPC endpoints without modifications
2. **Package Constraints**: Must use existing packages without adding new dependencies
3. **React Native Version**: Must be compatible with React Native 0.71+
4. **Mapbox Version**: Must work with existing @rnmapbox/maps version
5. **TypeScript**: All new code must be properly typed with TypeScript
6. **Performance**: Incident circle rendering must not degrade map performance below 30 FPS

## Success Metrics

1. **Functional Completeness**: All acceptance criteria are met and verified
2. **Code Quality**: New code follows SOLID principles and passes linting
3. **Performance**: Map remains responsive with <100ms delay when rendering incident circles
4. **Compatibility**: Feature works on both iOS and Android without platform-specific issues
5. **User Experience**: Incident information is clearly visible and easy to understand
