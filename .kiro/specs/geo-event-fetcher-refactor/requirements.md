# Requirements Document

## Introduction

The geo-event-fetcher is a critical CRON job endpoint that fetches fire/heat anomaly data from NASA FIRMS and other satellite providers, processes the data, and creates site alerts for users. The current implementation has several issues including type safety problems, complex nested logic, commented-out code, unclear variable naming, and lack of proper error handling. This refactoring aims to improve code quality, maintainability, testability, and reliability while preserving all existing functionality.

## Glossary

- **GeoEventFetcher**: The CRON job API endpoint that orchestrates fetching geo-events from providers
- **GeoEventProvider**: A database entity and interface representing a satellite data source (e.g., MODIS, VIIRS, GOES-16)
- **GeoEvent**: A fire/heat anomaly event detected by satellite with coordinates, timestamp, and confidence level
- **SiteAlert**: An alert record created when a GeoEvent intersects with a monitored Site
- **Provider Registry**: A singleton registry that maps provider client IDs to their implementation classes
- **Chunk Processing**: Breaking large arrays into smaller batches for memory-efficient processing
- **Prisma**: The ORM used for database operations with PostgreSQL and PostGIS

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want the geo-event-fetcher to have proper TypeScript type safety, so that type errors are caught at compile time rather than runtime

#### Acceptance Criteria

1. WHEN parsing provider configuration, THE GeoEventFetcher SHALL use proper type assertions or validation instead of `JSON.parse(JSON.stringify(config))`
2. THE GeoEventFetcher SHALL eliminate all TypeScript `any` type errors in template literal expressions
3. THE GeoEventFetcher SHALL use typed query parameters with proper validation using Zod or similar validation library
4. THE GeoEventFetcher SHALL define explicit return types for all functions and async operations
5. THE GeoEventFetcher SHALL use proper typing for Prisma raw queries with type-safe parameters

### Requirement 2

**User Story:** As a developer, I want the geo-event-fetcher code to be modular and well-organized, so that I can easily understand, test, and maintain each component

#### Acceptance Criteria

1. THE GeoEventFetcher SHALL extract authentication logic into a separate reusable function
2. THE GeoEventFetcher SHALL extract query parameter parsing and validation into a separate function
3. THE GeoEventFetcher SHALL extract provider selection logic into a separate function
4. THE GeoEventFetcher SHALL extract the main processing loop into a separate orchestration function
5. THE GeoEventFetcher SHALL move utility functions (shuffleArray, chunkArray) to a shared utilities module

### Requirement 3

**User Story:** As a developer, I want clear and descriptive variable names throughout the codebase, so that the code is self-documenting and easier to understand

#### Acceptance Criteria

1. THE GeoEventFetcher SHALL rename `alertFetcher` function to `geoEventFetcher` to match the file name and purpose
2. THE GeoEventFetcher SHALL rename `fetchCount` to `providerLimit` for clarity
3. THE GeoEventFetcher SHALL rename `promises` to `providerProcessingPromises` for clarity
4. THE GeoEventFetcher SHALL use descriptive names for all loop variables and temporary values
5. THE GeoEventFetcher SHALL rename `breadcrumbPrefix` to `logPrefix` for consistency

### Requirement 4

**User Story:** As a system operator, I want comprehensive error handling and logging, so that I can diagnose and resolve issues quickly when they occur

#### Acceptance Criteria

1. WHEN a provider fails to fetch data, THE GeoEventFetcher SHALL log the error with provider details and continue processing other providers
2. WHEN database operations fail, THE GeoEventFetcher SHALL log the error with context and return appropriate error responses
3. THE GeoEventFetcher SHALL wrap all async operations in try-catch blocks with specific error handling
4. THE GeoEventFetcher SHALL log the start and completion of each major processing step with timing information
5. THE GeoEventFetcher SHALL return detailed error responses with status codes and error messages for debugging

### Requirement 5

**User Story:** As a developer, I want all dead code and commented-out logic removed, so that the codebase is clean and maintainable

#### Acceptance Criteria

1. THE GeoEventFetcher SHALL remove the commented-out while loop and related logic
2. THE GeoEventFetcher SHALL remove the commented-out condition checking for `activeProviders.length === 0`
3. THE GeoEventFetcher SHALL remove the commented-out notification count logic if no longer needed
4. THE GeoEventFetcher SHALL remove the `processedProviders` variable if it serves no purpose
5. THE GeoEventFetcher SHALL document any TODO comments with issue tracking references or remove them

### Requirement 6

**User Story:** As a developer, I want the provider selection logic to be clear and deterministic, so that I understand which providers are processed and why

#### Acceptance Criteria

1. THE GeoEventFetcher SHALL document the purpose of shuffling providers in the selection logic
2. THE GeoEventFetcher SHALL clarify whether shuffling is necessary or if ordering by lastRun DESC is sufficient
3. THE GeoEventFetcher SHALL ensure the limit parameter correctly controls the number of providers processed
4. THE GeoEventFetcher SHALL validate that selected providers match the intended selection criteria
5. THE GeoEventFetcher SHALL log which providers were selected and which were skipped with reasons

### Requirement 7

**User Story:** As a system administrator, I want the CRON job to handle edge cases gracefully, so that the system remains stable under all conditions

#### Acceptance Criteria

1. WHEN no active providers are available, THE GeoEventFetcher SHALL return a success response with zero alerts created
2. WHEN the limit parameter is invalid or missing, THE GeoEventFetcher SHALL use a safe default value
3. WHEN a provider's lastRun is null, THE GeoEventFetcher SHALL handle it without errors
4. WHEN chunk processing fails for one chunk, THE GeoEventFetcher SHALL continue processing remaining chunks
5. WHEN database connection fails, THE GeoEventFetcher SHALL return an appropriate error response without crashing

### Requirement 8

**User Story:** As a developer, I want the geo-event-fetcher to follow SOLID principles and KISS principle, so that the codebase becomes a foundation for uniform CRON job patterns

#### Acceptance Criteria

1. THE GeoEventFetcher SHALL implement single responsibility principle with each function having one clear purpose
2. THE GeoEventFetcher SHALL implement open-closed principle by using interfaces for extensible provider handling
3. THE GeoEventFetcher SHALL implement dependency inversion principle by depending on abstractions rather than concrete implementations
4. THE GeoEventFetcher SHALL follow KISS principle by keeping each function simple and focused
5. THE GeoEventFetcher SHALL establish consistent patterns for authentication, response format, logging, and error handling that can be reused in other CRON jobs

### Requirement 9

**User Story:** As a developer, I want proper separation of concerns between fetching, processing, and alerting, so that each component can be tested and modified independently

#### Acceptance Criteria

1. THE GeoEventFetcher SHALL delegate all provider-specific fetching logic to GeoEventProvider implementations
2. THE GeoEventFetcher SHALL delegate all event processing logic to the GeoEventHandler service
3. THE GeoEventFetcher SHALL delegate all alert creation logic to the CreateSiteAlert service
4. THE GeoEventFetcher SHALL only orchestrate the workflow without implementing business logic
5. THE GeoEventFetcher SHALL pass all necessary context and parameters to service functions explicitly

### Requirement 10

**User Story:** As a system operator, I want detailed metrics and statistics from each CRON run while maintaining backward compatibility, so that I can monitor system performance without breaking existing integrations

#### Acceptance Criteria

1. THE GeoEventFetcher SHALL maintain the existing API response structure to ensure backward compatibility with current consumers
2. THE GeoEventFetcher SHALL add new metrics fields to the response without modifying or removing existing fields
3. THE GeoEventFetcher SHALL return the total number of providers processed in the response metrics
4. THE GeoEventFetcher SHALL return the total number of geo-events fetched in the response metrics
5. THE GeoEventFetcher SHALL return the total number of new geo-events created in the response metrics
6. THE GeoEventFetcher SHALL return the total number of site alerts created in the response metrics
7. THE GeoEventFetcher SHALL return the execution duration in the response metrics for performance monitoring

### Requirement 11

**User Story:** As a developer, I want to use a single NASA FIRMS API key during development testing, so that I can test the system without managing multiple provider-specific API keys

#### Acceptance Criteria

1. WHEN the environment variable FIRMS_MAP_KEY is present, THE GeoEventFetcher SHALL use this key instead of GeoEventProvider.clientAPIKey for NASA FIRMS API requests
2. WHEN FIRMS_MAP_KEY is not present, THE GeoEventFetcher SHALL use the GeoEventProvider.clientAPIKey as configured in the database
3. THE GeoEventFetcher SHALL log which API key source is being used for each provider during development
4. THE GeoEventFetcher SHALL validate that the FIRMS_MAP_KEY is properly formatted before using it
5. THE GeoEventFetcher SHALL ensure this development override only affects NASA FIRMS providers and not other provider types
