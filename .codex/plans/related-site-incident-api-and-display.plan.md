## Implement Related Incident Chain API + Incident Page Multi-Incident View (Manual Testing Only)

### Summary

- Implement an additive related-incidents API that takes `incidentId`, traverses the full connected chain (parent + child directions), and returns `currentIncident` plus flattened `relatedIncidents`.
- Wire the incident page to consume this API and render:

1. A read-only related incidents list in the right/bottom panel.
2. Current + related incident boundaries on the map, with lower opacity for related incidents.

- Add page-level constants to toggle each new behavior independently.
- Keep all existing APIs and current UI behavior backward compatible when new flags are off.
- Do not add test files/scripts; validation will be manual only.

### Implementation Changes

- API layer (`siteIncident` router + service):

1. Add `getRelatedIncidentsPublic` (input: `{ incidentId: cuid }`, output: `{ status, data: { currentIncident, relatedIncidents } }`).
2. Add a service method that resolves the connected component using BFS with `visited` set and same-site guard:

- Neighbor rule: incidents where `id IN frontier` or `relatedIncidentId IN frontier`.
- Handle all 3 requested cases automatically (only parent links, only child links, both).
- Prevent cycles and ignore cross-site links.

3. Return `currentIncident` as the input incident object, and `relatedIncidents` as all other chain incidents (stable order by `startedAt desc`).
4. Keep existing endpoints unchanged; this is additive only.

- Incident page orchestration (`[incidentId].tsx`):

1. Keep `getIncidentPublic` query as-is for current behavior.
2. Add parallel query to `getRelatedIncidentsPublic`.
3. Build normalized incident collections:

- `currentIncident`
- `relatedIncidents`
- `allIncidents = [current, ...related]`
- `combinedAlerts` (deduped by alert id across all incidents)

4. Graceful fallback: if related query fails, page still renders current incident exactly as today.

- Right/bottom panel UI:

1. Add a read-only “Related Site Incidents” section after existing summary/detection/location/action content.
2. Each row shows minimal fields: status, started/latest timestamp, fire count, incident id.
3. No navigation/action buttons (as requested).

- Map rendering (`MapComponent` reuse-first extension):

1. Extend props with optional multi-incident data (additive props only; existing single-incident props remain valid).
2. Render individual boundaries for all incidents:

- Current incident style stays prominent.
- Related incidents use reduced fill/line opacity.

3. Add optional combined boundary (from all fires in current + related), shown together with individual boundaries.
4. Keep marker behavior compatible with current selection logic.

- Incident summary (`IncidentSummary`):

1. Add optional combined inputs (or combined alerts) without replacing existing props.
2. Keep current “Total Fires” and “Area Affected” untouched for current incident.
3. Append a new section “For Combined Incidents” showing:

- Combined total fires
- Combined area affected

4. Section renders only when flag is on and related incidents exist.

- Feature flags/constants (easy disable):

1. Add incident-page constants (single place) with defaults `true`:

- `SHOW_RELATED_INCIDENTS_LIST`
- `SHOW_RELATED_INCIDENTS_ON_MAP`
- `SHOW_COMBINED_INCIDENT_BOUNDARY`
- `SHOW_COMBINED_INCIDENT_SUMMARY`

2. Wire flags in page composition so each feature can be disabled independently without API changes.

### Manual Verification Checklist (No Test Scripts)

1. API returns correct chain for:

- Child-only upward links.
- Parent-only downward links.
- Incident with both parent and child links.

2. API does not loop on cyclic relations and does not leak cross-site incidents.
3. Incident page still works when only current incident exists (no related incidents).
4. Related list appears only when related incidents exist and flag is enabled.
5. Map shows current + related boundaries with correct visual emphasis.
6. Combined boundary appears only when enabled and uses all combined fire points.
7. IncidentSummary keeps original metrics and adds combined metrics section correctly.
8. Turning flags off reverts behavior to current production-like display.

### Assumptions and Defaults

- Related scope includes active + resolved incidents in the connected chain for the same site.
- New API is public (matching public incident page use case); existing protected endpoints remain unchanged.
- Combined alert aggregation dedupes by alert id before computing totals/area.
- Plan file path for this implementation spec: `.codex/plans/site-incident-related-chain-ui-implementation.plan.md`.
