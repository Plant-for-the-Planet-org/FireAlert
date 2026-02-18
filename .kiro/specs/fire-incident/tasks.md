# Implementation Plan: Fire Incident Tracking

## Overview

This implementation plan breaks down the Fire Incident Tracking feature into discrete, manageable coding tasks. Each task builds incrementally on previous steps, starting with database schema setup, moving through service layer implementation, and concluding with API endpoints and comprehensive testing.

---

## Phase 1: Database Schema & Migrations

- [x] 1. Create Prisma migration for SiteIncident entity

  - Add `SiteIncident` model to `apps/server/prisma/schema.prisma` with all fields and relationships
  - Add `siteIncidentId` and `siteIncident` relation to `SiteAlert` model
  - Add `incidents` relation to `Site` model
  - Create migration file: `prisma/migrations/[timestamp]_add_site_incident`
  - Run migration: `yarn server db:migrate`
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 2. Verify database schema and indexes
  - Confirm all indexes are created correctly (siteId, isActive+isProcessed, startedAt)
  - Verify foreign key relationships and cascade behavior
  - Test that Prisma client generates correctly
  - _Requirements: 4.1, 4.2_

---

## Phase 2: Service Layer Implementation

- [x] 3. Implement SiteIncidentService

  - Create `apps/server/src/Services/SiteIncident/SiteIncidentService.ts`
  - Implement `createOrUpdateIncident()` method to create new incidents or update existing active ones
  - Implement `getActiveIncidentForSite()` to query active incidents
  - Implement `getIncidentsByDateRange()` for historical queries
  - Implement `updateReviewStatus()` for audit trail management
  - Add input validation and error handling
  - _Requirements: 1.1, 1.2, 3.3_

- [ ]\* 3.1 Write property test for incident creation invariant

  - **Feature: fire-incident, Property 1: Incident Creation Invariant**
  - **Validates: Requirements 1.1, 2.1**
  - Generate random sites and verify exactly one incident is created when none exists

- [x] 4. Implement NotificationBoundaryService

  - Create `apps/server/src/Services/SiteIncident/NotificationBoundaryService.ts`
  - Implement `createStartNotification()` to create START notifications
  - Implement `createEndNotification()` to create END notifications
  - Implement `recordNotificationSent()` to track notification IDs
  - Integrate with existing Notification model using metadata field
  - _Requirements: 2.2, 2.4_

- [ ]\* 4.1 Write property test for notification boundary tracking

  - **Feature: fire-incident, Property 5: Notification Boundary Tracking**
  - **Validates: Requirements 2.2, 2.4**
  - Verify that when notifications are recorded, required fields are set

- [x] 5. Implement incident state management logic

  - Create helper functions for state transitions (CREATED → ACTIVE → CLOSING → CLOSED)
  - Implement validation for state transitions
  - Add logic to prevent modifications to closed incidents
  - _Requirements: 1.3, 1.4, 2.1, 2.3_

- [ ]\* 5.1 Write property test for single active incident per site

  - **Feature: fire-incident, Property 2: Single Active Incident Per Site**
  - **Validates: Requirements 1.1, 1.2**
  - Generate multiple sites and verify at most one active incident per site

- [ ]\* 5.2 Write property test for closed incident immutability
  - **Feature: fire-incident, Property 4: Closed Incident Immutability**
  - **Validates: Requirements 1.4, 3.4**
  - Verify closed incidents cannot be modified and metadata remains unchanged

---

## Phase 3: Data Access & Repository Layer

- [x] 6. Create SiteIncident repository functions

  - Create `apps/server/src/repositories/siteIncident.ts` (or extend existing pattern)
  - Implement `findActiveIncidentForSite(siteId)` with efficient queries
  - Implement `findIncidentsByDateRange(siteId, startDate, endDate)`
  - Implement `createIncident()` with transaction support
  - Implement `updateIncident()` for state transitions
  - Add proper error handling and logging
  - _Requirements: 4.1, 4.4_

- [ ]\* 6.1 Write property test for alert association consistency

  - **Feature: fire-incident, Property 3: Alert Association Consistency**
  - **Validates: Requirements 1.2, 5.2**
  - Verify associated alerts match incident and site geometry

- [ ]\* 6.2 Write property test for referential integrity
  - **Feature: fire-incident, Property 9: Referential Integrity**
  - **Validates: Requirements 5.1, 5.2**
  - Verify all foreign keys reference existing records

---

## Phase 4: API Layer Implementation

- [x] 7. Create tRPC router for SiteIncident

  - Create `apps/server/src/server/api/routers/siteIncident.ts`
  - Implement `getIncident(incidentId)` query procedure
  - Implement `getActiveIncidents(siteId)` query procedure
  - Implement `getIncidentHistory(siteId, dateRange)` query procedure
  - Implement `updateIncidentReviewStatus(incidentId, status)` mutation procedure
  - Add proper authentication and authorization checks
  - _Requirements: 4.1, 4.4_

- [x] 8. Integrate SiteIncident router into main tRPC router
  - Add SiteIncident router to `apps/server/src/server/api/root.ts`
  - Verify type safety and exports
  - Test router is accessible via tRPC client
  - _Requirements: 4.1_

---

## Phase 5: Integration with Existing Systems

- [x] 9. Integrate SiteIncident creation into SiteAlert processing

  - Modify SiteAlert creation logic to check for active incidents
  - Call `SiteIncidentService.createOrUpdateIncident()` when new SiteAlert is created
  - Update `latestSiteAlertId` when associating alerts to active incidents
  - Ensure notifications are created at incident boundaries
  - _Requirements: 1.1, 1.2, 2.2_

- [ ]\* 9.1 Write property test for inactivity threshold enforcement

  - **Feature: fire-incident, Property 6: Inactivity Threshold Enforcement**
  - **Validates: Requirements 1.3**
  - Verify incidents transition to inactive after threshold duration

- [x] 10. Add environment variable configuration
  - Add `INCIDENT_INACTIVITY_HOURS` to `.env` and `.env.sample` (default: 6)
  - Add `ENABLE_INCIDENT_NOTIFICATIONS` feature flag (default: true)
  - Load and validate configuration in service initialization
  - _Requirements: 1.3_

---

## Phase 6: Validation & Error Handling

- [x] 11. Implement comprehensive validation

  - Add Zod schemas for SiteIncident input validation
  - Create `apps/server/src/server/api/schemas/siteIncident.schema.ts`
  - Validate reviewStatus values (to_review, in_review, reviewed)
  - Validate timestamp ordering (startedAt ≤ endedAt)
  - Validate inactivity threshold is positive
  - _Requirements: 3.3, 4.1_

- [ ]\* 11.1 Write property test for review status validity

  - **Feature: fire-incident, Property 8: Review Status Validity**
  - **Validates: Requirements 3.3**
  - Verify reviewStatus only contains valid values

- [ ]\* 11.2 Write property test for incident lifecycle ordering

  - **Feature: fire-incident, Property 10: Incident Lifecycle Ordering**
  - **Validates: Requirements 2.1, 2.3**
  - Verify startedAt ≤ endedAt for all incidents

- [x] 12. Add error handling and logging
  - Create custom error types for SiteIncident operations
  - Add structured logging for all state transitions
  - Implement graceful error recovery strategies
  - Log all errors with incident ID and timestamp
  - _Requirements: 4.1_

---

## Phase 7: Audit Trail & Metadata

- [x] 13. Implement audit trail recording

  - Ensure all SiteAlerts associated with incident have proper metadata
  - Record `latestSiteAlertId` on each new alert association
  - Record `endSiteAlertId` when incident transitions to inactive
  - Preserve all metadata for historical analysis
  - _Requirements: 3.1, 3.2, 3.4_

- [ ]\* 13.1 Write property test for audit trail completeness
  - **Feature: fire-incident, Property 7: Audit Trail Completeness**
  - **Validates: Requirements 3.1, 3.2, 3.4**
  - Verify latestSiteAlertId updates while active, endSiteAlertId set when closed

---

## Phase 8: Testing & Validation

- [ ] 14. Write unit tests for SiteIncidentService

  - Test incident creation with valid/invalid inputs
  - Test state transitions (CREATED → ACTIVE → CLOSING → CLOSED)
  - Test review status updates
  - Test error conditions and validation
  - Test boundary conditions (null fields, empty incidents)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 15. Write unit tests for NotificationBoundaryService

  - Test START notification creation
  - Test END notification creation
  - Test notification metadata structure
  - Test notification tracking and recording
  - _Requirements: 2.2, 2.4_

- [ ] 16. Write integration tests

  - Test SiteIncident creation triggers notification service
  - Test SiteAlert association updates incident metadata
  - Test closed incidents prevent new associations
  - Test query operations return correct related data
  - Test referential integrity across entities
  - _Requirements: 1.1, 1.2, 4.1, 4.4_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Run all unit tests: `yarn server test`
  - Run all property-based tests: `yarn server test:pbt`
  - Verify test coverage meets goals (100% for core logic)
  - Ask the user if questions arise

---

## Phase 9: Documentation & Cleanup

- [x] 18. Add JSDoc comments to service methods

  - Document all public methods with parameter and return types
  - Add examples for complex operations
  - Document error conditions and recovery strategies
  - _Requirements: 4.1_

- [x] 19. Verify database migrations are clean

  - Confirm migration files follow naming conventions
  - Test migration up and down operations
  - Verify schema matches design document
  - _Requirements: 4.1, 4.2_

- [ ] 20. Final integration verification

  - Test end-to-end flow: GeoEvent → SiteAlert → SiteIncident → Notification
  - Verify all tRPC endpoints are accessible and type-safe
  - Test with real database data
  - Verify no breaking changes to existing functionality
  - _Requirements: 1.1, 1.2, 4.1, 4.4_

- [ ] 21. Checkpoint - Ensure all tests pass
  - Run full test suite: `yarn server test`
  - Verify all property-based tests pass with 100+ iterations
  - Confirm no regressions in existing functionality
  - Ask the user if questions arise

---

## Notes

- All tasks marked with `*` are optional testing tasks that can be skipped for MVP
- Core implementation tasks (without `*`) are required for feature completion
- Each phase builds on previous phases; do not skip ahead
- Property-based tests should use Vitest with fast-check framework
- All code should follow existing project conventions and patterns
- Database migrations should be version-controlled and reversible
