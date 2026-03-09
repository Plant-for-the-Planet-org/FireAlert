# Proximity-Based SiteIncident Processing + Server-Side Web Contouring (Server App Only)

## Summary

Implement proximity-aware incident association in backend processing so a single site can hold multiple simultaneous active incidents, and replace the web “incident circle” with clustered concave contouring in the server app UI layer.  
This implementation will use `INCIDENT_PROXIMITY_KM=2`, choose incident match by nearest distance then recency, preserve separate contour pockets, and add explicit TODO notes for future incident-merge behavior in both code and docs.

## Public API / Interface / Type Changes

- Add env var `INCIDENT_PROXIMITY_KM` (numeric, positive, default `2`) in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/env.mjs` and `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/.env.sample`.
- Extend incident repository/service contracts to support “nearest active incident within proximity” and “list active incidents per site”:
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Services/SiteIncident/SiteIncidentRepository.ts`
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Services/SiteIncident/SiteIncidentService.ts`
- Update `getActiveIncidents` behavior to return all active incidents (not wrapped single-result behavior) in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/server/api/routers/siteIncident.ts`.
- Update web contour utility result geometry type from Polygon-only to Polygon/MultiPolygon in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Components/FireIncident/incidentCircleUtils.ts` and corresponding consumer typing in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Components/FireIncident/MapComponent.tsx`.

## Implementation Plan

1. Add proximity configuration plumbing.

- Add `INCIDENT_PROXIMITY_KM` parsing/validation in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/env.mjs` (positive number transform with default `2`).
- Add sample/env docs entry in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/.env.sample` near incident settings.

2. Add proximity-aware incident lookup in repository.

- In `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Services/SiteIncident/SiteIncidentRepository.ts`, add:
  - `findNearestActiveBySiteAndProximity(...)` using PostGIS `ST_DWithin`/`ST_Distance` against each active incident’s `latestSiteAlert` coordinates, ordered by distance ASC then `updatedAt` DESC.
  - `findActiveIncidentsBySiteId(...)` using `findMany` for API plural retrieval.
- Keep existing single-incident method for compatibility where needed.

3. Refactor alert-to-incident association logic to proximity-first.

- In `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Services/SiteIncident/SiteIncidentService.ts`:
  - Add `incidentProximityKm` to constructor.
  - Replace current “one active incident by site” branch in `processNewSiteAlert` with:
    - find nearest active in range (`<= INCIDENT_PROXIMITY_KM`) and associate if found;
    - otherwise create a new incident.
  - Preserve inactive-resolution flow via existing resolver calls in manager cron.
  - Add inline TODO comment documenting future “incident merge” when one alert is close to multiple active incidents.

4. Wire cron and API behavior.

- In `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/pages/api/cron/site-incident-manager.ts`, pass `env.INCIDENT_PROXIMITY_KM` into `SiteIncidentService`.
- In `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/server/api/routers/siteIncident.ts`, update `getActiveIncidents` to return full active list for a site (plural semantics aligned with new behavior).

5. Replace web circle generation with contour generation (server app only).

- In `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Components/FireIncident/incidentCircleUtils.ts`:
  - Keep existing exported function names for compatibility, but change internals to:
    - DBSCAN cluster points (proximity default `2km`);
    - concave hull per cluster with convex/buffer fallback for sparse clusters;
    - light buffer in/out smoothing;
    - union to single Polygon/MultiPolygon while preserving separate pockets.
  - Keep area output based on final contour geometry.
- In `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Components/FireIncident/MapComponent.tsx`, relax contour geometry typing to accept MultiPolygon.
- Do not modify `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/nativeapp/app/utils/incident/incidentCircleUtils.ts` in this pass.

6. Add merge-note documentation update.

- Add a short “current overlap policy + future merger” note in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/docs/fire-incident/implementation-reference.md` describing:
  - current rule: nearest then recency;
  - future direction: explicit incident-merger feature for overlapping active incidents.

## Manual Validation Scenarios (No New Test Setup)

1. Same site, two far-apart alerts within resolution window.

- Expect two active incidents after `/api/cron/site-incident-manager`.

2. Same site, nearby alert within `2km` of an active incident.

- Expect association to that incident (no new incident).

3. Same site, alert near two active incidents.

- Expect association to nearest by distance; tie resolved by latest `updatedAt`.

4. Inactivity closure remains incident-specific.

- Backdate `updatedAt` for one active incident beyond threshold and run manager.
- Expect only that incident to close; others remain active.

5. Web incident map contour with split pockets.

- Open incident page and verify rendered contour can be MultiPolygon (separate pockets retained), not one inflated circle.

## Assumptions and Defaults

- `INCIDENT_PROXIMITY_KM` default is fixed to `2` unless env override.
- Multi-match policy is “nearest then recency.”
- Separate contour pockets are preserved.
- Incident merge is intentionally not implemented in this change; TODO notes will be added in code and docs.
- No Prisma schema migration is required for this feature pass.
