# Home Map Display Mode: Alerts vs Incidents (Icon-Only Switcher + Duration Filter)

## Summary

Implement a new **map display mode** control on `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/Home.tsx` that is independent from tile layer selection (`MapLayerContext`), with:

- Icon-only segmented switcher: `Alerts` and `Incidents`.
- Duration dropdown (default `7d`) controlling what is shown.
- `Alerts` mode: show alerts only (filtered by duration).
- `Incidents` mode: show active incidents only, discovered from existing alert+incident APIs, with incident bottom sheet showing summary + all associated alerts list.

Target plan file path for persistence (when mutation is allowed):

- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/.codex/plans/home-map-alerts-incidents-display-mode-plan.md`

## Confirmed Product Decisions

- Display modes are separate from map layer style (`Street/Satellite/...`) and must not use `MapLayerContext`.
- Site boundaries/overlays remain visible in both modes.
- Incident mode scope: **Active incidents + duration filter (default 7 days)**.
- Incident tap behavior: open bottom sheet (new bottom sheet implementation planned previously), show:
  - Incident summary
  - List of all alerts in that incident (list view; `FlatList` for phase 1 to minimize dependency changes).

## Current-State Findings (Grounded)

- `Home.tsx` currently always renders:
  - incident circle (single, based on selected alert’s incident)
  - alert markers
  - site point markers
- `useIncidentData` currently fetches only one incident by `selectedAlert.siteIncidentId`.
- Alerts API (`alert.getAlerts`) returns alert records with `siteIncidentId` and is limited to recent period (currently 30 days in backend).
- No single existing API returns all active incidents for the user in one request.
- Existing incident APIs are per incident ID or per site ID.

## Implementation Approach (Frontend-focused, existing APIs only)

### 1) Add independent Home map display state

In `Home.tsx`, add local state (not global reducer/context):

- `mapDisplayMode: 'alerts' | 'incidents'` (default `'alerts'` to preserve current behavior).
- `mapDurationDays: number` (default `7`).
- `selectedIncidentId: string | null` for incident-mode sheet.

Also add derived values:

- `durationOptions = [1, 3, 7, 30]` (days).
- `durationCutoffDate = now - mapDurationDays`.

### 2) Add icon-only switcher + duration dropdown UI

Create screen-scoped components under Home:

- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/components/MapDisplayModeSwitcher.tsx`
- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/components/MapDurationDropdown.tsx`

Behavior:

- Segmented pill control styled like provided image; no labels, icons only.
- Recommended icons:
  - Alerts: `RadarIcon`
  - Incidents: `IncidentActiveIcon`
- Duration dropdown shown next to/under switcher; selection applies to both modes.

Placement:

- Absolute overlay near top-center to avoid collision with avatar/layer buttons on right.

### 3) Alerts mode rendering changes

Refactor alert rendering path:

- Build `filteredAlerts` from existing alerts query by `mapDurationDays`.
- Render alert markers only when `mapDisplayMode === 'alerts'`.
- Keep existing site polygons and point-site markers unchanged.
- Hide incident overlays in alerts mode.
- Keep existing alert detail bottom sheet flow intact.

### 4) Incidents mode data composition using existing endpoints

Keep existing data fetching stack; no new backend endpoint in phase 1.

Data composition steps:

1. From `filteredAlerts`, collect unique non-null `siteIncidentId`s.
2. Use `trpc.useQueries(...)` to fetch `siteIncident.getIncidentPublic` for each unique ID.
3. Filter incident results where `incident.isActive === true`.
4. Build map incident models for rendering:
   - incident id
   - latest alert coordinate (for focus marker/tap target)
   - duration-window alert points (for circle geometry)
5. Compute circles in `useMemo` with `generateIncidentCircle`.

### 5) Incident mode rendering changes

Replace single selected-incident circle flow with multi-incident mode flow:

- Render circles only when `mapDisplayMode === 'incidents'`.
- Render incident tap targets (e.g., marker at latest alert/centroid).
- On incident tap:
  - set `selectedIncidentId`
  - open incident bottom sheet
  - focus map camera on incident geometry/point.

### 6) Incident bottom sheet (summary + alert list)

Add new component:

- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/components/IncidentDetailsBottomSheet.tsx`

Content:

- `IncidentSummaryCard`
- `FlatList` of all incident alerts (from selected incident detail payload)
- each item shows: detection time, confidence, source, coordinates
- optional item tap: center map to that alert point.

Data source:

- Reuse `useIncidentData` with `selectedIncidentId` while in incidents mode.

Dependency note:

- Wire this sheet to the new bottom sheet implementation from:
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/.codex/plans/bottom-sheet-migration-impact-plan.md`
- If that migration is not merged yet, use current `BottomSheet` API-compatible wrapper and keep structure migration-ready.

### 7) Mode transition rules (state hygiene)

On mode switches:

- Alerts -> Incidents:
  - clear `selectedAlert`
  - clear single-incident circle state derived from selected alert
  - close alert sheet/highlight wave
- Incidents -> Alerts:
  - clear `selectedIncidentId`
  - close incident sheet
- Keep site selection/site sheet behavior unchanged.

### 8) Performance and stability guards

- Limit incident detail fan-out queries (e.g., top N recent incident IDs from filtered alerts, recommended `N=60`) to avoid request spikes.
- Memoize grouped/derived incident structures.
- Avoid repeated expensive circle recomputation when unrelated state changes.
- Minimize console noise from per-circle debug logs in incident-mode render path.

## Public API / Interface Changes

### Frontend interfaces (new)

- `MapDisplayMode = 'alerts' | 'incidents'`
- `MapDurationDays` options (`1|3|7|30`)
- New component props:
  - `MapDisplayModeSwitcher({mode, onChange})`
  - `MapDurationDropdown({value, options, onChange})`
  - `IncidentDetailsBottomSheet({incidentId, visible, onClose, onAlertPress})`

### Existing APIs used (unchanged)

- `alert.getAlerts`
- `siteIncident.getIncidentPublic`

### No server contract changes in phase 1

By request, backend API changes are deferred; frontend composes incident mode from existing endpoints.

## File-Level Impact (Phase 1)

Expected touched/added files (frontend):

1. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/Home.tsx` (major)
2. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/components/MapDisplayModeSwitcher.tsx` (new)
3. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/components/MapDurationDropdown.tsx` (new)
4. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/components/IncidentDetailsBottomSheet.tsx` (new)
5. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/types/incident.ts` (optional type additions)

Total expected: **4–5 frontend files**.

## Acceptance Criteria

1. Home shows icon-only display mode switcher.
2. Default mode is `Alerts`.
3. Duration dropdown defaults to `7d` and updates visible map overlays.
4. Alerts mode:

- shows filtered alert markers
- does not render incident circles.

5. Incidents mode:

- shows only active incidents (from existing incident detail fetches)
- shows circles for incidents in selected duration window.

6. Tapping incident opens incident bottom sheet with summary + associated alert list.
7. Site boundaries and site overlays remain visible in both modes.
8. Existing map layer selector behavior is unchanged.

## Test Cases and Scenarios

1. Mode switch render gating

- Toggle Alerts -> Incidents -> Alerts and verify overlays change correctly.

2. Duration filter correctness

- For 1d/3d/7d/30d, verify alert count and incident count visually change.

3. State cleanup

- Open alert sheet in Alerts mode, switch to Incidents, verify alert sheet closes and no stale highlight remains.
- Open incident sheet, switch to Alerts, verify incident sheet closes.

4. Incident interaction

- Tap incident marker/circle, sheet opens with summary and list.
- Tap list item, map focuses corresponding alert coordinate.

5. Non-regression

- Layer modal still changes tile style.
- Profile, site, alert existing bottom sheets still function.

6. Performance sanity

- No UI freeze when toggling modes with large alert sets.
- Query fan-out stays within configured cap.

## Risks and Mitigations

- Risk: many incident-detail queries from frontend composition.
- Mitigation: cap queried incident IDs, memoize derived lists, and cache with react-query/trpc defaults.

- Risk: circles computed from duration-filtered alerts may not represent full incident history geometry.
- Mitigation: clarify behavior as “duration-window visualization”; full incident history remains in incident bottom sheet.

- Risk: current circle utility logs heavily when called many times.
- Mitigation: reduce/guard logs in production path during implementation.

## TODOs / Deferred Improvements (Explicit)

1. Add dedicated backend endpoint for Home map incidents (`activeOnly`, `durationDays`) to replace query fan-out.
2. Add server-side duration parameter to alerts endpoint or dedicated map-alert endpoint if >30d requirement appears.
3. Optionally upgrade incident alert list from `FlatList` to `FlashList` after baseline validation.
4. Unify selected alert incident flow and incident-mode flow with a shared map incident data hook after phase-1 stabilization.

## Assumptions and Defaults

- Default map display mode: `Alerts`.
- Default duration: `7 days`.
- Duration options: `1d`, `3d`, `7d`, `30d`.
- Incident mode renders only active incidents.
- Frontend-only implementation in this phase; existing APIs retained.
- New bottom sheet migration is treated as dependency for final incident sheet UX.
