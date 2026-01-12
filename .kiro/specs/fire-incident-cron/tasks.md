# Implementation Plan: Fire Incident CRON

## Overview

This implementation plan creates a SiteIncident system that integrates with the existing refactored geo-event-fetcher CRON to group related fire alerts and manage notification lifecycle. The implementation follows SOLID principles and the established service layer architecture patterns.

## Tasks

- [ ] 1. Create TypeScript interfaces and domain models

  - Create comprehensive TypeScript interfaces for SiteIncident data structures
  - Define service contracts and data transfer objects
  - Ensure type safety across all components
  - _Requirements: 7.4, 9.1_

- [ ] 1.1 Create SiteIncident TypeScript interfaces

  - Create `apps/server/src/Interfaces/SiteIncident.ts`
  - Define `SiteIncidentInterface`, `CreateIncidentData`, `UpdateIncidentData` interfaces
  - Define `ResolveResult`, `IncidentMetrics`, `TransactionContext` interfaces
  - Include proper JSDoc documentation for all interfaces
  - _Requirements: Type safety for SiteIncident operations_

- [ ]\* 1.2 Write unit tests for TypeScript interfaces

  - Test interface type checking and validation
  - Test data transfer object structure
  - Verify interface compatibility with Prisma types
  - _Requirements: Verify type safety_

- [ ] 2. Implement SiteIncidentRepository (Data Access Layer)

  - Create repository following existing patterns from geo-event-fetcher refactoring
  - Implement PostGIS spatial operations for geometry calculations
  - Include proper error handling and transaction management
  - _Requirements: 7.2, 6.3, 6.4_

- [ ] 2.1 Create SiteIncidentRepository class

  - Create `apps/server/src/Services/SiteIncident/SiteIncidentRepository.ts`
  - Implement constructor accepting Prisma client
  - Implement `findActiveBySiteId()` for active incident lookup
  - Implement `createIncident()` for new incident creation
  - Implement `updateIncident()` for incident updates
  - Implement `findInactiveIncidents()` for resolution queries
  - Implement `resolveIncidentsBatch()` for batch resolution
  - Include proper error handling and logging
  - _Requirements: Repository pattern for incident data access_

- [ ]\* 2.2 Write integration tests for SiteIncidentRepository

  - Test incident creation with proper field population
  - Test active incident lookup by site ID
  - Test incident updates and field changes
  - Test inactive incident identification with time windows
  - Test batch resolution operations
  - Test PostGIS geometry operations
  - _Requirements: Verify repository operations_

- [ ] 3. Implement IncidentResolver (Business Logic)

  - Create specialized service for incident resolution logic
  - Implement geometry calculations using PostGIS
  - Handle batch processing for performance
  - _Requirements: 3.1, 3.2, 8.1, 8.2_

- [ ] 3.1 Create IncidentResolver class

  - Create `apps/server/src/Services/SiteIncident/IncidentResolver.ts`
  - Implement constructor with dependencies (repository, metrics)
  - Implement `shouldResolveIncident()` for 6-hour inactivity check
  - Implement `calculateIncidentGeometry()` for spatial union operations
  - Implement `batchResolveIncidents()` for efficient batch processing
  - Include performance metrics and logging
  - _Requirements: Incident resolution business logic_

- [ ]\* 3.2 Write unit tests for IncidentResolver

  - Test 6-hour inactivity logic with various time scenarios
  - Test geometry calculation with multiple SiteAlert geometries
  - Test batch resolution with different incident states
  - Test error handling for invalid data
  - _Requirements: Verify resolution logic_

- [ ] 4. Implement SiteIncidentService (Orchestration Layer)

  - Create main service following existing service patterns
  - Implement incident lifecycle management
  - Handle SiteAlert association logic
  - Include transaction management and error handling
  - _Requirements: 7.1, 2.1, 2.2, 2.3_

- [ ] 4.1 Create SiteIncidentService class

  - Create `apps/server/src/Services/SiteIncident/SiteIncidentService.ts`
  - Implement constructor with dependencies (repository, resolver, metrics)
  - Implement `processNewSiteAlert()` for incident creation/association
  - Implement `resolveInactiveIncidents()` for batch resolution
  - Implement `associateAlertWithIncident()` for alert association
  - Include comprehensive error handling and logging
  - Include performance metrics tracking
  - _Requirements: Service layer orchestration_

- [ ]\* 4.2 Write unit tests for SiteIncidentService

  - Mock dependencies and test incident creation logic
  - Test SiteAlert association with existing incidents
  - Test incident resolution workflow
  - Test error handling and rollback scenarios
  - Test performance metrics collection
  - _Requirements: Verify service orchestration_

- [ ] 5. Integrate SiteIncident system with SiteAlertService

  - Modify existing SiteAlertService to call SiteIncidentService
  - Ensure transaction integrity between alert and incident creation
  - Add proper error handling and rollback logic
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5.1 Update SiteAlertService integration

  - Update `apps/server/src/Services/SiteAlert/SiteAlertService.ts`
  - Add SiteIncidentService as constructor dependency
  - Modify `createAlertsForProvider()` to call incident processing
  - Ensure incident processing happens within alert creation transaction
  - Add error handling with proper rollback on incident failures
  - Include logging for incident integration activities
  - _Requirements: Integration with existing alert creation workflow_

- [ ]\* 5.2 Write integration tests for SiteAlertService

  - Test full workflow from SiteAlert creation to incident association
  - Test transaction rollback when incident processing fails
  - Test performance impact of incident integration
  - Test error scenarios and recovery
  - _Requirements: Verify end-to-end integration_

- [ ] 6. Update geo-event-fetcher CRON handler

  - Modify refactored implementation to include SiteIncidentService
  - Add incident resolution processing to CRON execution
  - Ensure only refactored pipeline supports SiteIncident integration
  - _Requirements: 4.5, 8.5_

- [ ] 6.1 Update geo-event-fetcher handler

  - Update `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
  - Add SiteIncidentService initialization in refactored implementation
  - Pass SiteIncidentService to SiteAlertService constructor
  - Add incident resolution call after provider processing
  - Ensure legacy implementation remains unchanged
  - Include incident metrics in response
  - _Requirements: CRON integration with incident processing_

- [ ]\* 6.2 Write integration tests for CRON handler

  - Test full CRON execution with incident processing enabled
  - Test feature flag behavior (refactored vs legacy)
  - Test incident resolution during CRON execution
  - Test performance impact and metrics collection
  - _Requirements: Verify CRON integration_

- [ ] 7. Implement performance optimizations

  - Add performance metrics for incident operations
  - Implement batch processing for efficiency
  - Optimize database queries with proper indexing
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 7.1 Add performance metrics to incident operations

  - Update all incident services to include PerformanceMetrics
  - Track incident creation, association, and resolution times
  - Track database query performance
  - Track memory usage during batch operations
  - Include metrics in OperationResult responses
  - _Requirements: Performance monitoring and optimization_

- [ ]\* 7.2 Write performance tests for incident operations

  - Test incident operations stay within 100ms constraint
  - Test batch processing efficiency
  - Test database query performance
  - Test memory usage patterns
  - _Requirements: Verify performance requirements_

- [ ] 8. Add comprehensive error handling and validation

  - Implement input validation for all service methods
  - Add proper error logging with context
  - Handle partial failures gracefully
  - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [ ] 8.1 Implement error handling and validation

  - Add input validation to all SiteIncidentService methods
  - Implement comprehensive error handling in repositories
  - Add detailed error logging with sufficient context
  - Implement graceful handling of partial failures
  - Add error recovery strategies for common failure scenarios
  - _Requirements: Robust error handling and data integrity_

- [ ]\* 8.2 Write error handling tests

  - Test input validation with invalid data
  - Test error logging and context information
  - Test partial failure scenarios and recovery
  - Test database error handling and rollback
  - _Requirements: Verify error handling robustness_

- [ ] 9. Create property-based tests for correctness properties

  - Implement property tests for all 33 correctness properties
  - Use existing property-based testing framework
  - Include proper test data generation
  - _Requirements: All correctness properties from design_

- [ ]\* 9.1 Write property test for incident creation defaults

  - **Property 1: Default Values on Creation**
  - **Validates: Requirements 1.3**

- [ ]\* 9.2 Write property test for active incident checking

  - **Property 2: Active Incident Check**
  - **Validates: Requirements 2.1**

- [ ]\* 9.3 Write property test for new incident creation

  - **Property 3: New Incident Creation**
  - **Validates: Requirements 2.2**

- [ ]\* 9.4 Write property test for existing incident association

  - **Property 4: Existing Incident Association**
  - **Validates: Requirements 2.3**

- [ ]\* 9.5 Write property test for new incident field population

  - **Property 5: New Incident Field Population**
  - **Validates: Requirements 2.4**

- [ ]\* 9.6 Write property test for latest alert tracking

  - **Property 6: Latest Alert Tracking**
  - **Validates: Requirements 2.5**

- [ ]\* 9.7 Write property test for activity time window

  - **Property 7: Activity Time Window**
  - **Validates: Requirements 3.1**

- [ ]\* 9.8 Write property test for automatic resolution

  - **Property 8: Automatic Resolution**
  - **Validates: Requirements 3.2**

- [ ]\* 9.9 Write property test for resolution timestamp

  - **Property 9: Resolution Timestamp**
  - **Validates: Requirements 3.3**

- [ ]\* 9.10 Write property test for geometry union calculation

  - **Property 10: Geometry Union Calculation**
  - **Validates: Requirements 3.4**

- [ ]\* 9.11 Write property test for service integration

  - **Property 11: Service Integration**
  - **Validates: Requirements 4.1**

- [ ]\* 9.12 Write property test for transaction integrity

  - **Property 12: Transaction Integrity**
  - **Validates: Requirements 4.2**

- [ ]\* 9.13 Write property test for transaction rollback

  - **Property 13: Transaction Rollback**
  - **Validates: Requirements 4.3**

- [ ]\* 9.14 Write property test for activity logging

  - **Property 14: Activity Logging**
  - **Validates: Requirements 4.4**

- [ ]\* 9.15 Write property test for start notification status

  - **Property 15: Start Notification Status**
  - **Validates: Requirements 5.1**

- [ ]\* 9.16 Write property test for end notification status

  - **Property 16: End Notification Status**
  - **Validates: Requirements 5.2**

- [ ]\* 9.17 Write property test for start notification tracking

  - **Property 17: Start Notification Tracking**
  - **Validates: Requirements 5.3**

- [ ]\* 9.18 Write property test for end notification tracking

  - **Property 18: End Notification Tracking**
  - **Validates: Requirements 5.4**

- [ ]\* 9.19 Write property test for duplicate notification prevention

  - **Property 19: Duplicate Notification Prevention**
  - **Validates: Requirements 5.5**

- [ ]\* 9.20 Write property test for inactive incident identification

  - **Property 20: Inactive Incident Identification**
  - **Validates: Requirements 8.1**

- [ ]\* 9.21 Write property test for resolution field updates

  - **Property 21: Resolution Field Updates**
  - **Validates: Requirements 8.2**

- [ ]\* 9.22 Write property test for resolution processing flag

  - **Property 22: Resolution Processing Flag**
  - **Validates: Requirements 8.3**

- [ ]\* 9.23 Write property test for resolution geometry update

  - **Property 23: Resolution Geometry Update**
  - **Validates: Requirements 8.4**

- [ ]\* 9.24 Write property test for CRON integration

  - **Property 24: CRON Integration**
  - **Validates: Requirements 8.5**

- [ ]\* 9.25 Write property test for error handling

  - **Property 25: Error Handling**
  - **Validates: Requirements 9.2**

- [ ]\* 9.26 Write property test for input validation

  - **Property 26: Input Validation**
  - **Validates: Requirements 9.3**

- [ ]\* 9.27 Write property test for error logging

  - **Property 27: Error Logging**
  - **Validates: Requirements 9.4**

- [ ]\* 9.28 Write property test for partial failure handling

  - **Property 28: Partial Failure Handling**
  - **Validates: Requirements 9.5**

- [ ]\* 9.29 Write property test for performance constraint

  - **Property 29: Performance Constraint**
  - **Validates: Requirements 10.1**

- [ ]\* 9.30 Write property test for query efficiency

  - **Property 30: Query Efficiency**
  - **Validates: Requirements 10.2**

- [ ]\* 9.31 Write property test for batch resolution

  - **Property 31: Batch Resolution**
  - **Validates: Requirements 10.3**

- [ ]\* 9.32 Write property test for database round trip optimization

  - **Property 32: Database Round Trip Optimization**
  - **Validates: Requirements 10.4**

- [ ]\* 9.33 Write property test for performance metrics collection

  - **Property 33: Performance Metrics Collection**
  - **Validates: Requirements 10.5**

- [ ] 10. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Add environment variable configuration

  - Add configuration options for incident resolution timing
  - Add feature flags for incident processing
  - Update environment schema and documentation
  - _Requirements: Configurable system behavior_

- [ ] 11.1 Add environment variables for incident configuration

  - Update `apps/server/src/env.mjs` with incident-related variables
  - Add `INCIDENT_RESOLUTION_HOURS` (default: 6) for inactivity threshold
  - Add `ENABLE_INCIDENT_PROCESSING` (default: true) for feature toggle
  - Add `INCIDENT_BATCH_SIZE` (default: 100) for batch processing
  - Update `.env.sample` with documentation
  - _Requirements: Configurable incident behavior_

- [ ] 12. Update documentation and logging

  - Add comprehensive logging for incident operations
  - Update system documentation with incident workflow
  - Add operational guides for incident monitoring
  - _Requirements: Operational visibility and maintenance_

- [ ] 12.1 Add comprehensive logging

  - Add structured logging for incident creation, association, and resolution
  - Include performance metrics in log entries
  - Add debug logging for troubleshooting
  - Follow existing logging patterns from geo-event-fetcher
  - _Requirements: Operational visibility_

- [ ] 12.2 Update system documentation

  - Update architecture diagrams to include SiteIncident system
  - Document incident lifecycle and resolution logic
  - Add troubleshooting guide for incident operations
  - Document performance characteristics and tuning options
  - _Requirements: Comprehensive system documentation_

- [ ] 13. Final integration and validation

  - Validate full system integration
  - Ensure backward compatibility
  - Verify performance requirements
  - _Requirements: Production-ready system_

- [ ] 13.1 Validate system integration

  - Run full integration tests with incident processing enabled
  - Verify no performance regression in geo-event-fetcher CRON
  - Test feature flag behavior and rollback capability
  - Validate incident metrics in CRON response
  - _Requirements: Complete system validation_

- [ ] 13.2 Performance validation and tuning
  - Benchmark incident operations under realistic load
  - Verify 100ms constraint per SiteAlert is maintained
  - Optimize database queries if needed
  - Validate memory usage patterns
  - _Requirements: Performance requirements compliance_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation builds on existing refactored geo-event-fetcher patterns
- Only the refactored pipeline supports SiteIncident integration
- All services follow SOLID principles with dependency injection
- Comprehensive error handling ensures data integrity
- Performance metrics provide operational visibility
