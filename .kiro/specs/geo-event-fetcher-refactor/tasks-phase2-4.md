# Implementation Plan - Phase 2-4: Dependency Service Improvements

**Note: Phase 1 (CRON Job Orchestration) is already completed. These tasks focus on minimal improvements to dependency services to support the refactored CRON job.**

## Phase 2: Service Response Improvements (1 week)

- [x] 1. Add explicit return type interfaces for services

  - Create shared interface definitions for service responses
  - Ensure backward compatibility with existing code
  - Add JSDoc documentation for new interfaces
  - _Design Reference: Phase 2.1, 2.2_

- [ ] 2. Improve GeoEventHandler error context and return types

  - [x] 2.1 Create GeoEventProcessingResult interface

    - Define interface with geoEventCount, newGeoEventCount, processingDuration, and errors fields
    - Add interface to GeoEventHandler.ts file
    - Export interface for use by CRON job
    - _Design Reference: Phase 2.1_

  - [x] 2.2 Update processGeoEvents function signature

    - Add explicit return type: Promise<GeoEventProcessingResult>
    - Update function to return the new interface structure
    - Maintain backward compatibility by keeping existing fields
    - _Design Reference: Phase 2.1_

  - [x] 2.3 Add timing metrics to processGeoEvents

    - Add startTime tracking at function start
    - Calculate processingDuration before return
    - Include duration in return object
    - _Design Reference: Phase 2.1_

  - [x] 2.4 Add error context collection in processGeoEvents
    - Wrap database operations in try-catch blocks
    - Collect error messages in errors array
    - Return errors array in result object
    - Continue processing on non-critical errors
    - _Design Reference: Phase 2.1_

- [ ] 3. Improve CreateSiteAlert error context and return types

  - [x] 3.1 Create SiteAlertCreationResult interface

    - Define interface with totalAlertsCreated, batchesProcessed, processingDuration, and errors fields
    - Add interface to CreateSiteAlert.ts file
    - Export interface for use by CRON job
    - _Design Reference: Phase 2.2_

  - [x] 3.2 Update createSiteAlerts function signature

    - Add explicit return type: Promise<SiteAlertCreationResult>
    - Update function to return the new interface structure
    - Maintain backward compatibility by keeping totalAlertsCreated as main field
    - _Design Reference: Phase 2.2_

  - [x] 3.3 Add timing metrics to createSiteAlerts

    - Add startTime tracking at function start
    - Track number of batches processed
    - Calculate processingDuration before return
    - Include metrics in return object
    - _Design Reference: Phase 2.2_

  - [x] 3.4 Add error context collection in createSiteAlerts
    - Enhance existing try-catch blocks to collect error details
    - Store error messages with batch context
    - Return errors array in result object
    - Continue processing remaining batches on error
    - _Design Reference: Phase 2.2_

- [ ] 4. Improve GeoEventProvider Registry error messages

  - [x] 4.1 Enhance registry get method error messages

    - List available providers in error message
    - Add context about what was requested
    - Improve error message formatting
    - _Design Reference: Phase 2.3_

  - [x] 4.2 Add helper method to list available providers
    - Create getAvailableProviders() method
    - Return array of registered provider keys
    - Use in error messages for better debugging
    - _Design Reference: Phase 2.3_

## Phase 3: Configuration Validation (3-4 days)

- [ ] 5. Add Zod schemas to provider implementations

  - [x] 5.1 Add Zod schema to NasaGeoEventProvider

    - Import Zod library
    - Define NasaConfigSchema with bbox, slice, client, apiUrl fields
    - Use passthrough() to allow additional properties
    - Add schema validation to getConfig() method
    - _Design Reference: Phase 3.1_

  - [x] 5.2 Add Zod schema to GOES16GeoEventProvider

    - Import Zod library
    - Define GOES16ConfigSchema with bbox, slice, client, privateKey fields
    - Define nested schema for privateKey object structure
    - Use passthrough() to allow additional properties
    - Add schema validation to getConfig() method
    - _Design Reference: Phase 3.1_

  - [x] 5.3 Update provider getConfig methods with better error messages
    - Replace generic error messages with Zod validation errors
    - Include specific field information in error messages
    - Maintain existing error handling patterns
    - _Design Reference: Phase 3.1_

## Phase 4: Integration and Testing (2-3 days)

- [x] 6. Update CRON job to use new service response types

  - [x] 6.1 Update processProviderGeoEvents to handle GeoEventProcessingResult

    - Update type annotations for processGeoEvents calls
    - Access new fields (processingDuration, errors) from result
    - Add logging for processing duration
    - Add warning logs for any errors returned
    - _Design Reference: Phase 4.1_

  - [x] 6.2 Update processProviderGeoEvents to handle SiteAlertCreationResult

    - Update type annotations for createSiteAlerts calls
    - Access new fields (batchesProcessed, processingDuration, errors) from result
    - Add logging for batch processing metrics
    - Add warning logs for any errors returned
    - _Design Reference: Phase 4.1_

  - [x] 6.3 Enhance ProcessingResult interface with service metrics
    - Add serviceErrors array field
    - Add processingDetails object with service-level metrics
    - Update aggregateResults function to collect service errors
    - Update formatResponse to include enhanced metrics
    - _Design Reference: Phase 4.2_

- [x] 7. Enhanced metrics collection and reporting

  - [x] 7.1 Collect service-level timing metrics

    - Track geoEventProcessingDuration from service results
    - Track siteAlertProcessingDuration from service results
    - Track batchesProcessed from service results
    - Aggregate metrics across all providers
    - _Design Reference: Phase 4.2_

  - [x] 7.2 Collect and aggregate service errors

    - Collect errors from GeoEventHandler results
    - Collect errors from CreateSiteAlert results
    - Aggregate all errors into serviceErrors array
    - Include in final API response metrics
    - _Design Reference: Phase 4.2_

  - [x] 7.3 Update API response format with enhanced metrics
    - Add processingDetails to metrics object
    - Add serviceErrors to metrics object
    - Ensure backward compatibility with existing response structure
    - Update formatResponse function accordingly
    - _Design Reference: Phase 4.2_

- [ ] 8. Integration testing and validation

  - [ ] 8.1 Test CRON job with updated service responses

    - Run CRON job end-to-end with real providers
    - Verify new metrics are collected correctly
    - Verify error context is captured and reported
    - Verify backward compatibility with existing consumers
    - _Design Reference: Phase 4_

  - [ ] 8.2 Verify error handling improvements

    - Test with provider configuration errors
    - Test with database connection failures
    - Test with partial provider failures
    - Verify error messages are clear and actionable
    - _Design Reference: Phase 2, 3_

  - [ ] 8.3 Validate enhanced metrics and logging
    - Verify timing metrics are accurate
    - Verify batch processing metrics are correct
    - Verify error context provides useful debugging information
    - Verify logs contain sufficient detail for troubleshooting
    - _Design Reference: Phase 4.2_

## Summary

**Total Tasks**: 8 main tasks with 23 sub-tasks
**Estimated Timeline**: 2-3 weeks
**Focus**: Minimal, targeted improvements to support the refactored CRON job

### Key Deliverables:

1. ✅ Explicit return type interfaces for all services
2. ✅ Enhanced error context and reporting
3. ✅ Better configuration validation with Zod
4. ✅ Improved metrics collection and monitoring
5. ✅ Backward compatible changes
6. ✅ Better debugging capabilities

### Out of Scope:

- ❌ Complete service restructuring
- ❌ Provider base classes
- ❌ Complex SQL refactoring
- ❌ Performance optimization
- ❌ Comprehensive unit testing framework
