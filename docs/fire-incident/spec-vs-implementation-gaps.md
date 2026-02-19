# Spec vs Implementation Gaps

This document isolates the main differences between intended design and current runtime behavior.

## Gap 1: Incident association timing
### Spec intent
Incident association should occur directly in alert creation flow.

### Current implementation
In refactored pipeline wiring, `SiteAlertService` is instantiated without `SiteIncidentService` in `apps/server/src/pages/api/cron/geo-event-fetcher.ts`.
Incident linking and inactivity resolution are handled by `apps/server/src/pages/api/cron/site-incident-manager.ts`.

### Effect
- incident linkage may be delayed until manager CRON runs
- weaker same-transaction guarantees than intended model

## Gap 2: Two incident-notification implementations coexist
### Current state
- Active path in CRON uses:
  - `apps/server/src/Services/Notifications/CreateIncidentNotifications.ts`
  - `apps/server/src/Services/Notifications/SendIncidentNotifications.ts`
- Additional path exists but is not active in CRON:
  - `apps/server/src/Services/SiteIncident/CreateIncidentNotifications.ts`
  - `apps/server/src/Services/SiteIncident/SendIncidentNotifications.ts`
  - `apps/server/src/Services/SiteIncident/NotificationBoundaryService.ts`

### Effect
- unclear canonical implementation for future edits
- higher risk of divergence and duplicate fixes

## Gap 3: Interface and enum drift
`apps/server/src/Interfaces/SiteIncident.ts` defines statuses (`START`, `END`) that do not match Prisma `NotificationStatus` scheduling states (`START_SCHEDULED`, `END_SCHEDULED`).

### Effect
- confusing type semantics during extension work

## Gap 4: Stale integration helper
`apps/server/src/Services/SiteIncident/integration.ts` references methods and singleton usage patterns that do not align with current `SiteIncidentService` implementation shape.

### Effect
- not safe as integration template without refactor

## Gap 5: Environment/config drift
- `ENABLE_INCIDENT_NOTIFICATIONS` exists in env schema, but method-split CRON currently runs both paths without branching on this flag.
- `.env.sample` has duplicate `INCIDENT_RESOLUTION_HOURS` entries.
- docs in repository mention flags not present in env schema (`ENABLE_INCIDENT_PROCESSING`, `INCIDENT_BATCH_SIZE`).

### Effect
- rollout and operations confusion across environments

## Gap 6: Documentation naming mismatch
Some spec references mention `server/api/schemas`, runtime uses `server/api/zodSchemas`.

### Effect
- minor onboarding friction for new contributors/tools

## Practical refactor priority order
1. Choose one canonical incident-notification code path and deprecate the other.
2. Decide incident-linking mode:
   - inline during alert creation
   - or manager-CRON-only
3. Align shared interfaces/enums with Prisma/runtime statuses.
4. Normalize env/sample/docs to current operational behavior.
5. Keep this gap doc updated as each item is resolved.
