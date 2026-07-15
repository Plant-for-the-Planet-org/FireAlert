# Implementation Plan: Protected Sites Map Fires and Incidents

## Overview

Show fire icons and incident boundaries for Protected Sites on the landing page Map View, identical in behavior to normal Sites. One new tRPC endpoint plus a client-side merge. No schema changes, no changes to existing endpoints.

Branch: `feature/protected-sites-map-fires-incidents` (from `develop`)

## Tasks

- [ ] 1. Add `alert.getAlertsForProtectedSites` tRPC query

  - Edit `apps/server/src/server/api/routers/alert.ts`
  - Copy `getAlerts` and change the site where clause to `{userId: null, deletedAt: null, siteRelations: {some: {userId, deletedAt: null}}}`
  - Keep 30-day window, newest-first sort, 300 cap, identical select and response envelope
  - Do not filter on `SiteRelation.isActive`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Add `useFetchProtectedSiteAlerts` hook

  - Edit `apps/nativeapp/app/utils/api.tsx`
  - Mirror `useFetchSites` with query key `['alerts', 'getAlertsForProtectedSites']`
  - _Requirements: 2.1, 4.3_

- [ ] 3. Merge protected site alerts into the map data flow

  - Edit `apps/nativeapp/app/screens/Home/Home.tsx`
  - Call the new hook next to `useFetchSites` (around line 260)
  - Extend the `filteredAlerts` memo (around line 294) to concat both sources before the date cutoff filter, adding `protectedSiteAlerts` to the dependency array
  - No changes to `renderAnnotations`, `composedIncidents`, `handleIncidentTap`, bottom sheets, `MapDurationDropdown`, or `MapDisplayModeSwitcher`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Manual verification (on request)

  - Alerts mode: fire icons appear inside a Protected Site boundary, colors match age, tap opens `AlertDetailsBottomSheet`
  - Date filter: switching 1d / 3d / 7d / 30d updates protected fires instantly with no refetch
  - Incidents mode: circles appear for protected incidents, tap opens `IncidentDetailsBottomSheet`, detection tap navigates to alert details and back
  - Regression: user with no Protected Sites sees identical behavior to develop; protected boundary tap still opens the site sheet
  - _Requirements: 4.1, 4.2, 4.4_
