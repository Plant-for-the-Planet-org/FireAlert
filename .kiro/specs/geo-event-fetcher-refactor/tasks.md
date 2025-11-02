# Implementation Plan

- [ ] 1. Create shared utility functions

  - Create `apps/server/src/utils/arrayUtils.ts` with shuffleArray and chunkArray functions
  - Move utility functions from geo-event-fetcher.ts to the new shared module
  - Export functions with proper TypeScript types
  - _Requirements: 2.5, 3.4_

- [ ] 2. Extract authentication and validation functions

  - [ ] 2.1 Create authenticateRequest function in geo-event-fetcher.ts

    - Extract CRON_KEY validation logic into separate function
    - Return boolean result with proper error handling
    - _Requirements: 2.1, 4.3, 8.1_

  - [ ] 2.2 Create parseQueryParameters function in geo-event-fetcher.ts
    - Extract query parameter parsing and validation logic
    - Use proper TypeScript typing instead of string manipulation
    - Implement safe default values for invalid inputs
    - _Requirements: 1.3, 2.2, 3.2, 7.2_

- [ ] 3. Extract provider selection and configuration functions

  - [ ] 3.1 Create selectActiveProviders function in geo-event-fetcher.ts

    - Extract database query logic for active providers
    - Implement proper error handling for database operations
    - Use typed Prisma queries with proper parameter validation
    - _Requirements: 1.5, 2.3, 4.2, 6.3_

  - [ ] 3.2 Create parseProviderConfig function in geo-event-fetcher.ts

    - Replace JSON.parse(JSON.stringify()) with proper type validation
    - Implement Zod schema validation for provider configuration
    - Add proper error handling for invalid configurations
    - _Requirements: 1.1, 4.3, 8.2_

  - [ ] 3.3 Create getApiKey function for FIRMS development override
    - Implement FIRMS_MAP_KEY environment variable override logic
    - Add validation for API key format
    - Log which API key source is being used
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 4. Create main orchestration function

  - [ ] 4.1 Create orchestrateGeoEventProcessing function in geo-event-fetcher.ts

    - Extract main processing loop logic into separate orchestration function
    - Implement proper error isolation for individual provider failures
    - Add comprehensive logging with structured context
    - _Requirements: 2.4, 4.1, 4.4, 9.4_

  - [ ] 4.2 Create processProviderGeoEvents function in geo-event-fetcher.ts
    - Extract individual provider processing logic
    - Implement proper error handling and logging for each provider
    - Use descriptive variable names throughout the function
    - _Requirements: 3.1, 3.3, 4.1, 6.5_

- [ ] 5. Implement enhanced response formatting and metrics

  - [ ] 5.1 Create ProcessingResult and ApiResponse interfaces

    - Define TypeScript interfaces for processing results and API responses
    - Ensure backward compatibility with existing response structure
    - Add new metrics fields without modifying existing fields
    - _Requirements: 10.1, 10.2_

  - [ ] 5.2 Create aggregateResults function in geo-event-fetcher.ts

    - Collect and aggregate metrics from all provider processing
    - Calculate execution duration and performance statistics
    - _Requirements: 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ] 5.3 Create formatResponse function in geo-event-fetcher.ts
    - Format final API response with backward compatibility
    - Include enhanced metrics in response structure
    - Ensure all existing fields are preserved
    - _Requirements: 10.1, 10.2, 8.5_

- [ ] 6. Refactor main function and improve error handling

  - [ ] 6.1 Refactor main geoEventFetcher function

    - Rename alertFetcher to geoEventFetcher for consistency
    - Update function to use extracted helper functions
    - Implement comprehensive try-catch blocks for all operations
    - _Requirements: 3.1, 4.3, 4.5_

  - [ ] 6.2 Remove dead code and improve variable naming

    - Remove commented-out while loop and related logic
    - Remove unused processedProviders variable
    - Update variable names for clarity (fetchCount to providerLimit, promises to providerProcessingPromises)
    - _Requirements: 5.1, 5.2, 5.4, 3.2, 3.3_

  - [ ] 6.3 Add comprehensive error handling and logging
    - Wrap all async operations in try-catch blocks
    - Add detailed error logging with provider context
    - Implement graceful error handling for edge cases
    - _Requirements: 4.1, 4.2, 4.4, 7.1, 7.3, 7.4, 7.5_

- [ ] 7. Final integration and testing preparation

  - [ ] 7.1 Update function signatures and return types

    - Add explicit return types for all functions
    - Ensure proper TypeScript typing throughout
    - Fix any remaining type safety issues
    - _Requirements: 1.2, 1.4, 8.1_

  - [ ] 7.2 Verify separation of concerns implementation

    - Ensure GeoEventFetcher only orchestrates workflow
    - Verify all business logic is delegated to appropriate services
    - Confirm proper parameter passing to service functions
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 7.3 Write unit tests for extracted functions

    - Create unit tests for authentication function
    - Create unit tests for query parameter parsing
    - Create unit tests for provider selection logic
    - Create unit tests for utility functions
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ] 7.4 Write integration tests for main workflow
    - Create integration tests for complete CRON job execution
    - Test error scenarios and edge cases
    - Verify backward compatibility of API responses
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1_
