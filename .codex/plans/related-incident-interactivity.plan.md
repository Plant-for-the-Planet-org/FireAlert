## Related-Incident Map Focus UX

### Summary

- Keep the incident-merging backend exactly as-is. This is a frontend-only, backward-compatible enhancement on the public incident page.
- Add a shared related-incident focus state so hovering a sidebar card highlights that incident on the map and reveals its fire points.
- Use `hover + tap focus`: desktop hover is temporary; click/tap/keyboard focus keeps the same highlight while the card remains focused.

### Key Changes

- In [incident page](/Users/rupamkairi/Projects/Plant-for-the-Planet/FireAlert/apps/server/src/pages/incident/[incidentId].tsx), add two local states: `hoveredRelatedIncidentId` and `focusedRelatedIncidentId`, then derive `activeRelatedIncidentId = hoveredRelatedIncidentId ?? focusedRelatedIncidentId ?? null`.
- Pass `activeRelatedIncidentId` into both the list and the map. Do not change the TRPC query, Prisma schema, or the existing `relatedIncidents` data shape; the current query already includes `id`, `isActive`, and `siteAlerts`, which is enough.
- In [RelatedIncidentsList](/Users/rupamkairi/Projects/Plant-for-the-Planet/FireAlert/apps/server/src/Components/FireIncident/RelatedIncidentsList.tsx), keep `incidents` unchanged and add optional props for `activeIncidentId`, `onIncidentHoverChange`, and `onIncidentFocusChange`.
- Render each related-incident card as a focusable button-like surface so it supports:
  - `onMouseEnter` => set hovered incident id
  - `onMouseLeave` => clear hovered incident id
  - `onFocus` => set focused incident id
  - `onBlur` => clear focused incident id
- Give the active card a subtle stronger border/background so the sidebar and map feel connected, but do not change layout or card content.
- In [MapComponent](/Users/rupamkairi/Projects/Plant-for-the-Planet/FireAlert/apps/server/src/Components/FireIncident/MapComponent.tsx), add an optional `activeRelatedIncidentId` prop.
- Reuse existing `relatedIncidentBoundaries` to derive the focused related incident and update rendering rules:
  - When no related incident is active, render exactly as today.
  - When one is active, keep all related polygons visible, but increase fill/line opacity and line width only for the active one.
  - Render fire markers only for the active related incident, using non-interactive markers so current-incident marker clicks remain unchanged.
  - Color those temporary fire markers by incident status: orange for active, gray for resolved.
- Keep current map bounds logic and feature-flag behavior unchanged. Hover/focus must not auto-pan or auto-zoom the map.

### Public Interfaces

- Additive only:
  - `RelatedIncidentsListProps.activeIncidentId?: string | null`
  - `RelatedIncidentsListProps.onIncidentHoverChange?: (incidentId: string | null) => void`
  - `RelatedIncidentsListProps.onIncidentFocusChange?: (incidentId: string | null) => void`
  - `MapComponentProps.activeRelatedIncidentId?: string | null`
- No breaking changes to existing callers, APIs, DB schema, or feature flags.

### Test Plan

- Desktop hover: hovering each related-incident card highlights only its polygon and shows only its fires; leaving the card restores the current default map view.
- Keyboard/touch: tabbing to or clicking/tapping a card produces the same highlight; moving focus to another card switches the highlight; blur clears it.
- Regression checks: current incident markers still select alerts; combined incident boundary and existing related-boundary rendering still work; pages with no related incidents or related incidents with no fires remain unchanged.
- Validation command after implementation: run direct ESLint from `apps/server` on the touched files. Do not rely on `yarn workspace @firealert/server lint`, because that wrapper currently fails in this workspace due to the existing `next lint` invocation.

### Assumptions

- Apply the behavior to every row shown in “Connected incidents”, not only strict parent nodes, because the public UI consumes a generic related-incident chain.
- The effect is intentionally additive: no schema changes, no router changes, no new persistence, and no sticky map selection beyond normal hover/focus behavior.
- Manual QA on the incident page is the primary behavioral verification path for this change.
