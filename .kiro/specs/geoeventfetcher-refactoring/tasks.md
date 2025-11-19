# Implementation Plan

## Phase 1: Create Foundation (Domain Models & Utilities)

- [x] 1. Create domain models

  - Create `GeoEventChecksum` value object for consistent event identity generation
  - Create `ProcessingResult` class for aggregating metrics across operations
  - _Requirements: Establish immutable domain objects for core business concepts_

- [x] 1.1 Implement GeoEventChecksum

  - Create `apps/server/src/domain/GeoEventChecksum.ts`
  - Implement constructor accepting type, latitude, longitude, eventDate
  - Implement `generate()` method using XXHash3 for checksum generation
  - Implement `equals()` method for comparison
  - _Requirements: Value object pattern for event identity_

- [ ]\* 1.2 Write unit tests for GeoEventChecksum

  - Test consistent hash generation for identical inputs
  - Test different hashes for different inputs
  - Test equals method functionality
  - _Requirements: Verify checksum generation consistency_

- [x] 1.3 Implement ProcessingResult

  - Create `apps/server/src/domain/ProcessingResult.ts`
  - Implement methods: `addEventsProcessed()`, `addEventsCreated()`, `addAlertsCreated()`, `addError()`
  - Implement `merge()` for combining results
  - Implement `toJSON()` for serialization
  - Implement static `empty()` factory method
  - _Requirements: Result aggregation pattern_

- [ ]\* 1.4 Write unit tests for ProcessingResult

  - Test metric accumulation methods
  - Test merge functionality
  - Test JSON serialization
  - _Requirements: Verify result aggregation logic_

- [x] 2. Create utility classes

  - Implement reusable utilities for batch processing, checksums, deduplication, provider selection, and factory pattern
  - _Requirements: Extract common patterns into reusable utilities_

- [x] 2.1 Implement BatchProcessor

  - Create `apps/server/src/utils/BatchProcessor.ts`
  - Implement `processBatches()` for parallel batch processing
  - Implement `processSequentially()` for sequential batch processing
  - Generic implementation supporting any item and result types
  - _Requirements: Reusable chunking logic, replaces alertFetcher lines 58-66_

- [ ]\* 2.2 Write unit tests for BatchProcessor

  - Test batch size handling
  - Test parallel vs sequential processing
  - Test empty array handling
  - _Requirements: Verify batch processing logic_

- [x] 2.3 Implement ChecksumGenerator

  - Create `apps/server/src/utils/ChecksumGenerator.ts`
  - Implement `initialize()` for XXHash3 setup
  - Implement `generateSingle()` for individual event checksums
  - Implement `generateForEvents()` returning Map<GeoEvent, string>
  - _Requirements: Centralized checksum generation, migrate from processGeoEvents.ts lines 7-16_

- [ ]\* 2.4 Write unit tests for ChecksumGenerator

  - Test single event checksum generation
  - Test batch checksum generation
  - Test checksum consistency
  - _Requirements: Verify checksum generation_

- [x] 2.5 Implement DuplicateFilter

  - Create `apps/server/src/utils/DuplicateFilter.ts`
  - Implement `filter()` for DB-based deduplication
  - Implement `filterInMemory()` for in-memory deduplication
  - _Requirements: Duplicate removal logic, migrate from processGeoEvents.ts lines 19-31, 78-89_

- [ ]\* 2.6 Write unit tests for DuplicateFilter

  - Test filtering against DB IDs
  - Test in-memory duplicate removal
  - Test empty array handling
  - _Requirements: Verify deduplication logic_

- [x] 2.7 Implement ProviderSelector

  - Create `apps/server/src/utils/ProviderSelector.ts`
  - Implement `shuffleAndSelect()` using Fisher-Yates shuffle algorithm
  - _Requirements: Provider selection logic, migrate from alertFetcher lines 49-55_

- [ ]\* 2.8 Write unit tests for ProviderSelector

  - Test shuffle randomness
  - Test limit enforcement
  - Test empty array handling
  - _Requirements: Verify provider selection_

- [x] 2.9 Implement GeoEventProviderFactory

  - Create `apps/server/src/utils/GeoEventProviderFactory.ts`
  - Implement `create()` method for provider instantiation
  - Handle config parsing and provider class registry lookup
  - _Requirements: Factory pattern for providers, migrate from alertFetcher lines 82-86_

- [ ]\* 2.10 Write unit tests for GeoEventProviderFactory

  - Test provider instantiation
  - Test config parsing
  - Test error handling for unknown providers
  - _Requirements: Verify factory pattern_

- [x] 3. Create handler utilities

  - Implement utilities for request validation, parsing, and response building
  - _Requirements: Extract handler-specific logic_

- [x] 3.1 Implement CronValidator

  - Create `apps/server/src/handlers/utils/CronValidator.ts`
  - Implement `validate()` method checking CRON_KEY
  - _Requirements: Request validation, migrate from alertFetcher lines 21-27_

- [x] 3.2 Implement RequestParser

  - Create `apps/server/src/handlers/utils/RequestParser.ts`
  - Implement `parseLimit()` with default (2) and max (7) enforcement
  - _Requirements: Request parsing, migrate from alertFetcher lines 29-43_

- [x] 3.3 Implement ResponseBuilder

  - Create `apps/server/src/handlers/utils/ResponseBuilder.ts`
  - Implement `success()` method for successful responses
  - Implement `unauthorized()` method for 403 responses
  - _Requirements: Response formatting, migrate from alertFetcher lines 134-140, 25_

- [ ]\* 3.4 Write unit tests for handler utilities
  - Test CronValidator with valid/invalid keys
  - Test RequestParser with various limit values
  - Test ResponseBuilder output formats
  - _Requirements: Verify handler utilities_

## Phase 2: Create Repositories (Data Access Layer)

- [x] 4. Implement GeoEventProviderRepository

  - Centralize all GeoEventProvider database operations
  - _Requirements: Repository pattern for provider data access_

- [x] 4.1 Create GeoEventProviderRepository class

  - Create `apps/server/src/repositories/GeoEventProviderRepository.ts`
  - Implement constructor accepting Prisma client
  - Implement `findEligibleProviders()` with raw SQL query
  - Implement `updateLastRun()` for timestamp updates
  - _Requirements: Migrate from alertFetcher lines 39-48, 122-129_

- [ ]\* 4.2 Write integration tests for GeoEventProviderRepository

  - Test eligible provider query with test database
  - Test lastRun update functionality
  - Test edge cases (no providers, all processed)
  - _Requirements: Verify repository operations_

- [x] 5. Implement GeoEventRepository

  - Centralize all GeoEvent database operations
  - _Requirements: Repository pattern for event data access_

- [x] 5.1 Create GeoEventRepository class

  - Create `apps/server/src/repositories/GeoEventRepository.ts`
  - Implement constructor accepting Prisma client
  - Implement `fetchExistingIds()` for duplicate checking (30 hours window)
  - Implement `bulkCreate()` with batch size support (1000 records)
  - Implement `findUnprocessedByProvider()` with limit
  - Implement `markAsProcessed()` for batch updates
  - Implement `markStaleAsProcessed()` for events >24hrs
  - _Requirements: Migrate from processGeoEvents.ts lines 58-66, 97-106 and createSiteAlerts.ts lines 13-17, 22-31_

- [ ]\* 5.2 Write integration tests for GeoEventRepository

  - Test fetchExistingIds with various time windows
  - Test bulkCreate with batching
  - Test findUnprocessedByProvider
  - Test markAsProcessed and markStaleAsProcessed
  - _Requirements: Verify repository operations_

- [x] 6. Implement SiteAlertRepository

  - Centralize all SiteAlert database operations with provider-specific logic
  - _Requirements: Repository pattern for alert data access_

- [x] 6.1 Create SiteAlertRepository class

  - Create `apps/server/src/repositories/SiteAlertRepository.ts`
  - Implement constructor accepting Prisma client
  - Implement `createAlertsForGeostationary()` with PostGIS spatial join
  - Implement `createAlertsForPolar()` with different slice handling
  - Handle transaction management (insert + mark processed)
  - _Requirements: Migrate from createSiteAlerts.ts lines 37-118, 141-213_

- [ ]\* 6.2 Write integration tests for SiteAlertRepository
  - Test GEOSTATIONARY alert creation with spatial joins
  - Test POLAR alert creation with different logic
  - Test transaction rollback on errors
  - _Requirements: Verify spatial query operations_

## Phase 3: Create Services (Business Logic Layer)

- [x] 7. Implement GeoEventService

  - Coordinate event processing pipeline: checksum generation, deduplication, persistence
  - _Requirements: Service layer for event processing business logic_

- [x] 7.1 Create GeoEventService class

  - Create `apps/server/src/services/GeoEventService.ts`
  - Implement constructor with dependencies (repository, checksumGenerator, duplicateFilter, batchProcessor)
  - Implement `deduplicateAndSave()` method
  - Implement `processEvents()` method for full pipeline
  - _Requirements: Migrate from processGeoEvents.ts entire file_

- [ ]\* 7.2 Write unit tests for GeoEventService

  - Mock repository and test deduplication logic
  - Test event processing pipeline
  - Test error handling
  - _Requirements: Verify service orchestration_

- [x] 8. Implement SiteAlertService

  - Coordinate alert creation workflow with provider-specific batch processing
  - _Requirements: Service layer for alert creation business logic_

- [x] 8.1 Create SiteAlertService class

  - Create `apps/server/src/services/SiteAlertService.ts`
  - Implement constructor with dependencies (repository, geoEventRepository, batchProcessor)
  - Implement `createAlertsForProvider()` with stale event handling
  - Implement `processBatch()` with provider-type routing
  - Handle batch size differences (500 for GEOSTATIONARY, 1000 for others)
  - _Requirements: Migrate from createSiteAlerts.ts entire file_

- [ ]\* 8.2 Write unit tests for SiteAlertService

  - Mock repositories and test alert creation flow
  - Test batch processing logic
  - Test provider-specific routing
  - _Requirements: Verify service orchestration_

- [x] 9. Implement GeoEventProviderService

  - Orchestrate entire provider processing workflow with concurrency control
  - _Requirements: Top-level service for provider processing_

- [x] 9.1 Create GeoEventProviderService class

  - Create `apps/server/src/services/GeoEventProviderService.ts`
  - Implement constructor with dependencies (providerRepository, geoEventService, siteAlertService, providerFactory, queue)
  - Implement `processProvider()` for single provider
  - Implement `processProviders()` with PQueue concurrency control (limit: 3)
  - Aggregate results using ProcessingResult.merge()
  - _Requirements: Migrate from alertFetcher lines 76-132_

- [ ]\* 9.2 Write unit tests for GeoEventProviderService
  - Mock dependencies and test provider processing
  - Test concurrency control
  - Test result aggregation
  - Test error handling per provider
  - _Requirements: Verify service orchestration_

## Phase 4: Refactor Handler

- [-] 10. Refactor geo-event-fetcher API handler

  - Replace existing implementation with new service-based architecture
  - _Requirements: Clean handler using new services_

- [x] 10.1 Update alertFetcher handler

  - Update `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
  - Replace inline logic with CronValidator, RequestParser, ResponseBuilder
  - Instantiate repositories and services with dependency injection
  - Use GeoEventProviderService for processing
  - Keep old implementation as backup (.backup extension)
  - _Requirements: Clean separation of concerns in handler_

- [ ]\* 10.2 Write integration tests for refactored handler

  - Test full API flow with test database
  - Test authentication/authorization
  - Test limit parameter handling
  - Test response format
  - _Requirements: Verify end-to-end functionality_

- [x] 10.3 Add feature flag for gradual rollout

  - Add `USE_REFACTORED_PIPELINE` environment variable
  - Implement conditional logic to switch between old/new implementation
  - Document rollback procedure
  - _Requirements: Safe deployment strategy_

- [x] 10.4 Add FIRMS API Key environment variable (Use Existing FIRMS_MAP_KEY).
  - Add `FIRMS_API_KEY` to environment variable schema in `apps/server/src/env.mjs`
  - Update `NasaGeoEventProviderClass.getUrl()` to use `FIRMS_API_KEY` from env if present
  - Fallback to `clientApiKey` parameter if `FIRMS_API_KEY` is not set
  - Update `.env.sample` with `FIRMS_API_KEY` documentation
  - _Requirements: Centralized FIRMS API key configuration with backward compatibility_

## Phase 5: Validation & Cleanup

- [ ] 11. Parallel testing and validation

  - Run old and new implementations side-by-side to verify consistency
  - _Requirements: Zero business impact validation_

- [ ] 11.1 Create comparison test suite

  - Run both implementations with same inputs
  - Compare processing results (events created, alerts created)
  - Log any discrepancies
  - _Requirements: Verify functional equivalence_

- [ ] 11.2 Performance benchmarking

  - Measure processing time per provider
  - Monitor memory usage during batch operations
  - Track event deduplication ratio
  - Track alert creation success rate
  - _Requirements: Verify performance improvements_

- [ ] 11.3 Monitor production rollout

  - Deploy with feature flag enabled for 10% traffic
  - Monitor error rates for 48 hours
  - Gradually increase to 100% if error rate < 5% increase
  - _Requirements: Safe production deployment_

- [ ] 12. Cleanup and documentation

  - Remove old implementation files after successful rollout
  - Update documentation
  - _Requirements: Clean codebase_

- [ ] 12.1 Remove deprecated files

  - Delete `processGeoEvents.ts` backup
  - Delete `createSiteAlerts.ts` backup
  - Delete old alertFetcher backup
  - _Requirements: Remove technical debt_

- [ ] 12.2 Update system documentation
  - Document new architecture in README
  - Add API documentation for services
  - Document dependency injection setup
  - _Requirements: Maintainable codebase_

## Phase 6: Type Safety Improvements

- [x] 13. Add proper TypeScript type definitions for legacy implementation

  - Eliminate `any` types and improve type safety in the legacy implementation
  - Create proper type definitions for provider configurations and responses
  - _Requirements: Type-safe legacy code for safer rollback_

- [x] 13.1 Create GeoEventProvider type definitions

  - Create `apps/server/src/types/GeoEventProvider.types.ts`
  - Define `ProviderConfig` interface for parsed provider configurations
  - Define `ProviderData` interface for provider destructured data
  - Define `ProcessedGeoEventResult` interface for processGeoEvents return type
  - _Requirements: Type safety for provider operations_

- [x] 13.2 Update legacyImplementation with proper types

  - Replace `any[]` for `activeProviders` with `GeoEventProvider[]`
  - Replace `any` for `provider` parameter with typed interface
  - Add proper return type annotations for inline functions
  - Type the `geoEvents` parameter in promise chain
  - _Requirements: Eliminate unsafe `any` usage in legacy code_

- [x] 13.3 Create type guards and validators

  - Create `apps/server/src/utils/typeGuards.ts`
  - Implement `isValidProviderConfig()` type guard
  - Implement `isGeoEventArray()` type guard
  - Add runtime validation for critical data structures
  - _Requirements: Runtime type safety_

- [x] 13.4 Update GeoEventHandler types

  - Review `apps/server/src/Services/GeoEvent/GeoEventHandler.ts`
  - Ensure proper return type for `processGeoEvents()`
  - Add JSDoc comments with type information
  - _Requirements: Clear interface contracts_

- [x] 13.5 Update CreateSiteAlert types

  - Review `apps/server/src/Services/SiteAlert/CreateSiteAlert.ts`
  - Ensure proper return type (number for alert count)
  - Add JSDoc comments with type information
  - _Requirements: Clear interface contracts_

- [x] 13.6 Add type definitions for provider class methods

  - Review `GeoEventProviderClass` interface
  - Ensure `getLatestGeoEvents()` has proper return type
  - Document expected parameter types
  - _Requirements: Type-safe provider implementations_

## Phase 7: Bug Fixes and Performance Improvements

- [x] 14. Fix critical bugs in refactored implementation

  - Fix SiteAlert update query bug and add event chunking for memory optimization
  - _Requirements: Correct batch processing and memory efficiency_

- [x] 14.1 Fix SiteAlertRepository polar update query

  - Update `apps/server/src/repositories/SiteAlertRepository.ts` line 217
  - Change `UPDATE "GeoEvent" SET "isProcessed" = true WHERE "geoEventProviderId" = ${geoEventProviderId}`
  - To `UPDATE "GeoEvent" SET "isProcessed" = true WHERE id IN (${Prisma.join(eventIds)})`
  - Verify `createAlertsForGeostationary()` line 117 already uses correct WHERE clause
  - _Requirements: Fix bug where ALL events are marked processed instead of just current batch_

- [x] 14.2 Verify slice field in provider implementations

  - Check `apps/server/src/Services/GeoEventProvider/NasaGeoEventProviderClass.ts`
  - Check `apps/server/src/Services/GeoEventProvider/GOES16GeoEventProviderClass.ts`
  - Verify `getLatestGeoEvents()` adds `slice` field to each event object
  - Confirm events are returned as `{ ...eventData, slice: this.config.slice }`
  - _Requirements: Ensure slice field exists before implementing chunking_

- [x] 14.3 Add event chunking in GeoEventProviderService

  - Update `apps/server/src/Services/GeoEventProviderService.ts` in `processProvider()` method
  - Replace direct call to `this.geoEventService.deduplicateAndSave(geoEvents, geoEventProviderId)`
  - Implement chunking with `BatchProcessor.processSequentially()` using chunk size 2000
  - Process each chunk through `deduplicateAndSave()` sequentially
  - Aggregate results from all chunks (sum `created` and `new` counts)
  - Update logging to reflect aggregated totals
  - _Requirements: Prevent memory issues when processing large event batches_

- [x] 14.4 Update GeoEventService to handle chunked processing

  - Review `apps/server/src/Services/GeoEventService.ts`
  - Ensure `deduplicateAndSave()` works correctly with event chunks
  - Verify checksum generation handles partial batches
  - Confirm duplicate filtering works across chunk boundaries
  - _Requirements: Maintain deduplication accuracy with chunked processing_

- [x] 14.5 Add logging for chunk processing

  - Add debug logs in `GeoEventProviderService.processProvider()` for chunk processing
  - Log chunk number, chunk size, and running totals
  - Add timing information for each chunk
  - _Requirements: Observability for chunked processing performance_

## Phase 8: Fix SiteAlert Creation Bug (0 Alerts Created)

## Phase 8 Addendum: ACTUAL BUG FOUND - markStaleAsProcessed Timing

- [x] 15 FIX: Move markStaleAsProcessed to END of createAlertsForProvider

  - **ROOT CAUSE IDENTIFIED**: Line 36 in `SiteAlertService.ts` calls `markStaleAsProcessed(24)` BEFORE querying for unprocessed events
  - **IMPACT**: Events older than 24 hours get marked as processed immediately, then query finds 0 unprocessed events
  - **FIX**: Move `await this.geoEventRepository.markStaleAsProcessed(24)` to the END of the method (after the while loop)
  - Update `apps/server/src/Services/SiteAlertService.ts`
  - Move the markStaleAsProcessed call to line ~62 (after the while loop completes)
  - This ensures alerts are created BEFORE events are marked as stale
  - _Requirements: Fix the workflow order to match legacy behavior_
