# Tasks: Fire Incident Notification System

This task list tracks the implementation of the notification system updates defined in `implementation-plan.md`.

## Phase 1: Foundation & Type Safety

- [ ] 1.1 Define Core Interfaces

  - Create `apps/server/src/Interfaces/SiteIncidentNotifications.ts`
  - Define `IncidentNotificationMetadata` (discriminated union for START/END)
  - Define `NotificationQueueItem`
  - Define `ProcessResult` interfaces for services

- [ ] 1.2 Verify Prisma Type Generation
  - Ensure `SiteIncident` and `Notification` models in `schema.prisma` generate correct TypeScript definitions (specifically `notificationStatus` enum).

## Phase 2: Notification Creator Service (SRP: Creation Logic Only)

- [ ] 2.1 Implement `CreateIncidentNotifications` Service Class

  - File: `apps/server/src/Services/Notifications/CreateIncidentNotifications.ts`
  - Implement `processUnprocessedIncidents` method (Fetch logic)
  - Implement `createNotificationQueue` method (Business logic: AlertMethod filtering, counting)
  - Implement `executeTransaction` method (Data persistence)
  - Ensure strict typing for all method inputs/outputs

- [ ] 2.2 Refactor Cron Handler
  - Update `apps/server/src/pages/api/cron/notification-creator.ts`
  - Replace legacy `createNotifications` call with `CreateIncidentNotifications.run()`
  - Ensure proper error logging and handling

## Phase 3: Notification Sender Service (SRP: Sending Logic Only)

- [ ] 3.1 Implement `SendIncidentNotifications` Service Class

  - File: `apps/server/src/Services/Notifications/SendIncidentNotifications.ts`
  - Implement `fetchScheduledNotifications` method
  - Implement `MessageFactory` class or helpers (Separation of concerns: Message construction vs Sending)
    - `constructStartMessage(incident, site)`
    - `constructEndMessage(incident, site)`
  - Implement `dispatchNotifications` method (Interaction with `NotifierRegistry`)
  - Implement `updateNotificationStatus` method

- [ ] 3.2 Refactor Cron Handler
  - Update `apps/server/src/pages/api/cron/notification-sender.ts`
  - Replace/Update legacy logic to use `SendIncidentNotifications.run()`

## Notes

- Follow strict TypeScript configuration (no `any`).
- Use `logger` for all Cron activities.
- Ensure `isProcessed` flag is handled atomically where possible.
