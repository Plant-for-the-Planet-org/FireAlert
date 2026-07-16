# Requirements Document

## Introduction

The landing page Map View currently shows fire alerts (tappable fire icons) and incidents (tappable boundary circles) only for normal Sites, which are owned through `Site.userId`. Protected Sites are Sites with `origin = 'protectedarea'` linked to the user through `SiteRelation` (with `Site.userId = null`), so their SiteAlerts are never returned by `alert.getAlerts` and nothing fire-related renders for them.

This feature shows fires and incidents for Protected Sites on the Map View, behaving the same as for normal Sites: fire icons respect the date filter (top left), incident boundaries appear in incidents mode, and both open the existing detail bottom sheets.

## Constraints

- No Prisma schema changes.
- No breaking changes: existing endpoints keep their exact request and response shapes. All new behavior comes from one new tRPC endpoint and client-side merging.
- SiteAlert and SiteIncident rows already exist for Protected Sites (confirmed: the PostGIS trigger populates `detectionGeometry` and `slices` for all Sites, and the alert pipeline does not filter by ownership).

## Glossary

- **Protected Site**: A `Site` row with `origin = 'protectedarea'`, `userId = null`, linked to users via `SiteRelation`
- **SiteRelation**: Join table linking a user to a Protected Site, with `isActive` (notification pause) and `role`
- **Date Filter**: The `MapDurationDropdown` (1d / 3d / 7d / 30d) on the top left of the map
- **View Switch**: The `MapDisplayModeSwitcher` toggling between `alerts` and `incidents` display modes

## Requirements

### Requirement 1: Fetch fire alerts for Protected Sites

**User Story:** As a user who follows Protected Sites, I want the app to load their fire alerts, so that I can see fires inside those areas.

#### Acceptance Criteria

1. THE Server SHALL provide a new tRPC query `alert.getAlertsForProtectedSites` (protectedProcedure, no input)
2. THE endpoint SHALL return alerts for Sites linked to the calling user through an active `SiteRelation` (`deletedAt: null`), with `site.deletedAt: null`
3. THE endpoint SHALL mirror `alert.getAlerts` exactly: 30-day event window, sorted newest first, capped at 300 alerts, same per-alert fields (`id, site {id, name, project}, siteIncidentId, eventDate, type, latitude, longitude, detectedBy, confidence, distance, data, localEventDate, localTimeZone`) and same `{status, data}` envelope
4. THE endpoint SHALL return alerts regardless of `SiteRelation.isActive` (pause only affects notifications)
5. THE existing `alert.getAlerts` endpoint SHALL remain unchanged

### Requirement 2: Render fire icons for Protected Sites

**User Story:** As a user, I want fire icons on the map inside my Protected Sites, so that fires there look the same as fires on my own sites.

#### Acceptance Criteria

1. WHEN the map is in `alerts` mode, THE App SHALL render Protected Site alerts as fire icons using the same rendering path as normal site alerts (`renderAnnotation`, `getFireIcon` age colors)
2. WHEN the user changes the date filter, THE App SHALL filter Protected Site alerts by `eventDate` using the same client-side logic as normal site alerts, with no extra network request
3. WHEN the user taps a Protected Site fire icon, THE App SHALL open the existing `AlertDetailsBottomSheet` via `openAlertDetails`
4. THE fire icons for Protected Sites SHALL be visually identical to those for normal sites

### Requirement 3: Render incidents for Protected Sites

**User Story:** As a user, I want incident boundaries for fires inside my Protected Sites, so that I can inspect grouped fire events there.

#### Acceptance Criteria

1. WHEN the map is in `incidents` mode, THE App SHALL compose incidents from the merged alert list (normal plus protected) grouped by `siteIncidentId`, using the existing composition logic and its existing 60-incident cap
2. WHEN the user taps a Protected Site incident boundary, THE App SHALL open the existing `IncidentDetailsBottomSheet` via `openIncidentDetails`
3. WHEN the user taps a fire detection inside the incident sheet, THE App SHALL navigate to the alert details and back, using the existing flow
4. THE incident boundaries for Protected Sites SHALL be visually identical to those for normal sites

### Requirement 4: Scope and non-regression

**User Story:** As a user of the current app, I want everything else to keep working exactly as before.

#### Acceptance Criteria

1. THE Protected Site alerts SHALL appear only on the Map View (fire icons, incident circles, and their bottom sheets); alert lists, counts, and notifications elsewhere SHALL be unchanged
2. WHEN the user has no Protected Sites, THE map SHALL behave exactly as today
3. IF the new query fails, THE App SHALL still render normal site alerts (the two sources fail independently)
4. THE Protected Site boundary rendering (`renderProtectedAreasSource`) and its tap behavior SHALL remain unchanged
