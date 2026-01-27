# Implementation Plan: Fire Incident Notifications

This document outlines the plan for implementing the notification system changes required for the Fire Incident Tracking feature. The goal is to transition from sending notifications for every `SiteAlert` to sending notifications at `SiteIncident` boundaries (Start and End).

## 1. Overview

The notification system will be refactored to consume `SiteIncident` data instead of raw `SiteAlert` data. This involves two main components:

1.  **Notification Creator**: Scans for `SiteIncident` state changes and triggers notification creation.
2.  **Notification Sender**: Delivers the created notifications with context-aware messages (Start vs. End).

## 2. Notification Creator System

**Current Implementation**: `apps/server/src/pages/api/cron/notification-creator.ts` and `CreateNotifications.ts` directly scan `SiteAlert`s.
**New Implementation**: A new service `CreateIncidentNotifications.ts` will be created, and the cron job will be updated to use it.

### Service: `CreateIncidentNotifications.ts`

**Responsibility**:

- Scan `SiteIncident` records that require notification processing.
- Generate `Notification` records for all valid alert methods.
- Update `SiteIncident` state to reflect that notifications have been scheduled.

**Logic Flow**:

1.  **Fetch Unprocessed Incidents**:

    - Query `SiteIncident` where `isProcessed` is `false`.
    - This covers two cases:
      - **Incident Start**: `isActive: true`, `isProcessed: false`.
      - **Incident End**: `isActive: false`, `isProcessed: false` (The mechanism closing the incident must reset `isProcessed` to `false`).

2.  **Determine Notification Type**:

    - For each incident:
      - If `isActive === true`: Type is `START`.
      - If `isActive === false`: Type is `END`.

3.  **Process per Incident**:

    - Retrieve associated `Site` and `User` (and their `AlertMethod`s).
    - **Notification Method Counter**: Initialize a counter for this site (Email, SMS, WhatsApp, etc.) to ensure balanced distribution (reusing existing logic).
    - **Iterate Alert Methods**:
      - For each verified and enabled method:
        - Create a **Notification Object**:
          - `siteAlertId`:
            - For `START`: Use `startSiteAlertId`.
            - For `END`: Use `endSiteAlertId` (or `latestSiteAlertId` if end is missing, though logic implies end requires one).
          - `alertMethod`: The method (email, sms, etc.).
          - `destination`: The phone/email.
          - `notificationStatus`:
            - `START_SCHEDULED` (if Type is START).
            - `END_SCHEDULED` (if Type is END).
          - `metadata`: JSON object containing:
            - `incidentId`: `SiteIncident.id`.
            - `type`: `INCIDENT_START` or `INCIDENT_END`.
            - `detectionCount` (for End summary).
            - `duration` (for End summary).

4.  **Transaction Execution**:
    - **Create Notifications**: Bulk create the `Notification` records.
    - **Update Incidents**:
      - Set `isProcessed: true`.
      - Link `startNotificationId` (if START) or `endNotificationId` (if END) to one of the created notifications (or the "primary" one). _Note: Schema stores one ID, but multiple notifications (per method) are created. Usually, we might just link the first one or leave it for tracking, or store array. Schema has single String. We will store the ID of the first notification created for traceability._
    - **Update Site**:
      - Update `lastMessageCreated` to `now()` (to maintain activity tracking).

### File Changes

- **Create**: `apps/server/src/Services/Notifications/CreateIncidentNotifications.ts`
- **Modify**: `apps/server/src/pages/api/cron/notification-creator.ts` to switch from `CreateNotifications` to `CreateIncidentNotifications`. (Old logic can be kept commented out or removed).

## 3. Notification Sender System

**Current Implementation**: `apps/server/src/pages/api/cron/notification-sender.ts` and `SendNotifications.ts` process generic notifications.
**New Implementation**: A new service `SendIncidentNotifications.ts` will be created (or `SendNotifications.ts` heavily modified) to handle the new statuses and message types.

### Service: `SendIncidentNotifications.ts`

**Responsibility**:

- Fetch pending notifications (`START_SCHEDULED`, `END_SCHEDULED`).
- Construct appropriate specific messages.
- Dispatch via `NotifierRegistry`.
- Update status.

**Logic Flow**:

1.  **Fetch Pending Notifications**:

    - Query `Notification` where `notificationStatus` IN [`START_SCHEDULED`, `END_SCHEDULED`] AND `isDelivered` is `false`.
    - Batch size: 10 (configurable).

2.  **Process per Notification**:

    - **Context Retrieval**:
      - Load `SiteAlert` and `SiteIncident` (via `metadata.incidentId` or traversing up relations).
    - **Message Construction**:
      - **START Notification**:
        - Subject: "🔥 Fire Incident Started: [Site Name]"
        - Body: "A new fire incident has been detected at [Site Name]. First detection at [Time]. Confidence: [Confidence]. location: [Lat, Long]."
        - Action Link: Link to Incident View (or Alert View).
      - **END Notification**:
        - Subject: "✅ Fire Incident Ended: [Site Name]"
        - Body: "The fire incident at [Site Name] has ended. Summary: Duration [X Hours], Total Detections: [Y]. Last detection at [Time]."
    - **Dispatch**:
      - Call `NotifierRegistry.get(method).notify(...)`.

3.  **Completion**:
    - **Success**:
      - Update `notificationStatus`:
        - `START_SCHEDULED` -> `START_SENT`.
        - `END_SCHEDULED` -> `END_SENT`.
      - Set `isDelivered: true`, `sentAt: now()`.
    - **Failure**:
      - Increment failure count.
      - Mark `isSkipped: true` (after retries or immediately depending on policy).

### File Changes

- **Create**: `apps/server/src/Services/Notifications/SendIncidentNotifications.ts`
- **Modify**: `apps/server/src/pages/api/cron/notification-sender.ts` to switch to `SendIncidentNotifications`.

## 4. Updates to Existing Files

### `apps/server/src/Services/Notifications/CreateNotifications.ts` (Legacy)

- **Status**: Deprecate.
- **Action**: Rename to `CreateNotifications_Legacy.ts` or keep it but stop calling it from the Cron handler.

### `apps/server/src/Services/Notifications/SendNotifications.ts` (Legacy)

- **Status**: Update or Deprecate.
- **Action**: It handles generic notifications. If `SiteIncident` notifications cover ALL fire alerts, this might be replaced. If there are other notifications, we might need to merge the logic. _Assumption based on prompt_: Focus on Incident Notifications logic.

### `apps/server/src/pages/api/cron/notification-creator.ts`

- **Action**: Update to import and call `createIncidentNotifications`.

### `apps/server/src/pages/api/cron/notification-sender.ts`

- **Action**: Update to import and call `sendIncidentNotifications`.

## 5. Schema Interaction (Prisma)

- **`SiteIncident`**:
  - `isActive` (Boolean)
  - `isProcessed` (Boolean) - **Crucial for triggering the Creator cron.**
  - `startNotificationId` / `endNotificationId`
- **`Notification`**:
  - `notificationStatus` (Enum: `START_SCHEDULED`, `START_SENT`, `END_SCHEDULED`, `END_SENT`)
  - `metadata` (Json)

## 6. Implementation Steps

1.  **Schema Check**: Verify `NotificationStatus` enum and `SiteIncident` fields exist (Should be done in migration phase).
2.  **Create `CreateIncidentNotifications.ts`**: Implement the creation logic.
3.  **Create `SendIncidentNotifications.ts`**: Implement the sending logic with message templates.
4.  **Update Cron Handlers**: Switch the API endpoints to use the new services.
5.  **Testing**:
    - Mock `SiteIncident` states.
    - Run Creator -> Verify Notifications created with correct Status.
    - Run Sender -> Verify Messages formatted correctly and Sent.
