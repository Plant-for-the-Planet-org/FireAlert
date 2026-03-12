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
### Status
Resolved in cleanup pass:
- Removed duplicate, inactive notification services under `apps/server/src/Services/SiteIncident/*`.
- Retained canonical notification path under `apps/server/src/Services/Notifications/*`.

## Gap 3: Interface and enum drift
### Status
Resolved in cleanup pass:
- Removed stale incident notification enum definitions from `apps/server/src/Interfaces/SiteIncident.ts`.
- Kept runtime status source of truth in Prisma `NotificationStatus`.

## Gap 4: Stale integration helper
### Status
Resolved in cleanup pass:
- Removed stale helper `apps/server/src/Services/SiteIncident/integration.ts`.
- Canonical incident lifecycle entrypoints remain `SiteIncidentService` + `site-incident-manager` CRON.

## Gap 5: Environment/config drift
### Status
Resolved in cleanup pass:
- Removed unused `ENABLE_INCIDENT_NOTIFICATIONS` from env schema and `.env.sample`.
- Removed duplicate `INCIDENT_RESOLUTION_HOURS` entry from `.env.sample`.
- Updated fire-incident docs to align with current env/runtime behavior.

## Gap 6: Documentation naming mismatch
Some spec references mention `server/api/schemas`, runtime uses `server/api/zodSchemas`.

### Effect
- minor onboarding friction for new contributors/tools

## Practical refactor priority order
1. Decide incident-linking mode:
   - inline during alert creation
   - or manager-CRON-only
2. Keep this gap doc updated as each item is resolved.
