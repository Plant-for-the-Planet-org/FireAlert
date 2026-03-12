# Fire Incident Cleanup Plan (Behavior-Preserving)

## Summary
This plan will clean up dead fire-incident code paths, stale references, noisy logs, and debug artifacts while preserving runtime behavior. The canonical implementation will remain:
- Incident/domain lifecycle: `SiteIncidentService` + `site-incident-manager` CRON
- Notifications: `Services/Notifications/*` method-split routing
- Existing API endpoints and mobile/web feature behavior unchanged

## Implementation Plan

## 1. Remove clearly unused fire-incident artifacts
- Delete `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/SiteIncident/CreateIncidentNotifications.ts`.
- Delete `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/SiteIncident/SendIncidentNotifications.ts`.
- Delete `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/SiteIncident/NotificationBoundaryService.ts`.
- Delete `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/SiteIncident/integration.ts`.
- Delete `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/SiteIncident/StateManagement.ts`.
- Delete `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/SiteIncident/errors.ts`.
- Delete `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/pages/api/cron/geo-event-fetcher.ts.backup`.
- Delete `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/pages/incident/requirement.txt`.
- Move or remove `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/server/api/routers/dev/site-incident-test-cases.txt` from source-tree code area into docs (or remove if redundant with docs).

## 2. Prune stale interfaces and unused exports
- Update `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Interfaces/SiteIncident.ts` to keep only currently used types and remove unused/incorrect enum drift (`START`/`END` enum and unused imports).
- Update `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Interfaces/SiteIncidentNotifications.ts` to remove unused types (`IncidentNotificationType`, `ProcessResult` if unreferenced).
- Reduce `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/repositories/siteIncident.ts` to only exports that are actually used by router code (currently `getIncidentById`), or move router usage directly to service/repository class and remove dead helper exports.

## 3. Clean notification services and references (canonical path only)
- Refactor `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/Notifications/CreateIncidentNotifications.ts` to remove `any`-heavy dead vars and keep strongly typed queue creation.
- Refactor `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/Notifications/SendIncidentNotifications.ts` to remove unreachable method branches and TODO comments that no longer apply.
- Refactor `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/Notifications/CreateNotifications.ts` to remove stale comments/unused variables from old cooldown logic.
- Update `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/Notifications/NotificationRoutingConfig.ts` to remove unused helpers and unsafe casts.

## 4. Logging cleanup (server + mobile)
- Update `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/server/logger.ts`:
- Route `debug` to `Logtail.debug` (not `info`).
- Use level-appropriate console fallback (`console.debug/info/warn/error`).
- In incident-related server code, keep only high-signal `info` logs (job start/end summaries) and move verbose per-item/per-batch logs to `debug`.
- Remove direct `console.*` where logger should be used in incident server files, including `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/server/api/routers/siteIncident.ts`.
- Remove incident debug spam from mobile:
- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/hooks/incident/useIncidentData.ts`
- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/utils/incident/incidentCircleUtils.ts`
- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/Home.tsx`
- Remove duplicated debug overlay blocks and JSX inline `console.log(...)` side-effects in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/Home.tsx`.

## 5. Fix fire-incident mobile type drift introduced by debug code
- Fix conflicting props typing in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/components/Incident/IncidentSummaryCard.tsx` (currently duplicated/invalid `IncidentSummaryCardProps` declaration).
- Ensure incident components use a single canonical type source from `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/types/incident.ts`.

## 6. Remove unused incident env flag and sample drift
- Remove `ENABLE_INCIDENT_NOTIFICATIONS` from `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/env.mjs` since method-split path is always active and legacy integration file is being removed.
- Remove `ENABLE_INCIDENT_NOTIFICATIONS` from `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/.env.sample`.
- Deduplicate repeated `INCIDENT_RESOLUTION_HOURS` entries in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/.env.sample`.

## 7. Sync fire-incident docs with cleaned architecture
- Update `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/docs/fire-incident/implementation-reference.md` to remove deleted paths and env flag references.
- Update `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/docs/fire-incident/spec-vs-implementation-gaps.md` to mark duplicate-notification-path and stale-integration gaps as resolved after cleanup.
- Keep `.kiro/specs/*` as historical specs; do not rewrite spec intent.

## Public API / Interface Changes
- No route changes to existing CRON endpoints or tRPC procedures.
- Internal interface cleanup only:
- `SiteIncident` TS interfaces trimmed to used/runtime-aligned definitions.
- `SiteIncidentNotifications` TS interfaces trimmed to used definitions.
- Environment contract change:
- `ENABLE_INCIDENT_NOTIFICATIONS` removed from env schema and sample (unused flag removal).

## Test Cases and Validation Scenarios
1. Static reference validation:
- Run `rg` checks to ensure deleted files are no longer imported/referenced.
2. Server lint on touched files:
- Run targeted eslint on touched server incident/notification/cron/router/logger files.
3. Mobile lint on touched files:
- Run targeted eslint on incident hook/utils/component/Home screen files.
4. Runtime behavior smoke checks:
- Trigger `/api/cron/notification-creator` and verify both counters still returned.
- Trigger `/api/cron/notification-sender` and verify both counters still returned.
- Trigger `/api/cron/site-incident-manager` and verify linking/resolution response shape unchanged.
5. UI smoke checks:
- Web incident page still renders summary + circle.
- Mobile alert modal still shows incident summary and circle for alerts with `siteIncidentId`, and alert-only behavior for alerts without it.

## Assumptions and Defaults
- Chosen default: behavior-preserving cleanup only (no flow refactor).
- Chosen default: aggressively delete clearly unused fire-incident files.
- Existing repo-wide TypeScript debt outside touched fire-incident scope remains out of scope.
- Legacy/refactored geo-event-fetcher behavior remains unchanged in this cleanup.
