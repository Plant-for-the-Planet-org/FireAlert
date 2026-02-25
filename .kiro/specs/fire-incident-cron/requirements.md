# Requirements Document

## Introduction

The Fire Incident CRON feature introduces a SiteIncident system to group related fire alerts and improve notification management. Instead of sending notifications for every individual SiteAlert with a simple 2-hour cooldown, the system will track fire incidents as cohesive events with start and end notifications, providing better insights into fire duration and reducing notification fatigue.

## Glossary

- **SiteIncident**: A grouped collection of related SiteAlerts representing a single fire event over time
- **Fire_Incident_Service**: Service responsible for managing SiteIncident lifecycle and associations
- **Geo_Event_Fetcher**: The existing CRON job that processes GeoEvents and creates SiteAlerts
- **Notification_Creator**: CRON job responsible for creating notifications based on SiteIncident status
- **Active_Incident**: A SiteIncident where isActive = true, indicating ongoing fire activity
- **Incident_Resolution**: Process of marking SiteIncident as inactive after 6 hours of no new activity

## Requirements

### Requirement 1: SiteIncident Data Model

**User Story:** As a system administrator, I want a SiteIncident table to group related fire alerts, so that I can track fire events as cohesive incidents rather than individual detections.

#### Acceptance Criteria

1. THE System SHALL create a SiteIncident table with required fields (id, siteId, firstSiteAlertId, firstEventId, startedAt, isActive, isProcessed)
2. THE System SHALL create a SiteIncident table with optional fields (lastSiteAlertId, endedAt, startedNotificationId, endedNotificationId, detectionGeometry, reviewStatus, metadata, notificationStatus)
3. THE System SHALL set default values (isActive = true, isProcessed = false) for new SiteIncident records
4. THE System SHALL establish foreign key relationships to Site, SiteAlert, and Notification tables
5. THE System SHALL add siteIncidentId field to SiteAlert table for incident association

### Requirement 2: SiteIncident Creation Logic

**User Story:** As a fire monitoring system, I want to automatically create or associate SiteAlerts with SiteIncidents, so that related fire detections are grouped together.

#### Acceptance Criteria

1. WHEN a new SiteAlert is created, THE Fire_Incident_Service SHALL check for active SiteIncidents for the same Site
2. IF no active SiteIncident exists, THE Fire_Incident_Service SHALL create a new SiteIncident with the SiteAlert as the first alert
3. IF an active SiteIncident exists, THE Fire_Incident_Service SHALL associate the SiteAlert with the existing SiteIncident
4. WHEN creating a new SiteIncident, THE Fire_Incident_Service SHALL set firstSiteAlertId, firstEventId, startedAt, and siteId fields
5. WHEN associating with existing SiteIncident, THE Fire_Incident_Service SHALL update lastSiteAlertId field

### Requirement 3: Incident Activity Tracking

**User Story:** As a fire monitoring system, I want to track when fire incidents become inactive, so that I can properly close incidents and send end notifications.

#### Acceptance Criteria

1. THE System SHALL consider a SiteIncident active when new SiteAlerts are associated within 6 hours
2. WHEN no new SiteAlerts are associated for 6 hours, THE System SHALL mark the SiteIncident as inactive (isActive = false)
3. WHEN marking SiteIncident as inactive, THE System SHALL set endedAt timestamp
4. THE System SHALL update detectionGeometry to include all associated SiteAlert geometries
5. THE System SHALL maintain lastSiteAlertId to track the final alert in the incident

### Requirement 4: Geo-Event-Fetcher Integration

**User Story:** As a system developer, I want the geo-event-fetcher CRON to integrate SiteIncident creation, so that incidents are created in real-time as alerts are processed.

#### Acceptance Criteria

1. WHEN the geo-event-fetcher creates SiteAlerts, THE System SHALL call Fire_Incident_Service for each new SiteAlert
2. THE Fire_Incident_Service SHALL execute within the same transaction as SiteAlert creation
3. IF SiteIncident creation fails, THE System SHALL rollback the entire SiteAlert transaction
4. THE System SHALL log SiteIncident creation and association activities
5. THE refactored pipeline SHALL be the only implementation supporting SiteIncident integration

### Requirement 5: Notification Status Management

**User Story:** As a notification system, I want to track notification status for incident start and end events, so that I can ensure proper notification delivery without duplicates.

#### Acceptance Criteria

1. WHEN a new SiteIncident is created, THE System SHALL set notificationStatus to 'START'
2. WHEN a SiteIncident becomes inactive, THE System SHALL set notificationStatus to 'END'
3. THE System SHALL track startedNotificationId when start notification is created
4. THE System SHALL track endedNotificationId when end notification is created
5. THE System SHALL prevent duplicate notifications for the same incident phase

### Requirement 6: Database Migration Support

**User Story:** As a database administrator, I want proper database migrations for the SiteIncident feature, so that the schema changes are applied safely and can be rolled back if needed.

#### Acceptance Criteria

1. THE System SHALL provide a database migration to create the SiteIncident table
2. THE System SHALL provide a migration to add siteIncidentId to SiteAlert table
3. THE System SHALL include proper indexes for performance (siteId, isActive, isProcessed)
4. THE System SHALL include spatial indexes for detectionGeometry field
5. THE System SHALL support rollback migrations for safe deployment

### Requirement 7: Service Layer Architecture

**User Story:** As a software developer, I want SiteIncident functionality implemented using SOLID principles, so that the code is maintainable and testable.

#### Acceptance Criteria

1. THE System SHALL implement SiteIncidentService following single responsibility principle
2. THE System SHALL implement SiteIncidentRepository for data access abstraction
3. THE System SHALL use dependency injection for service composition
4. THE System SHALL implement proper TypeScript interfaces for all data structures
5. THE System SHALL follow the existing service layer patterns from geo-event-fetcher refactoring

### Requirement 8: Incident Resolution Processing

**User Story:** As a fire monitoring system, I want a process to automatically resolve inactive incidents, so that end notifications are triggered and incidents are properly closed.

#### Acceptance Criteria

1. THE System SHALL identify SiteIncidents that have been inactive for 6+ hours
2. WHEN resolving incidents, THE System SHALL mark isActive = false and set endedAt timestamp
3. THE System SHALL mark resolved incidents as isProcessed = false to trigger end notifications
4. THE System SHALL update detectionGeometry with union of all associated SiteAlert geometries
5. THE System SHALL handle incident resolution within the geo-event-fetcher CRON execution

### Requirement 9: Type Safety and Error Handling

**User Story:** As a software developer, I want comprehensive type safety and error handling for SiteIncident operations, so that the system is robust and maintainable.

#### Acceptance Criteria

1. THE System SHALL define TypeScript interfaces for all SiteIncident data structures
2. THE System SHALL implement proper error handling for database operations
3. THE System SHALL validate all input data before processing
4. THE System SHALL log errors with sufficient context for debugging
5. THE System SHALL handle partial failures gracefully without corrupting data

### Requirement 10: Performance Optimization

**User Story:** As a system administrator, I want SiteIncident processing to be performant, so that it doesn't impact the geo-event-fetcher CRON performance.

#### Acceptance Criteria

1. THE System SHALL execute SiteIncident operations within 100ms per SiteAlert
2. THE System SHALL use efficient database queries with proper indexing
3. THE System SHALL batch incident resolution operations when possible
4. THE System SHALL minimize database round trips through efficient query design
5. THE System SHALL include performance metrics for SiteIncident operations
