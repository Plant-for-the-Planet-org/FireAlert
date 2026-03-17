**Title:** Stop Alerts + Unsubscribe + ReviewStatus Alignment

**Summary**

- Suppress all future incident and siteAlert notifications when `reviewStatus = STOP_ALERTS`.
- Add unsubscribe links for incident emails.
- Align reviewStatus values across server, schema validation, and client types to Prisma enum.
- Scan and update any Prisma `Site` relation usage from `incidents` to `siteIncidents` (none found so far).

**Implementation Changes**

- **Notification creation gating**
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/Notifications/CreateIncidentNotifications.ts`
    - Import `SiteIncidentReviewStatus` from Prisma.
    - When building the queue, skip any incident with `reviewStatus = STOP_ALERTS`.
    - Count skipped notifications by method (email/sms/whatsapp) and log a single summary line at end.
    - Still mark incidents as processed, so they won’t retry.
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/Notifications/CreateNotifications.ts`
    - Extend `siteAlert.findMany` select to include `siteIncident { reviewStatus }`.
    - If `siteIncident?.reviewStatus === STOP_ALERTS`, skip building notifications for that alert.
    - Count skipped notifications by method (device/webhook) and log a summary line at end.
    - Keep siteAlerts marked as processed (no API response changes).
- **Unsubscribe link for incident emails**
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/Notifications/SendIncidentNotifications.ts`
    - Add unsubscribe token generation for email notifications (mirror `SendNotifications.ts`).
    - Pass `unsubscribeToken` into `NotificationParameters` so EmailNotifier renders the link.
- **Stop-alert API via review status**
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/server/api/zodSchemas/siteIncident.schema.ts`
    - Replace custom string enum with `z.nativeEnum(SiteIncidentReviewStatus)` so `STOP_ALERTS` is accepted.
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/server/api/routers/siteIncident.ts`
    - Keep `updateIncidentReviewStatus` but allow `STOP_ALERTS` via updated schema.
    - Continue permission checks as-is.
- **ReviewStatus alignment to Prisma enum**
  - Update server types and defaults to use Prisma enum values (`TO_REVIEW`, `STOP_ALERTS`).
  - Update client type(s) that still expect lowercase values.
  - Files likely touched:
    - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Interfaces/SiteIncident.ts`
    - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/server/src/Services/SiteIncident/SiteIncidentRepository.ts`
    - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/types/incident.ts`
- **Prisma `Site` relation refactor**
  - Re-scan for `site.incidents` usage and replace with `site.siteIncidents` wherever present.
  - Current repo scan found no references, so this is likely a no-op.

**Test Plan**

1. Create/identify a SiteIncident, set `reviewStatus = STOP_ALERTS`, run notification cron, verify:
   - No new incident notifications created.
   - No device/webhook notifications created for siteAlerts linked to that incident.
   - Logs show skipped counts per method.
2. Send an incident email and confirm the unsubscribe link appears and works.
3. Call `updateIncidentReviewStatus` with `STOP_ALERTS` and confirm it persists.
4. Sanity-check any client code that displays review status still renders correctly.

**Assumptions**

- `STOP_ALERTS` should suppress all future incident and siteAlert notifications tied to the incident.
- The canonical review status values are Prisma’s enum values (`TO_REVIEW`, `STOP_ALERTS`).
- No API response shapes will change; only logs are added.
