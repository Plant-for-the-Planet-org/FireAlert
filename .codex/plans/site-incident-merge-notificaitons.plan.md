## Site Incident Merge-Notification Upgrade Plan

### Summary

Upgrade the active incident notification pipeline to support merge-aware messaging and eligibility gating, while keeping the current cron orchestration model. Add an explicit eligibility service (SOLID, reusable later by alert notifications), skip END notifications for single-alert incidents, introduce merge-specific notification statuses/content, and suppress parent END notifications when a merged child represents the combined closure.

### Implementation Changes

- Refactor incident notification creation flow in [CreateIncidentNotifications.ts](/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Services/Notifications/CreateIncidentNotifications.ts) to use a dedicated eligibility service per incident before queueing notifications.
- Add `IncidentNotificationEligibilityService` under `Services/Notifications` with clear decision outputs (`eligible`, `reason`, `notificationKind`, `isMergedChild`, `isParentWithChild`, `aggregateSummary`), so it can be reused later by alert notification flow.
- Eligibility rules implemented in creator flow:
  - Skip END notification if incident has exactly one linked alert.
  - Skip END notification for parent incidents (`relatedIncidentId != null`) so merged-chain closure sends only one END notification.
  - Keep START eligibility unchanged except merge classification.
  - Continue STOP_ALERTS suppression as highest-priority skip.
- Merge detection/classification in creator:
  - Detect merged child via `parentIncidents` existence (or equivalent robust relation check).
  - For merged child START, queue merge-specific START status + merge-specific metadata type.
  - For merged child END, queue merge-specific END status + aggregated chain summary metadata.
- Aggregate summary logic for merged child END:
  - Traverse full related component (both directions through parent/child links).
  - Aggregate `detectionCount` as total alerts across related incidents.
  - Compute merged duration from earliest `startedAt` to latest `endedAt`.
  - Include merged incident count/parent count in metadata for message rendering.
- Update sender flow in [SendIncidentNotifications.ts](/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/Services/Notifications/SendIncidentNotifications.ts):
  - Read and process both existing and merge scheduled statuses.
  - Transition each scheduled status to its matching sent status.
  - Construct messages based on metadata notification type (normal start/end vs merge start/end), with dedicated merge wording and aggregated merged END summary.
- Update cron orchestration response/logging in [notification-creator.ts](/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/pages/api/cron/notification-creator.ts) to expose merge/eligibility counters from incident creator output (created merge start/end, skipped single-alert END, skipped parent END, skipped STOP_ALERTS).
- Keep implementation scope to active runtime path only (`Services/Notifications/*`), leaving legacy duplicate `Services/SiteIncident/*` notification services untouched.

### Public APIs / Interfaces / Schema

- Update `NotificationStatus` enum in [schema.prisma](/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/prisma/schema.prisma) with merge lifecycle states:
  - `MERGE_START_SCHEDULED`, `MERGE_START_SENT`, `MERGE_END_SCHEDULED`, `MERGE_END_SENT`.
- Expand incident notification metadata typing (`Interfaces/SiteIncidentNotifications.ts`) to include merge types and aggregated fields:
  - New types: `INCIDENT_MERGE_START`, `INCIDENT_MERGE_END`.
  - New fields: merged counts and aggregated duration/detection summary.
- Update creator return contract from incident notification service to structured stats object (instead of plain number), consumed by cron response/logging.
- Keep DB migration/type generation out of scope for execution; schema file changes only.

### Test Plan

- Normal non-merge START incident still creates and sends standard START notification.
- Single-alert incident END is skipped and incident is marked processed (no repeated retries).
- Normal multi-alert incident END still creates/sends standard END notification.
- Merged child START creates/sends merge START status and merge-specific content.
- Resolved merged chain creates exactly one END notification for child; parent END notifications are skipped/processed.
- Merged child END message contains aggregated summary (total detections, merged duration, merged incident count).
- Sender transitions all four status families correctly:
  - `START/END` scheduled -> sent.
  - `MERGE_START/MERGE_END` scheduled -> sent.
- STOP_ALERTS suppression continues to block all incident notification variants (normal + merge).
- Cron response from `notification-creator` includes new incident-eligibility/merge counters and correct totals.

### Assumptions and Review Notes

- Chosen decisions:
  - Active path only (`Services/Notifications/*`).
  - Merge-specific statuses for both START and END.
  - Merged END summary is aggregated across full related component.
- Parent suppression for END is based on relation linkage (`relatedIncidentId` present), with child notification acting as canonical combined closure message.
- `notificationStatus` remains the canonical sender scheduling mechanism; metadata type drives message template selection.
- Schema changes will be made only in `.prisma`; migration creation/execution and Prisma generate are user-managed.
