## Consolidated Plan: Y-Merge Incident Lineage + Merge Notifications (Server)

### Summary

This plan combines and normalizes `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/.codex/plans/Y-merge-incidents-0.md`, `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/.codex/plans/Y-merge-incidents-1.md`, and `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/.codex/plans/Y-merge-incidents-2.md` into one implementation-ready spec.

Key normalized behavior:

1. `source + merged` in proximity: keep existing merged, no new merged row.
2. `source only` in proximity (merged not in range): attach to source.
3. `merged + merged` in proximity: create a new merged incident and chain both as sources.
4. Merge notifications use new statuses `MERGE_SCHEDULED` and `MERGE_SENT`, with message `Multiple incidents converged`.
5. One merge event fan-out per merge action (normal per-user/per-method delivery).

---

## Locked Product Rules

1. Merge trigger for this phase is proximity multi-match in one run (`INCIDENT_PROXIMITY_KM`), not contour persistence/vector alignment.
2. Historical alerts stay attached to original source incidents.
3. Source incidents remain active while parent merged is active.
4. If merged parent closes by inactivity, descendants/sources close with it.
5. Active incident APIs continue returning all active incidents.

---

## Public API / Interface / Type Changes

1. Extend `SiteIncident` scalars and lineage relations in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/prisma/schema.prisma`.
2. Extend `NotificationStatus` enum in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/prisma/schema.prisma`:
3. `MERGE_SCHEDULED`
4. `MERGE_SENT`
5. Extend incident types in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Interfaces/SiteIncident.ts`:
6. `mergedIncidentId?: string | null`
7. `mergedAt?: Date | null`
8. `isMergedIncident: boolean`
9. Extend metadata types in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Interfaces/SiteIncidentNotifications.ts`:
10. `type: 'INCIDENT_START' | 'INCIDENT_END' | 'INCIDENT_MERGE'`
11. Add `mergeSourceCount?: number`
12. `getActiveIncidents` shape remains plural and unchanged in contract at `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/server/api/routers/siteIncident.ts`.

---

## Database Design (Detailed)

### `SiteIncident` additions

1. `mergedIncidentId String?`
2. `mergedAt DateTime?`
3. `isMergedIncident Boolean @default(false)`

### `SiteIncident` self-relation

1. `mergedIncident SiteIncident? @relation("IncidentMergeLineage", fields: [mergedIncidentId], references: [id], onDelete: SetNull)`
2. `sourceIncidents SiteIncident[] @relation("IncidentMergeLineage")`

### New semantic states

1. Root incident: `mergedIncidentId = null`
2. Source incident: `mergedIncidentId != null`
3. Merge-result incident: `isMergedIncident = true`
4. A merged incident can later become a source (`isMergedIncident = true` and `mergedIncidentId != null`) to support descendant chains.

### Constraints and indexes

1. FK: `mergedIncidentId -> SiteIncident.id ON DELETE SET NULL`
2. Check: `mergedIncidentId IS NULL OR mergedIncidentId <> id`
3. Index: `@@index([siteId, isActive])`
4. Index: `@@index([mergedIncidentId, isActive])`
5. Index: `@@index([siteId, isActive, isMergedIncident])`

### Notification enum changes

1. Add `MERGE_SCHEDULED`
2. Add `MERGE_SENT`

### Migration

1. Create one migration folder: `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/prisma/migrations/<timestamp>_incident_merge_lineage_and_merge_status/`.
2. Backfill defaults are safe for existing data: all existing incidents remain roots and non-merged.

---

## Merge Processing Logic (Decision Complete)

### Step A: Candidate retrieval

1. Query active incidents for same site within `INCIDENT_PROXIMITY_KM` using latest alert point distance.
2. Sort by:
3. distance asc
4. `updatedAt` desc
5. `startedAt` asc
6. `id` asc (final deterministic tie-break)

### Step B: Lineage collapse within current candidate set

1. Group candidates by lineage root (ancestor with `mergedIncidentId = null`).
2. Pick one representative per group:
3. if group contains merged incidents, representative = nearest merged in that group
4. else representative = nearest source/non-merged in that group

This avoids false “new merge” when source and its own merged ancestor are both in range.

### Step C: Action matrix (post-collapse)

| Representatives           | Action                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| 0                         | Create normal incident                                                                                |
| 1 source                  | Associate alert to source; touch ancestor `updatedAt` chain                                           |
| 1 merged                  | Associate alert to merged                                                                             |
| >=2 with exactly 1 merged | Keep that merged; absorb other representatives into it; associate alert to kept merged                |
| >=2 with >=2 merged       | Create new merged incident; absorb all representatives into new merged; associate alert to new merged |
| >=2 with 0 merged         | Create new merged incident; absorb all representatives into new merged; associate alert to new merged |

### Absorb semantics

1. For each absorbed representative:
1. set `mergedIncidentId = targetMergedId`
1. set `mergedAt = now`
1. keep `isActive = true`
1. keep historical `siteAlerts` untouched
1. If absorbed representative is itself merged, its descendants remain attached to it, preserving full descendant chain.

### Merge event definition

1. A merge event happens only when lineage links change (absorption/new merged creation).
2. Simple association to an already-related merged incident is not a merge event.

---

## Backend Implementation Plan by File

1. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Services/SiteIncident/SiteIncidentRepository.ts`
1. Add `findActiveIncidentsWithinProximity(...)` returning all candidates.
1. Add lineage ancestry helpers to compute root and descendants.
1. Add transactional methods:
1. `associateAlertAndTouchAncestors(...)`
1. `absorbIntoExistingMergedAndAssociate(...)`
1. `createMergedIncidentFromRepresentativesAndAssociate(...)`
1. Add recursive descendant close operation for root closure.
1. Add idempotency guard by locking alert row and returning early if `siteIncidentId` already set.

1. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Services/SiteIncident/SiteIncidentService.ts`
1. Replace nearest-single branch with matrix above.
1. Keep stale candidate resolution safeguard.
1. Ensure source-only association bumps ancestor `updatedAt`.

1. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/pages/api/cron/site-incident-manager.ts`
1. Keep existing order.
1. Add merge counters in response/logs:
1. `mergeEvents`
1. `newMergedIncidents`
1. `absorbedIncidents`
1. `descendantClosures`

1. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Services/Notifications/CreateIncidentNotifications.ts`
1. Filter start/end creator to roots only (`mergedIncidentId = null`) so descendants do not emit start/end boundary notifications.
1. Keep existing START/END scheduling behavior for roots.

1. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Services/Notifications/SendIncidentNotifications.ts`
1. Include `MERGE_SCHEDULED` in fetch.
1. Add merge message branch for metadata type `INCIDENT_MERGE`.
1. Transition `MERGE_SCHEDULED -> MERGE_SENT`.

1. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/server/api/routers/siteIncident.ts`
1. Keep active endpoint plural semantics.
1. Ensure lineage fields are returned in incident payloads (default scalar return).

1. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/docs/fire-incident/implementation-reference.md`
1. Replace nearest-only overlap note with full merge matrix.
1. Document lineage chain semantics and merge notification statuses.

---

## Notification Plan (Merge-Specific)

1. On each merge event, create merge notification rows immediately in merge transaction with:
1. `notificationStatus = MERGE_SCHEDULED`
1. metadata:
1. `type = INCIDENT_MERGE`
1. `incidentId = target merged incident`
1. `siteId`
1. `siteName`
1. `mergeSourceCount`
1. Message content: `Multiple incidents converged`
1. Delivery channels follow existing SiteIncident routing (`email`, `sms`, `whatsapp`).
1. No duplicate merge event for same alert because locked-alert idempotency prevents reprocessing.

---

## Lifecycle and Closure Rules

1. Resolve inactivity from root incidents (`mergedIncidentId = null`) only.
2. When a root closes, close all active descendants recursively in one transaction.
3. Root closure sets `isProcessed = false` to schedule END notification.
4. Descendant/source closures set `isProcessed = true` to suppress extra END notifications.
5. Source activity via source-only association must touch ancestor `updatedAt` to keep active parent chain alive.

---

## Edge Case Matrix

1. Alert already linked to an incident: return existing association, no merge side effects.
2. Equal-distance candidates: deterministic tie-break order prevents non-deterministic merges.
3. Source and its merged ancestor both near: no new merge, attach to merged.
4. Source near but merged ancestor not near: attach to source.
5. One merged plus many sources: keep merged, absorb all sources.
6. Two merged plus sources: create one new merged, absorb all representatives.
7. Multiple candidates all in one existing chain: collapse to one representative, no new merge.
8. Candidate from different site accidentally included: blocked by site filter.
9. Inactive candidate present due stale state: stale guard resolves/rechecks before association.
10. Merge source already attached to target merged: no-op absorption update.
11. Concurrent manager runs: alert-row lock prevents duplicate merge creation.
12. Descendant loops/self-reference corruption: DB check plus defensive recursion guard.
13. Missing parent due external data issue: treat as root for safety and log warning.
14. No verified incident methods: merge event marks incident processing flow safely, no send rows.
15. Manual close on descendant incident: reject and require closing root to preserve lineage invariants.
16. Root merged active while descendants still receiving source-only alerts: ancestor `updatedAt` touch keeps root from false inactivity closure.

---

## Manual Validation Scenarios

1. Two non-merged active incidents + one new nearby alert -> new merged incident created.
2. Existing merged + new source converging -> keep merged, no new merged row.
3. Two merged incidents converging -> new merged incident created and both become sources.
4. Source-only proximity case -> alert attached to source.
5. Source+merged proximity case -> alert attached to merged.
6. Merge event sends one fan-out with `MERGE_SCHEDULED`, then sender marks `MERGE_SENT`.
7. Root inactivity closes descendant chain together; only root emits END notifications.
8. Active API still returns all active incidents with lineage fields.

---

## Assumptions and Defaults

1. `INCIDENT_PROXIMITY_KM` default remains `2`.
2. This pass does not implement contour-intersection persistence/vector checks.
3. No Prisma model/table is added for dedicated merge events; merge event data is in `Notification.metadata`.
4. Frontend contour work is out of scope for this merge planning pass.
