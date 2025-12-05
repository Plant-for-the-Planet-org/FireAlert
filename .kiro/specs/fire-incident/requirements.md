# Requirements Document: Fire Incident Tracking

## Introduction

The Fire Incident Tracking feature introduces a new `SiteIncident` entity to group multiple fire detections (`SiteAlert` records) that occur within a defined activity period. Currently, the system sends notifications for each individual fire detection with a 2-hour cooldown, which results in either missed insights about fire progression or excessive notifications for long-running fires. This feature creates a historic record of fire incidents, tracks their lifecycle (start, active, end), and sends notifications at incident boundaries rather than for each detection, reducing notification fatigue while maintaining situational awareness.

## Glossary

### Database Entities.

- **GeoEvent** (Database Entity): A record of fire/heat anomaly detection from NASA's FIRMS API, created by the geo-event-fetcher CRON job
- **SiteAlert** (Database Entity): A record created when a GeoEvent falls within a user's Site geometry; represents a single fire detection at a specific location
- **SiteIncident** (Database Entity, yet to be created.): A new entity that groups multiple related SiteAlerts occurring within a defined time window (activity period) for a specific Site

### Feature Boundaries.

- **Activity Period**: A time window during which consecutive fire detections are considered part of the same incident; resets when no new detections occur for 6 hours
- **Incident Lifecycle**: The progression of a SiteIncident from creation (start), through active monitoring, to closure (end)
- **Notification Boundary**: Events that trigger notifications: incident start and incident end
- **Cooldown Period**: A 2-hour window during which no new notifications are sent for the same Site

### Process Flags.

- **isProcessed**: A boolean flag indicating whether a record has been processed by the relevant CRON job
- **isActive**: A boolean flag indicating whether a SiteIncident is currently active (ongoing fire activity)
- **notificationStatus**: A state field tracking the lifecycle of incident notifications with values: START_SCHEDULED, START_SENT, END_SCHEDULED, END_SENT

### Configuration.

- **Inactivity Threshold**: The duration (in hours) after which a SiteIncident with no new detections is considered ended; configurable via environment variable `INCIDENT_INACTIVITY_HOURS` (default: 6 hours)

### Notification Services.

- **Incident Notification**: A notification created at SiteIncident boundaries (START when incident begins, END when incident closes)
- **Notification Method Counter**: A tracking mechanism that counts available verified and enabled alert methods per site to ensure balanced notification distribution
- **Notification Metadata**: Additional data stored with incident notifications including incident type, incident ID, site name, detection count, and incident duration
- **Alert Method**: A communication channel (SMS, WhatsApp, Email, Device Push, Webhook) through which notifications are delivered to users
- **Notification Batch Processing**: Processing notifications in chunks to manage database load and rate limiting

## Requirements

### Requirement 1

**User Story:** As a forest manager, I want to receive notifications only at the start and end of fire incidents rather than for each individual detection, so that I can reduce notification fatigue while maintaining awareness of fire activity.

#### Acceptance Criteria

1. WHEN a GeoEvent is detected within a Site's geometry AND no active SiteIncident exists for that Site THEN the system SHALL create a new SiteIncident with isActive=true and send a start notification
2. WHEN a GeoEvent is detected within a Site's geometry AND an active SiteIncident exists for that Site THEN the system SHALL associate the SiteAlert with the existing SiteIncident and NOT send a notification
3. WHEN a SiteIncident has no new GeoEvent detections for the configured inactivity threshold THEN the system SHALL mark the SiteIncident as isActive=false and send an end notification
4. WHEN a SiteIncident is marked as isActive=false THEN the system SHALL prevent new SiteAlerts from being associated with that SiteIncident

### Requirement 2

**User Story:** As a system operator, I want to track the complete lifecycle of fire incidents with clear state transitions, so that I can monitor incident progression and ensure notifications are sent at appropriate boundaries.

#### Acceptance Criteria

1. WHEN a SiteIncident is created THEN the system SHALL record the startSiteAlertId, startedAt timestamp, and set isProcessed=false
2. WHEN a SiteIncident receives its first notification THEN the system SHALL record the startNotificationId and set the notification status to START_SENT
3. WHEN a SiteIncident transitions to isActive=false THEN the system SHALL record the endedAt timestamp and set isProcessed=false to trigger end notification processing
4. WHEN a SiteIncident end notification is sent THEN the system SHALL record the endNotificationId and set the notification status to END

### Requirement 3

**User Story:** As a data analyst, I want to maintain a complete audit trail of fire incidents with metadata and review status, so that I can analyze fire patterns and track incident investigation progress.

#### Acceptance Criteria

1. WHEN a SiteIncident is created THEN the system SHALL store the detection geometry from the first SiteAlert
2. WHEN a SiteIncident is active THEN the system SHALL record the endSiteAlertId and latestSiteAlertId for each new associated SiteAlert
3. WHEN a SiteIncident is reviewed or investigated THEN the system SHALL allow updating the reviewStatus field with values: to_review, in_review, reviewed
4. WHEN a SiteIncident is closed THEN the system SHALL preserve all metadata including detection geometry, timestamps, and review status for historical analysis

### Requirement 4

**User Story:** As a developer, I want the SiteIncident schema to be properly integrated with existing entities, so that the system maintains data integrity and referential consistency.

#### Acceptance Criteria

1. WHEN a SiteIncident is created THEN the system SHALL establish a relationship with the Site entity and validate that the Site exists
2. WHEN a SiteAlert is associated with a SiteIncident THEN the system SHALL update the SiteAlert.siteIncidentId field and maintain referential integrity
3. WHEN a SiteIncident is deleted THEN the system SHALL handle cascade behavior appropriately based on business requirements
4. WHEN querying SiteIncidents THEN the system SHALL efficiently retrieve related SiteAlerts, Notifications, and Site information through proper database relationships

### Requirement 5

**User Story:** As a system operator, I want to create incident boundary notifications (start and end) for SiteIncidents, so that users receive alerts when fire incidents begin and end.

#### Acceptance Criteria

1. WHEN a SiteIncident transitions to isActive=true and isProcessed=false THEN the system SHALL create a START notification for each verified and enabled alert method associated with the Site and set notificationStatus to START_SCHEDULED
2. WHEN creating incident notifications THEN the system SHALL track notification method counts to ensure balanced distribution across SMS, WhatsApp, Email, Device, and Webhook methods
3. WHEN a SiteIncident transitions to isActive=false and isProcessed=false THEN the system SHALL create an END notification for each verified and enabled alert method associated with the Site and set notificationStatus to END_SCHEDULED
4. WHEN incident notifications are created THEN the system SHALL store metadata including incident type (START_SCHEDULED or END_SCHEDULED), incident ID, site information, detection count, and incident duration
5. WHEN a notification transitions from START_SCHEDULED THEN the system SHALL update notificationStatus to START_SENT after successful creation
6. WHEN a notification transitions from END_SCHEDULED THEN the system SHALL update notificationStatus to END_SENT after successful creation

### Requirement 6

**User Story:** As a system operator, I want to send incident boundary notifications to users through multiple channels, so that users receive timely alerts about fire incident lifecycle events.

#### Acceptance Criteria

1. WHEN a notification for a SiteIncident START event is ready to send THEN the system SHALL deliver it through the configured alert method (SMS, WhatsApp, Email, Device Push, or Webhook)
2. WHEN a notification for a SiteIncident END event is ready to send THEN the system SHALL deliver it through the configured alert method with incident summary information (duration, detection count)
3. WHEN sending incident notifications THEN the system SHALL construct appropriate messages that differentiate between START and END events
4. WHEN an incident notification fails to send THEN the system SHALL mark it as skipped and increment the failure count for that alert method
5. WHEN an incident notification is successfully sent THEN the system SHALL update the notification status to isDelivered=true and record the sentAt timestamp

### Requirement 7

**User Story:** As a developer, I want to test SiteIncident notification creation and sending through mock APIs, so that I can verify the notification system works correctly without relying on CRON automation.

#### Acceptance Criteria

1. WHEN a mock API endpoint is called to create incident notifications THEN the system SHALL process unprocessed SiteIncidents and create notifications following the same logic as the production notification-creator service
2. WHEN a mock API endpoint is called to send incident notifications THEN the system SHALL process unsent notifications and deliver them following the same logic as the production notification-sender service
3. WHEN using mock APIs THEN the system SHALL accept optional parameters to filter by SiteIncident ID, Site ID, or notification type (START/END)
4. WHEN using mock APIs THEN the system SHALL return detailed response data including notification counts, success/failure statistics, and processed incident IDs
5. WHEN using mock APIs THEN the system SHALL maintain the same data integrity and transactional consistency as the production services

## Future Work

### Requirement 8 (Planned CRON Automation)

**User Story:** As a system administrator, I want to manage the SiteIncident lifecycle through automated CRON jobs, so that incidents are properly transitioned and notifications are sent at the correct times.

**Note:** This requirement is planned for implementation after the geo-event-fetcher CRON refactoring is complete.

#### Acceptance Criteria

1. WHEN the geo-event-fetcher CRON runs THEN the system SHALL create or update SiteIncident records based on new GeoEvent detections
2. WHEN a SiteIncident has been inactive for the configured inactivity threshold THEN the notification-creator CRON SHALL mark it as isActive=false and create an end notification
3. WHEN a SiteIncident has isProcessed=false and isActive=true THEN the notification-sender CRON SHALL send the start notification and set isProcessed=true
4. WHEN a SiteIncident has isProcessed=false and isActive=false THEN the notification-sender CRON SHALL send the end notification and set isProcessed=true
