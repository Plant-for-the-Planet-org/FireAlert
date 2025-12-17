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

## Phase 9: Consolidate & Reorganize Utilities (Reduce Fragmentation)

- [x] 16. Consolidate and reorganize utilities for better maintainability

  - Reduce fragmentation by grouping related utilities and simplifying names
  - Move all utilities into `apps/server/src/utils/` directory
  - Eliminate `domain/` and `handlers/` directories under `src/`
  - Maintain separation of concerns while improving code organization
  - _Requirements: Cleaner, more maintainable utility structure_

- [x] 16.1 Consolidate event processing utilities

  - Merge `ChecksumGenerator.ts` and `DuplicateFilter.ts` into single `EventProcessor.ts`
  - Move to `apps/server/src/utils/EventProcessor.ts`
  - Rename class to `EventProcessor` with methods: `generateChecksums()`, `filterDuplicates()`, `filterInMemory()`
  - Update imports in `GeoEventService.ts`
  - _Requirements: Group related event processing logic, reduce file count_

- [x] 16.2 Consolidate provider utilities

  - Merge `ProviderSelector.ts` and `GeoEventProviderFactory.ts` into single `ProviderManager.ts`
  - Move to `apps/server/src/utils/ProviderManager.ts`
  - Rename class to `ProviderManager` with methods: `selectProviders()`, `createProvider()`
  - Update imports in `GeoEventProviderService.ts`
  - _Requirements: Group related provider operations, reduce file count_

- [x] 16.3 Consolidate handler utilities into single module

  - Merge `CronValidator.ts`, `RequestParser.ts`, `ResponseBuilder.ts` into `RequestHandler.ts`
  - Move to `apps/server/src/utils/RequestHandler.ts`
  - Rename class to `RequestHandler` with static methods: `validateCron()`, `parseLimit()`, `buildSuccess()`, `buildUnauthorized()`
  - Update imports in `geo-event-fetcher.ts`
  - _Requirements: Consolidate handler-specific logic, improve organization_

- [x] 16.4 Rename domain models for clarity

  - Rename `GeoEventChecksum.ts` to `EventId.ts` (value object for event identity)
  - Rename `ProcessingResult.ts` to `OperationResult.ts` (more generic, reusable name)
  - Move both files to `apps/server/src/utils/`
  - Update class names and all imports across services and repositories
  - _Requirements: Clearer, more concise naming_

- [x] 16.5 Move domain models from domain/ to utils/

  - Move `apps/server/src/domain/EventId.ts` to `apps/server/src/utils/EventId.ts`
  - Move `apps/server/src/domain/OperationResult.ts` to `apps/server/src/utils/OperationResult.ts`
  - Verify all imports are updated
  - _Requirements: Consolidate all utilities in single directory_

- [x] 16.6 Create utility index file for cleaner imports

  - Create `apps/server/src/utils/index.ts` exporting: `EventId`, `OperationResult`, `EventProcessor`, `ProviderManager`, `RequestHandler`
  - Update all service and handler imports to use barrel export
  - _Requirements: Simplified import statements across codebase_

- [x] 16.7 Update service constructors with consolidated utilities

  - Update `GeoEventService.ts` to use `EventProcessor` instead of separate `ChecksumGenerator` and `DuplicateFilter`
  - Update `GeoEventProviderService.ts` to use `ProviderManager` instead of separate `ProviderSelector` and `GeoEventProviderFactory`
  - Update `geo-event-fetcher.ts` handler to use `RequestHandler` instead of separate validators/parsers/builders
  - _Requirements: Cleaner dependency injection, fewer constructor parameters_

- [x] 16.8 Remove old utility files and empty directories

  - Delete `apps/server/src/utils/ChecksumGenerator.ts`
  - Delete `apps/server/src/utils/DuplicateFilter.ts`
  - Delete `apps/server/src/utils/ProviderSelector.ts`
  - Delete `apps/server/src/utils/GeoEventProviderFactory.ts`
  - Delete `apps/server/src/handlers/utils/CronValidator.ts`
  - Delete `apps/server/src/handlers/utils/RequestParser.ts`
  - Delete `apps/server/src/handlers/utils/ResponseBuilder.ts`
  - Delete empty directory `apps/server/src/handlers/utils/`
  - Delete empty directory `apps/server/src/handlers/`
  - Delete empty directory `apps/server/src/domain/`
  - _Requirements: Clean up old files and eliminate empty directories_

- [x] 16.9 Verify all tests pass after consolidation

  - Run unit tests for consolidated utilities
  - Run integration tests for services
  - Run handler integration tests
  - Verify no import errors or type mismatches
  - _Requirements: Ensure refactoring maintains functionality_

- [x] 16.10 Update documentation with new structure

  - Update architecture diagrams to reflect consolidated utilities
  - Document new import patterns using barrel exports
  - Update CONSOLIDATION_STRATEGY.md with final structure
  - Add migration guide for future developers
  - _Requirements: Clear documentation of new organization_

## Phase 10: Update Imports & Type Definitions

- [x] 16.11 Update all imports after repository reorganization

  - Update imports in all files that reference repositories moved to Services subdirectories
  - Files involved in this import update:
    - `apps/server/src/Services/GeoEvent/GeoEventService.ts` - Uses `GeoEventRepository`
    - `apps/server/src/Services/GeoEventProvider/GeoEventProviderService.ts` - Uses `GeoEventProviderRepository`
    - `apps/server/src/Services/SiteAlert/SiteAlertService.ts` - Uses `SiteAlertRepository` and `GeoEventRepository`
    - `apps/server/src/pages/api/cron/geo-event-fetcher.ts` - Uses all three repositories
    - `apps/server/src/utils/EventProcessor.ts` - Consolidated utility
    - `apps/server/src/utils/ProviderManager.ts` - Consolidated utility
    - `apps/server/src/utils/RequestHandler.ts` - Consolidated utility
    - `apps/server/src/utils/EventId.ts` - Renamed domain model
    - `apps/server/src/utils/OperationResult.ts` - Renamed domain model
  - Verify all relative import paths are correct after reorganization
  - Ensure no broken imports or circular dependencies
  - _Requirements: Correct all import paths after repository relocation_

- [x] 16.12 Update ARCHITECTURE_FLOW_DIAGRAM.md with new structure

  - Update all diagrams to reflect consolidated utilities (EventProcessor, ProviderManager, RequestHandler)
  - Update diagrams to show repositories in Services subdirectories
  - Update component dependency graph with new file locations
  - Update import examples to use barrel exports from utils/
  - Update file structure diagrams to show new organization
  - _Requirements: Accurate architecture documentation_

- [x] 17. Check and fix all TypeScript type definitions

  - Review all files involved in the refactoring for type safety
  - Files to review:
    - `apps/server/src/utils/EventProcessor.ts` - Verify XXHashAPI usage and return types
    - `apps/server/src/utils/ProviderManager.ts` - Verify GeoEventProvider and GeoEventProviderClass types
    - `apps/server/src/utils/RequestHandler.ts` - Verify NextApiRequest/Response types
    - `apps/server/src/utils/EventId.ts` - Verify XXHashAPI and return types
    - `apps/server/src/utils/OperationResult.ts` - Verify metric types and merge return type
    - `apps/server/src/Services/GeoEvent/GeoEventService.ts` - Verify GeoEvent interface and return types
    - `apps/server/src/Services/GeoEvent/GeoEventRepository.ts` - Verify Prisma types and query returns
    - `apps/server/src/Services/GeoEventProvider/GeoEventProviderService.ts` - Verify OperationResult and provider types
    - `apps/server/src/Services/GeoEventProvider/GeoEventProviderRepository.ts` - Verify GeoEventProvider types
    - `apps/server/src/Services/SiteAlert/SiteAlertService.ts` - Verify batch processing types
    - `apps/server/src/Services/SiteAlert/SiteAlertRepository.ts` - Verify PostGIS and Prisma types
    - `apps/server/src/pages/api/cron/geo-event-fetcher.ts` - Verify NextApiRequest/Response types
  - _Requirements: Type-safe implementation across all refactored code_

- [x] 17.1 Fix EventProcessor type definitions

  - Ensure `generateChecksums()` returns `Map<GeoEvent, string>`
  - Ensure `filterDuplicates()` returns `GeoEvent[]`
  - Ensure `filterInMemory()` returns `GeoEvent[]`
  - Add proper type annotations for all parameters
  - Verify XXHashAPI initialization and usage
  - _Requirements: Type-safe event processing_

- [x] 17.2 Fix ProviderManager type definitions

  - Ensure `selectProviders()` returns `GeoEventProvider[]`
  - Ensure `createProvider()` returns `GeoEventProviderClass`
  - Add proper type annotations for GeoEventProvider parameter
  - Verify GeoEventProviderConfig type usage
  - _Requirements: Type-safe provider management_

- [x] 17.3 Fix RequestHandler type definitions

  - Ensure `validateCron()` returns `boolean`
  - Ensure `parseLimit()` returns `number`
  - Ensure `buildSuccess()` returns proper response object type
  - Ensure `buildUnauthorized()` returns proper response object type
  - Add proper type annotations for NextApiRequest parameter
  - _Requirements: Type-safe request handling_

- [x] 17.4 Fix EventId type definitions

  - Ensure `generate()` returns `string`
  - Ensure `equals()` returns `boolean`
  - Add proper type annotations for all constructor parameters
  - Verify XXHashAPI parameter type
  - _Requirements: Type-safe event identity_

- [x] 17.5 Fix OperationResult type definitions

  - Ensure all add methods accept `number` parameter
  - Ensure `merge()` returns `OperationResult`
  - Ensure `toJSON()` returns proper object type with all metrics
  - Ensure `empty()` static method returns `OperationResult`
  - Add proper type annotations for all methods
  - _Requirements: Type-safe operation results_

- [x] 17.6 Fix GeoEventService type definitions

  - Ensure `deduplicateAndSave()` returns `Promise<{created: number; new: number}>`
  - Verify GeoEvent interface usage
  - Verify EventProcessor type usage
  - Add proper type annotations for all parameters
  - _Requirements: Type-safe event service_

- [x] 17.7 Fix GeoEventRepository type definitions

  - Ensure `fetchExistingIds()` returns `Promise<string[]>`
  - Ensure `bulkCreate()` returns `Promise<number>`
  - Ensure `findUnprocessedByProvider()` returns `Promise<GeoEvent[]>`
  - Ensure `markAsProcessed()` returns `Promise<void>`
  - Ensure `markStaleAsProcessed()` returns `Promise<void>`
  - Verify Prisma client type usage
  - _Requirements: Type-safe database operations_

- [x] 17.8 Fix GeoEventProviderService type definitions

  - Ensure `processProviders()` returns `Promise<OperationResult>`
  - Ensure `processEachProvider()` returns `Promise<OperationResult>`
  - Verify ProviderManager type usage
  - Verify GeoEventProvider type usage
  - Add proper type annotations for all parameters
  - _Requirements: Type-safe provider orchestration_

- [x] 17.9 Fix GeoEventProviderRepository type definitions

  - Ensure `findEligibleProviders()` returns `Promise<GeoEventProvider[]>`
  - Ensure `updateLastRun()` returns `Promise<void>`
  - Verify Prisma client type usage
  - Add proper type annotations for all parameters
  - _Requirements: Type-safe provider repository_

- [x] 17.10 Fix SiteAlertService type definitions

  - Ensure `createAlertsForProvider()` returns `Promise<number>`
  - Ensure `processBatch()` returns `Promise<number>`
  - Verify batch size type usage
  - Verify GeoEventProviderClientId type usage
  - Add proper type annotations for all parameters
  - _Requirements: Type-safe alert service_

- [x] 17.11 Fix SiteAlertRepository type definitions

  - Ensure `createAlertsForGeostationary()` returns `Promise<number>`
  - Ensure `createAlertsForPolar()` returns `Promise<number>`
  - Verify PostGIS query types
  - Verify Prisma transaction types
  - Add proper type annotations for all parameters
  - _Requirements: Type-safe alert repository_

- [x] 17.12 Fix handler type definitions

  - Ensure all imports have proper types
  - Verify NextApiRequest and NextApiResponse types
  - Verify OperationResult type usage
  - Verify RequestHandler type usage
  - Add proper type annotations for all variables
  - _Requirements: Type-safe API handler_

- [x] 17.13 Verify no `any` types remain in refactored code

  - Search for `any` type usage in all refactored files
  - Replace with proper type definitions
  - Add type guards where necessary
  - Document any unavoidable `any` types with comments
  - _Requirements: Eliminate unsafe type usage_

- [x] 17.14 Add JSDoc type annotations to all public methods

  - Add JSDoc comments with `@param` and `@returns` type annotations
  - Document all public methods in consolidated utilities
  - Document all public methods in services
  - Document all public methods in repositories
  - _Requirements: Clear type documentation_

- [x] 17.15 Run TypeScript compiler to verify all types

  - Run `tsc --noEmit` to check for type errors
  - Verify no type mismatches in imports
  - Verify no missing type definitions
  - Verify no circular type dependencies
  - _Requirements: Type-safe compilation_

## Phase 11: Performance Metrics & Observability

- [ ] 18. Add comprehensive performance metrics to processing pipeline

  - Implement detailed timing and performance tracking throughout the system
  - Enable identification of bottlenecks and system health monitoring
  - _Requirements: Observability for performance analysis_

- [x] 18.1 Create PerformanceMetrics domain model

  - Create `apps/server/src/utils/PerformanceMetrics.ts`
  - Implement `startTimer(label: string): void` for starting named timers
  - Implement `endTimer(label: string): number` returning duration in milliseconds
  - Implement `recordMetric(label: string, value: number): void` for custom metrics
  - Implement `getMetrics(): object` returning all recorded metrics
  - Implement `merge(other: PerformanceMetrics): PerformanceMetrics` for combining results
  - Support nested timing (e.g., provider → chunks → deduplication)
  - _Requirements: Metrics tracking infrastructure_

- [ ]\* 18.2 Write unit tests for PerformanceMetrics

  - Test timer start/end functionality
  - Test duration calculation accuracy
  - Test metric recording and retrieval
  - Test merge functionality with multiple metrics
  - Test nested timer scenarios
  - _Requirements: Verify metrics collection logic_

- [x] 18.3 Integrate PerformanceMetrics into OperationResult

  - Update `apps/server/src/utils/OperationResult.ts`
  - Add `metrics?: PerformanceMetrics` field to store performance data
  - Update `toJSON()` to include metrics breakdown in response
  - Implement `setMetrics(metrics: PerformanceMetrics): void` method
  - _Requirements: Include metrics in operation results_

- [x] 18.4 Add timing to GeoEventProviderService

  - Update `apps/server/src/Services/GeoEventProvider/GeoEventProviderService.ts`
  - Add metrics tracking in `processProviders()` for total duration
  - Track per-provider processing time in `processProvider()`
  - Track event fetching time from provider API
  - Track chunk processing time (per chunk)
  - Track alert creation time
  - Track database update time
  - Aggregate metrics across all providers
  - _Requirements: Provider-level performance visibility_

- [x] 18.5 Add timing to GeoEventService

  - Update `apps/server/src/Services/GeoEvent/GeoEventService.ts`
  - Track checksum generation time in `deduplicateAndSave()`
  - Track database fetch time for existing IDs
  - Track duplicate filtering time (DB + in-memory)
  - Track bulk insert time
  - _Requirements: Event processing performance visibility_

- [x] 18.6 Add timing to SiteAlertService

  - Update `apps/server/src/Services/SiteAlert/SiteAlertService.ts`
  - Track mark stale time in `createAlertsForProvider()`
  - Track per-batch alert creation time in `processBatch()`
  - Track total alert creation time
  - Track provider-specific query execution time
  - _Requirements: Alert creation performance visibility_

- [x] 18.7 Update RequestHandler response formatting

  - Update `apps/server/src/utils/RequestHandler.ts`
  - Modify `buildSuccess()` to include metrics breakdown in response
  - Include total_duration_ms, provider_processing details, avg_chunk_duration_ms
  - Include slowest_chunk_ms and other performance indicators
  - _Requirements: Expose metrics in API response_

- [x] 18.8 Add performance-based logging

  - Update logging in `GeoEventProviderService.ts`
  - Log at INFO level for providers taking >5 seconds
  - Log at INFO level for chunks taking >2 seconds
  - Log at INFO level for alert creation taking >3 seconds
  - Log at WARN level for providers taking >30 seconds
  - Log at WARN level for any operation timing out
  - Include timing details in all performance-related logs
  - _Requirements: Performance monitoring and alerting_

- [x] 18.9 Verify metrics output in API response

  - Test that metrics are correctly included in success response
  - Verify metrics structure matches expected format
  - Test metrics aggregation across multiple providers
  - Validate timing accuracy
  - _Requirements: Metrics visibility in production_

## Phase 12: Performance Audit & Bottleneck Analysis

- [ ] 19. Audit and optimize database query performance

  - Identify and fix database query bottlenecks
  - Optimize indexes and query patterns
  - _Requirements: Database performance optimization_

- [x] 19.1 Verify database indexes

  - Check `apps/server/prisma/schema.prisma` for existing indexes
  - Verify indexes on `GeoEventProvider.geoEventProviderId`
  - Verify indexes on `GeoEvent.eventDate`
  - Verify indexes on `GeoEvent.id`
  - Verify spatial indexes on `Site.detectionGeometry` (GIST)
  - Run SQL query to list all indexes: `SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN ('Site', 'GeoEvent', 'GeoEventProvider')`
  - Document findings in performance audit report
  - _Requirements: Verify database optimization_

- [x] 19.2 Optimize fetchExistingIds query

  - Review `apps/server/src/Services/GeoEvent/GeoEventRepository.ts` `fetchExistingIds()` method
  - Analyze current 30-hour time window for duplicate checking
  - Evaluate if time window can be reduced to 6-12 hours for active providers
  - Implement query once before chunking instead of per-chunk
  - Pass existing IDs through pipeline to avoid re-querying
  - Update `GeoEventService.deduplicateAndSave()` to accept pre-fetched IDs
  - Add metrics to track query execution time
  - _Requirements: Reduce database query count_

- [ ] 19.3 Profile spatial join queries

  - Review `apps/server/src/Services/SiteAlert/SiteAlertRepository.ts` alert creation queries
  - Run EXPLAIN ANALYZE on `createAlertsForGeostationary()` query
  - Run EXPLAIN ANALYZE on `createAlertsForPolar()` query
  - Document query execution plans
  - Identify missing indexes or inefficient joins
  - Consider if Site data can be cached (if Sites don't change frequently)
  - Add query timing metrics
  - _Requirements: Identify spatial query bottlenecks_

- [x] 19.4 Make PQueue concurrency configurable

  - Update `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
  - Add `PROVIDER_CONCURRENCY` environment variable (default: 3)
  - Update `env.mjs` to include new environment variable
  - Use configurable concurrency in PQueue initialization
  - Document concurrency tuning recommendations
  - _Requirements: Flexible concurrency control_

- [ ] 19.5 Analyze ChecksumGenerator initialization

  - Review `apps/server/src/utils/EventProcessor.ts` (formerly ChecksumGenerator)
  - Measure XXHash3 initialization time
  - Determine if initialization is expensive per request
  - Consider singleton pattern or lazy initialization if needed
  - Add timing metrics for initialization
  - Document findings
  - _Requirements: Verify hasher initialization performance_

- [ ] 19.6 Monitor memory usage during processing

  - Add memory usage logging in `GeoEventProviderService.processProvider()`
  - Log heap usage before and after event fetching
  - Log heap usage before and after chunking
  - Set alerts for heap usage >500MB
  - Track memory growth patterns
  - Document memory usage findings
  - _Requirements: Memory usage monitoring_

- [ ] 19.7 Analyze transaction overhead

  - Review `apps/server/src/Services/SiteAlert/SiteAlertRepository.ts` transaction usage
  - Measure transaction overhead per batch
  - Evaluate if multiple small batches can be combined
  - Verify transaction isolation level is appropriate
  - Document transaction performance findings
  - _Requirements: Transaction performance analysis_

- [x] 19.8 Create performance audit report

  - Document all findings from performance audit
  - Include before/after metrics for any optimizations applied
  - List identified bottlenecks and their impact
  - Provide recommendations for infrastructure changes
  - Include database tuning recommendations
  - _Requirements: Comprehensive performance documentation_

## Phase 13: Code Optimizations & Advanced Performance Improvements

- [x] 20. Implement advanced performance optimizations

  - Apply high-priority optimizations identified in audit
  - Maintain code quality and correctness
  - _Requirements: Performance improvement implementation_

- [ ] 20.1 Implement batch provider updates

  - Update `apps/server/src/Services/GeoEventProvider/GeoEventProviderRepository.ts`
  - Add `updateLastRunBatch()` method for batch updates
  - Collect all provider updates during processing
  - Execute single batch update at end instead of individual updates
  - Update `GeoEventProviderService.processProviders()` to use batch updates
  - _Requirements: Reduce database write operations_

- [x] 20.2 Implement single existing IDs query

  - Update `apps/server/src/Services/GeoEvent/GeoEventService.ts`
  - Modify `deduplicateAndSave()` to accept optional pre-fetched IDs
  - Update `GeoEventProviderService.processProvider()` to fetch IDs once
  - Pass fetched IDs to all chunks to avoid re-querying
  - Add metrics to track query reduction
  - _Requirements: Reduce duplicate checking queries_

- [ ] 20.3 Implement early exit strategies

  - Update `GeoEventService.deduplicateAndSave()` to skip bulk insert if no unique events
  - Update `SiteAlertService.createAlertsForProvider()` to exit loop if no unprocessed events
  - Add logging for early exits
  - _Requirements: Skip unnecessary operations_

- [ ] 20.4 Implement provider-level skip logic

  - Update `GeoEventProviderService.processProvider()`
  - If provider returns 0 events, log and skip subsequent processing
  - Track providers with consistent 0 events
  - Consider temporary backoff for inactive providers
  - _Requirements: Skip processing for inactive providers_

- [ ] 20.5 Optimize logging strategy

  - Review logging throughout refactored code
  - Use DEBUG level for chunk-level details
  - Use INFO level for provider-level operations
  - Use WARN level for performance issues
  - Batch related logs where possible
  - Consider structured logging (JSON) for better parsing
  - _Requirements: Optimized logging for performance_

- [ ] 20.6 Implement array operation micro-optimizations

  - Review `OperationResult.merge()` and similar array operations
  - Replace multiple reduce calls with single-pass operations
  - Minimize object creation in hot paths (inside loops)
  - Document any micro-optimizations applied
  - _Requirements: Code-level performance improvements_

- [x] 20.7 Verify Prisma prepared statements

  - Review Prisma client configuration
  - Verify prepared statements are enabled for repeated queries
  - Check connection pooling settings
  - Document Prisma optimization findings
  - _Requirements: Database driver optimization_

- [x] 20.8 Implement optional Site data caching

  - Create `apps/server/src/utils/SiteCache.ts` (optional optimization)
  - Implement in-memory cache for Site geometries
  - Set TTL to 5 minutes for cache invalidation
  - Only implement if profiling shows Site queries are bottleneck
  - Add cache hit/miss metrics
  - _Requirements: Optional caching for frequently accessed data_

- [x] 20.9 Implement optional provider config caching

  - Update `apps/server/src/utils/ProviderManager.ts`
  - Cache parsed provider configs with provider ID as key
  - Avoid re-parsing JSON config on every provider process
  - Add cache invalidation strategy
  - Add metrics for cache effectiveness
  - _Requirements: Reduce config parsing overhead_

- [x] 20.10 Evaluate parallel chunk processing

  - Analyze if chunks can be processed in parallel safely
  - Review duplicate detection for race conditions
  - If safe, implement parallel processing option
  - Make parallel processing configurable via environment variable
  - Document decision and trade-offs
  - _Requirements: Evaluate parallelization opportunities_

- [x] 20.11 Create performance optimization summary

  - Document all optimizations implemented
  - Include before/after metrics for each optimization
  - Calculate cumulative performance improvement
  - List optimizations that were evaluated but not implemented (with reasons)
  - Provide recommendations for future optimizations
  - _Requirements: Comprehensive optimization documentation_

## Phase 14: Performance Validation & Benchmarking

- [ ] 21. Validate performance improvements and establish baselines

  - Benchmark refactored implementation against legacy
  - Verify no performance regressions
  - Establish performance baselines for future comparisons
  - _Requirements: Performance validation_

- [ ] 21.1 Create performance benchmarking suite

  - Create test data with various event volumes (1k, 10k, 50k, 100k events)
  - Create test scenarios for different provider types
  - Document benchmarking methodology
  - _Requirements: Reproducible performance testing_

- [ ] 21.2 Benchmark provider processing time

  - Measure processing time per provider with different event volumes
  - Compare refactored vs legacy implementation
  - Track time for: fetching, deduplication, alert creation
  - Document results in performance report
  - _Requirements: Provider-level performance comparison_

- [ ] 21.3 Benchmark memory usage

  - Monitor heap usage during processing of large event batches
  - Compare refactored vs legacy implementation
  - Verify memory stays under 512MB for 50k events
  - Document memory usage patterns
  - _Requirements: Memory efficiency validation_

- [ ] 21.4 Benchmark database query performance

  - Measure query count and execution time
  - Compare refactored vs legacy implementation
  - Verify query count reduction >40%
  - Document database performance improvements
  - _Requirements: Database optimization validation_

- [ ] 21.5 Benchmark alert creation performance

  - Measure alert creation time for different event volumes
  - Compare GEOSTATIONARY vs POLAR provider performance
  - Track deduplication ratio
  - Track alert creation success rate
  - _Requirements: Alert creation performance validation_

- [ ] 21.6 Create performance baseline report

  - Document all benchmark results
  - Include before/after comparisons
  - Calculate performance improvement percentages
  - Identify any performance regressions
  - Provide recommendations for further optimization
  - _Requirements: Comprehensive performance documentation_

- [ ] 21.7 Verify no increase in duplicate events

  - Run comparison tests with same input data
  - Verify refactored implementation creates same number of alerts
  - Verify no duplicate alerts are created
  - Verify deduplication accuracy is maintained
  - _Requirements: Correctness validation_

- [ ] 21.8 Monitor production metrics post-deployment

  - Track provider processing time in production
  - Monitor memory usage patterns
  - Track database query performance
  - Monitor error rates and alert creation success
  - Compare against established baselines
  - _Requirements: Production performance monitoring_

## Phase 15: Final Validation & Documentation

- [ ] 22. Final validation and comprehensive documentation

  - Ensure all optimizations are working correctly
  - Document complete system for future maintenance
  - _Requirements: Production-ready system_

- [ ] 22.1 Run full integration test suite

  - Execute all integration tests with refactored implementation
  - Verify all tests pass
  - Check for any performance regressions in tests
  - _Requirements: Test suite validation_

- [ ] 22.2 Verify feature flag functionality

  - Test switching between old and new implementation
  - Verify rollback procedure works correctly
  - Document feature flag usage and rollback steps
  - _Requirements: Safe deployment capability_

- [ ] 22.3 Update comprehensive system documentation

  - Update `ARCHITECTURE_FLOW_DIAGRAM.md` with performance metrics
  - Document performance optimization decisions
  - Add performance tuning guide for operators
  - Document metrics interpretation guide
  - _Requirements: Complete system documentation_

- [ ] 22.4 Create performance tuning guide

  - Document how to interpret performance metrics
  - Provide recommendations for different workload scenarios
  - Document environment variable tuning options
  - Include troubleshooting guide for performance issues
  - _Requirements: Operational guidance_

- [ ] 22.5 Create migration guide for operators

  - Document deployment procedure with feature flag
  - Include rollback procedure
  - Document monitoring points and alerts
  - Include performance baseline expectations
  - _Requirements: Deployment guidance_

- [ ] 22.6 Final code review and cleanup

  - Review all refactored code for quality
  - Ensure consistent code style and patterns
  - Verify all comments and documentation are accurate
  - Remove any debug code or temporary changes
  - _Requirements: Production-ready code quality_

- [ ] 22.7 Prepare for production deployment

  - Verify all environment variables are documented
  - Ensure feature flag is properly configured
  - Verify monitoring and alerting are in place
  - Create deployment checklist
  - _Requirements: Ready for production release_
