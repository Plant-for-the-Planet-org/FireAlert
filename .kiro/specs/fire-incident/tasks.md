# Implementation Plan: Fire Incident Tracking

## Overview

This implementation plan breaks down the Fire Incident Tracking feature into three phases:

- **Phase 1**: Core SiteIncident entity and lifecycle management (Requirements 1-4)
- **Phase 2**: SiteIncident notification services (Requirements 5-7)
- **Future Work**: CRON automation (Requirement 8)

Each task builds incrementally on previous steps, with property-based tests integrated throughout.

---

# PHASE 1: CORE SITEINCIDENT ENTITY (Requirements 1-4)

## Phase 1.1: Database Schema & Migrations

- [x] 1.1 Create Prisma migration for SiteIncident entity

  - Add `SiteIncident` model to `apps/server/prisma/schema.prisma` with all fields and relationships
  - Add `siteIncidentId` and `siteIncident` relation to `SiteAlert` model
  - Add `incidents` relation to `Site` model
  - Create migration file: `prisma/migrations/[timestamp]_add_site_incident`
  - Run migration: `yarn server db:migrate`
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 1.2 Verify database schema and indexes
  - Confirm all indexes are created correctly (siteId, isActive+isProcessed, startedAt)
  - Verify foreign key relationships and cascade behavior
  - Test that Prisma client generates correctly
  - _Requirements: 4.1, 4.2_

## Phase 1.2: Service Layer Implementation

- [x] 1.3 Implement SiteIncidentService

  - Create `apps/server/src/Services/SiteIncident/SiteIncidentService.ts`
  - Implement `createOrUpdateIncident()` method to create new incidents or update existing active ones
  - Implement `getActiveIncidentForSite()` to query active incidents
  - Implement `getIncidentsByDateRange()` for historical queries
  - Implement `updateReviewStatus()` for audit trail management
  - Add input validation and error handling
  - _Requirements: 1.1, 1.2, 3.3_

- [ ]\* 1.3.1 Write property test for incident creation invariant

  - **Feature: fire-incident, Property 1: Incident Creation Invariant**
  - **Validates: Requirements 1.1, 2.1**
  - Generate random sites and verify exactly one incident is created when none exists

- [x] 1.4 Implement incident state management logic

  - Create helper functions for state transitions (CREATED → ACTIVE → CLOSING → CLOSED)
  - Implement validation for state transitions
  - Add logic to prevent modifications to closed incidents
  - _Requirements: 1.3, 1.4, 2.1, 2.3_

- [ ]\* 1.4.1 Write property test for single active incident per site

  - **Feature: fire-incident, Property 2: Single Active Incident Per Site**
  - **Validates: Requirements 1.1, 1.2**
  - Generate multiple sites and verify at most one active incident per site

- [ ]\* 1.4.2 Write property test for closed incident immutability
  - **Feature: fire-incident, Property 4: Closed Incident Immutability**
  - **Validates: Requirements 1.4, 3.4**
  - Verify closed incidents cannot be modified and metadata remains unchanged

## Phase 1.3: Data Access & Repository Layer

- [x] 1.5 Create SiteIncident repository functions

  - Create `apps/server/src/repositories/siteIncident.ts` (or extend existing pattern)
  - Implement `findActiveIncidentForSite(siteId)` with efficient queries
  - Implement `findIncidentsByDateRange(siteId, startDate, endDate)`
  - Implement `createIncident()` with transaction support
  - Implement `updateIncident()` for state transitions
  - Add proper error handling and logging
  - _Requirements: 4.1, 4.4_

- [ ]\* 1.5.1 Write property test for alert association consistency

  - **Feature: fire-incident, Property 3: Alert Association Consistency**
  - **Validates: Requirements 1.2, 4.2**
  - Verify associated alerts match incident and site geometry

- [ ]\* 1.5.2 Write property test for referential integrity
  - **Feature: fire-incident, Property 9: Referential Integrity**
  - **Validates: Requirements 4.1, 4.2**
  - Verify all foreign keys reference existing records

## Phase 1.4: API Layer Implementation

- [x] 1.6 Create tRPC router for SiteIncident

  - Create `apps/server/src/server/api/routers/siteIncident.ts`
  - Implement `getIncident(incidentId)` query procedure
  - Implement `getActiveIncidents(siteId)` query procedure
  - Implement `getIncidentHistory(siteId, dateRange)` query procedure
  - Implement `updateIncidentReviewStatus(incidentId, status)` mutation procedure
  - Add proper authentication and authorization checks
  - _Requirements: 4.1, 4.4_

- [x] 1.7 Integrate SiteIncident router into main tRPC router
  - Add SiteIncident router to `apps/server/src/server/api/root.ts`
  - Verify type safety and exports
  - Test router is accessible via tRPC client
  - _Requirements: 4.1_

## Phase 1.5: Integration with Existing Systems

- [x] 1.8 Integrate SiteIncident creation into SiteAlert processing

  - Modify SiteAlert creation logic to check for active incidents
  - Call `SiteIncidentService.createOrUpdateIncident()` when new SiteAlert is created
  - Update `latestSiteAlertId` when associating alerts to active incidents
  - Ensure notifications are created at incident boundaries
  - _Requirements: 1.1, 1.2, 2.2_

- [ ]\* 1.8.1 Write property test for inactivity threshold enforcement

  - **Feature: fire-incident, Property 6: Inactivity Threshold Enforcement**
  - **Validates: Requirements 1.3**
  - Verify incidents transition to inactive after threshold duration

- [x] 1.9 Add environment variable configuration
  - Add `INCIDENT_INACTIVITY_HOURS` to `.env` and `.env.sample` (default: 6)
  - Add `ENABLE_INCIDENT_NOTIFICATIONS` feature flag (default: true)
  - Load and validate configuration in service initialization
  - _Requirements: 1.3_

## Phase 1.6: Validation & Error Handling

- [x] 1.10 Implement comprehensive validation

  - Add Zod schemas for SiteIncident input validation
  - Create `apps/server/src/server/api/schemas/siteIncident.schema.ts`
  - Validate reviewStatus values (to_review, in_review, reviewed)
  - Validate timestamp ordering (startedAt ≤ endedAt)
  - Validate inactivity threshold is positive
  - _Requirements: 3.3, 4.1_

- [ ]\* 1.10.1 Write property test for review status validity

  - **Feature: fire-incident, Property 8: Review Status Validity**
  - **Validates: Requirements 3.3**
  - Verify reviewStatus only contains valid values

- [ ]\* 1.10.2 Write property test for incident lifecycle ordering

  - **Feature: fire-incident, Property 10: Incident Lifecycle Ordering**
  - **Validates: Requirements 2.1, 2.3**
  - Verify startedAt ≤ endedAt for all incidents

- [x] 1.11 Add error handling and logging
  - Create custom error types for SiteIncident operations
  - Add structured logging for all state transitions
  - Implement graceful error recovery strategies
  - Log all errors with incident ID and timestamp
  - _Requirements: 4.1_

## Phase 1.7: Audit Trail & Metadata

- [x] 1.12 Implement audit trail recording

  - Ensure all SiteAlerts associated with incident have proper metadata
  - Record `latestSiteAlertId` on each new alert association
  - Record `endSiteAlertId` when incident transitions to inactive
  - Preserve all metadata for historical analysis
  - _Requirements: 3.1, 3.2, 3.4_

- [ ]\* 1.12.1 Write property test for audit trail completeness
  - **Feature: fire-incident, Property 7: Audit Trail Completeness**
  - **Validates: Requirements 3.1, 3.2, 3.4**
  - Verify latestSiteAlertId updates while active, endSiteAlertId set when closed

## Phase 1.8: Testing & Validation

- [ ] 1.13 Write unit tests for SiteIncidentService

  - Test incident creation with valid/invalid inputs
  - Test state transitions (CREATED → ACTIVE → CLOSING → CLOSED)
  - Test review status updates
  - Test error conditions and validation
  - Test boundary conditions (null fields, empty incidents)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 1.14 Write integration tests for Phase 1

  - Test SiteIncident creation with SiteAlert association
  - Test closed incidents prevent new associations
  - Test query operations return correct related data
  - Test referential integrity across entities
  - _Requirements: 1.1, 1.2, 4.1, 4.4_

- [ ] 1.15 Checkpoint - Ensure all Phase 1 tests pass
  - Run all unit tests: `yarn server test`
  - Run all property-based tests: `yarn server test:pbt`
  - Verify test coverage meets goals (100% for core logic)
  - Ask the user if questions arise

---

# PHASE 2: SITEINCIDENT NOTIFICATION SERVICES (Requirements 5-7)

## Phase 2.1: Database Schema Updates

- [x] 2.1 Add notificationStatus field to Notification model

  - Add `notificationStatus` field to Notification model in `apps/server/prisma/schema.prisma`
  - Values: START_SCHEDULED, START_SENT, END_SCHEDULED, END_SENT
  - Create migration file: `prisma/migrations/[timestamp]_add_notification_status`
  - Run migration: `yarn server db:migrate`
  - _Requirements: 5.1, 5.4, 5.5, 5.6_

## Phase 2.2: CreateIncidentNotifications Service

- [x] 2.2 Implement CreateIncidentNotifications service

  - Create `apps/server/src/Services/SiteIncident/CreateIncidentNotifications.ts`
  - Implement `createNotifications()` main execution method
  - Implement `processUnprocessedIncidents()` to query incidents with isProcessed=false
  - Implement `createNotificationQueue()` to build notification data
  - Implement batch processing with chunking (similar to CreateNotifications.ts)
  - Track notification method counts for balanced distribution
  - Set `notificationStatus` to START_SCHEDULED or END_SCHEDULED
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]\* 2.2.1 Write property test for notification status validity

  - **Feature: fire-incident, Property 11: Notification Status Validity**
  - **Validates: Requirements 5.1, 5.4, 5.5, 5.6**
  - Verify notificationStatus only contains valid values

- [ ]\* 2.2.2 Write property test for notification method distribution

  - **Feature: fire-incident, Property 12: Notification Method Distribution**
  - **Validates: Requirements 5.2, 5.3**
  - Verify notifications created for each verified/enabled method

## Phase 2.3: SendIncidentNotifications Service

- [x] 2.3 Implement SendIncidentNotifications service

  - Create `apps/server/src/Services/SiteIncident/SendIncidentNotifications.ts`
  - Implement `sendNotifications()` main execution method
  - Implement `getScheduledNotifications()` to query notifications with SCHEDULED status
  - Implement `constructMessage()` to differentiate START vs END messages
  - Implement batch processing with rate limiting (similar to SendNotifications.ts)
  - Update `notificationStatus` to START_SENT or END_SENT on success
  - Mark failed notifications as skipped
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]\* 2.3.1 Write property test for notification delivery consistency

  - **Feature: fire-incident, Property 13: Notification Delivery Consistency**
  - **Validates: Requirements 6.1, 6.2, 6.5**
  - Verify sent notifications have isDelivered=true and sentAt set

- [ ]\* 2.3.2 Write property test for notification message differentiation

  - **Feature: fire-incident, Property 14: Notification Message Differentiation**
  - **Validates: Requirements 6.3, 6.2**
  - Verify START and END messages differ and END includes summary info

- [ ]\* 2.3.3 Write property test for failed notification handling

  - **Feature: fire-incident, Property 15: Failed Notification Handling**
  - **Validates: Requirements 6.4**
  - Verify failed notifications marked as skipped and failure count incremented

## Phase 2.4: Mock API Endpoints

- [x] 2.4 Implement mock API for CreateIncidentNotifications

  - Create tRPC procedure: `mockCreateIncidentNotifications`
  - Accept optional filters: incidentId, siteId, notificationType
  - Return: notificationsCreated count, processedIncidentIds, methodCounts, errors
  - Maintain transactional consistency
  - _Requirements: 7.1, 7.3, 7.4, 7.5_

- [x] 2.5 Implement mock API for SendIncidentNotifications

  - Create tRPC procedure: `mockSendIncidentNotifications`
  - Accept optional filters: incidentId, siteId, notificationType, batchSize
  - Return: notificationsSent count, notificationsFailed count, processedIncidentIds, failureStats, errors
  - Maintain transactional consistency
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 2.6 Integrate mock APIs into SiteIncident router

  - Add mock endpoints to `apps/server/src/server/api/routers/siteIncident.ts`
  - Add proper authentication and authorization checks
  - Test endpoints are accessible via tRPC client
  - _Requirements: 7.1, 7.2_

## Phase 2.5: Testing & Validation

- [ ] 2.7 Write unit tests for CreateIncidentNotifications

  - Test notification creation with valid/invalid incidents
  - Test notification method counter accuracy
  - Test batch processing and chunking
  - Test notificationStatus transitions
  - Test error conditions and validation
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 2.8 Write unit tests for SendIncidentNotifications

  - Test notification sending with different alert methods
  - Test message differentiation (START vs END)
  - Test batch processing and rate limiting
  - Test notificationStatus transitions
  - Test failure handling and skipping
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 2.9 Write unit tests for mock APIs

  - Test mock create endpoint with various filters
  - Test mock send endpoint with various filters
  - Test response data structure and accuracy
  - Test error handling and edge cases
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 2.10 Write integration tests for Phase 2

  - Test end-to-end: SiteIncident → CreateNotifications → SendNotifications
  - Test mock APIs work correctly
  - Test notification status transitions through full lifecycle
  - Test with real database data
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 2.11 Checkpoint - Ensure all Phase 2 tests pass
  - Run all unit tests: `yarn server test`
  - Run all property-based tests: `yarn server test:pbt`
  - Verify test coverage meets goals (100% for notification services)
  - Ask the user if questions arise

## Phase 2.6: Documentation & Cleanup

- [ ] 2.12 Add JSDoc comments to notification services

  - Document all public methods with parameter and return types
  - Add examples for complex operations
  - Document error conditions and recovery strategies
  - _Requirements: 5.1, 6.1, 7.1_

- [ ] 2.13 Final integration verification

  - Test end-to-end flow: SiteIncident → CreateNotifications → SendNotifications → Delivery
  - Verify all mock APIs work correctly
  - Test with real database data
  - Verify no breaking changes to existing functionality
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 2.14 Checkpoint - Ensure all tests pass
  - Run full test suite: `yarn server test`
  - Verify all property-based tests pass with 100+ iterations
  - Confirm no regressions in Phase 1 or existing functionality
  - Ask the user if questions arise

---

# FUTURE WORK: CRON AUTOMATION (Requirement 8)

**Note:** This phase is planned for implementation after the geo-event-fetcher CRON refactoring is complete.

## Future 1: CRON Job Integration

- [ ] F.1 Implement geo-event-fetcher CRON integration

  - Modify geo-event-fetcher CRON to create/update SiteIncident records
  - Call `SiteIncidentService.createOrUpdateIncident()` for each new GeoEvent
  - Handle incident closure based on inactivity threshold
  - _Requirements: 8.1_

- [ ] F.2 Implement notification-creator CRON

  - Create CRON job to process unprocessed SiteIncidents
  - Call `CreateIncidentNotifications.createNotifications()`
  - Mark incidents as processed after notification creation
  - _Requirements: 8.2_

- [ ] F.3 Implement notification-sender CRON

  - Create CRON job to send scheduled notifications
  - Call `SendIncidentNotifications.sendNotifications()`
  - Update notification status and incident processing flags
  - _Requirements: 8.3, 8.4_

- [ ] F.4 Add CRON scheduling configuration

  - Configure CRON job frequencies and timing
  - Add monitoring and alerting for CRON failures
  - Document CRON job dependencies and execution order
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

---

## Notes

- All tasks marked with `*` are optional testing tasks that can be skipped for MVP
- Core implementation tasks (without `*`) are required for feature completion
- Each phase builds on previous phases; do not skip ahead
- Property-based tests should use Vitest with fast-check framework
- All code should follow existing project conventions and patterns
- Database migrations should be version-controlled and reversible
- Phase 1 must be completed before Phase 2
- Phase 2 must be completed before Future Work (CRON automation)
