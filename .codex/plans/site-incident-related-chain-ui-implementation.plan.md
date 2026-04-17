# Site Incident Related Chain UI Implementation Plan

## Summary

- Add a public related-incidents API that returns `currentIncident` + flattened `relatedIncidents` for an input `incidentId`.
- Traverse parent/child links in both directions recursively and keep traversal site-safe.
- Update incident page to show related incidents list, related map boundaries, combined boundary, and combined summary metrics.
- Keep all existing API behavior backward compatible and gate new UI via incident page feature flags.
- Validation is manual only; no test scripts/files.

## Implementation Notes

- API route: `siteIncident.getRelatedIncidentsPublic`.
- Traversal rule: fetch neighbors with `id IN frontier` or `relatedIncidentId IN frontier`, scoped to current site.
- UI additions:
  - Read-only related incidents list in right/bottom panel.
  - Current + related boundaries on map (related with lower opacity).
  - Optional combined boundary over all fires (current + related).
  - Optional combined metrics section in `IncidentSummary`.
- Feature toggles in `apps/server/src/pages/incident/featureFlags.ts`:
  - `SHOW_RELATED_INCIDENTS_LIST`
  - `SHOW_RELATED_INCIDENTS_ON_MAP`
  - `SHOW_COMBINED_INCIDENT_BOUNDARY`
  - `SHOW_COMBINED_INCIDENT_SUMMARY`
