# Code Location Reference: Specific Changes

## Purpose

This document provides exact file paths and line numbers for all critical changes between V0 and V3. Use this for code review, debugging, or understanding specific modifications.

---

## 🔴 Critical Bug Fixes

### Bug #1: Mark Stale Timing

#### V0 (INCORRECT)

**File**: `apps/server/src/Services/SiteAlert/CreateSiteAlert.ts`
**Line**: 36
**Code**:

```typescript
// Mark stale events BEFORE creating alerts
await prisma.$executeRaw`
  UPDATE "GeoEvent"
  SET "isProcessed" = true
  WHERE "isProcessed" = false
    AND "eventDate" < NOW() - INTERVAL '24 HOURS';
`;
```

#### V3 (FIXED)

**File**: `apps/server/src/Services/SiteAlert/SiteAlertService.ts`
**Method**: `createAlertsForProvider()`
**Location**: End of method (after while loop)
**Code**:

```typescript
// Mark stale events AFTER creating alerts
await this.geoEventRepository.markStaleAsProcessed(24);
```

---

### Bug #2: Update Query Scope (POLAR)

#### V0 (INCORRECT)

**File**: `apps/server/src/Services/SiteAlert/CreateSiteAlert.ts`
**Line**: 217
**Code**:

```typescript
const updateGeoEventIsProcessedToTrue = Prisma.sql`
  UPDATE "GeoEvent" 
  SET "isProcessed" = true 
  WHERE "isProcessed" = false 
    AND "geoEventProviderId" = ${geoEventProviderId} 
    AND "slice" = ${slice}
`;
```

**Problem**: Updates ALL events, not just current batch

#### V3 (FIXED)

**File**: `apps/server/src/Services/SiteAlert/SiteAlertRepository.ts`
**Method**: `createAlertsForPolar()`
**Code**:

```typescript
const updateGeoEventIsProcessedToTrue = Prisma.sql`
  UPDATE "GeoEvent" 
  SET "isProcessed" = true 
  WHERE id IN (${Prisma.join(eventIds)})
`;
```

**Fix**: Updates only current batch events

---

## ⚡ Performance Optimizations

### Optimization #1: Time Window Reduction

#### V0 (30 hours)

**File**: `apps/server/src/Services/GeoEvent/GeoEventHandler.ts`
**Function**: `fetchDbEventIds()`
**Code**:

```typescript
where: {
  geoEventProviderId: geoEventProviderId,
  eventDate: {gt: new Date(Date.now() - 30 * 60 * 60 * 1000)},
}
```

#### V3 (12 hours)

**File**: `apps/server/src/Services/GeoEvent/GeoEventRepository.ts`
**Method**: `fetchExistingIdsWithTiming()`
**Code**:

```typescript
WHERE "geoEventProviderId" = $1
  AND "eventDate" > NOW() - INTERVAL '${hours} hours'
```

**Default**: `hours = 12`

---

### Optimization #2: Pre-fetching Existing IDs

#### V0 (Query per chunk)

**File**: `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
**Location**: Inside chunk processing loop
**Code**:

```typescript
for (const geoEventChunk of geoEventChunks) {
  const processedGeoEvent = await processGeoEvents(
    geoEventProviderClientId,
    geoEventProviderId,
    slice,
    geoEventChunk
  );
  // processGeoEvents queries DB for existing IDs each time
}
```

#### V3 (Query once per provider)

**File**: `apps/server/src/Services/GeoEventProvider/GeoEventProviderService.ts`
**Method**: `processEachProvider()`
**Code**:

```typescript
// Pre-fetch existing IDs once
const existingIdsResult =
  await this.geoEventService.repository.fetchExistingIdsWithTiming(
    geoEventProviderId,
    12
  );
const preFetchedIds = existingIdsResult.ids;

// Pass to all chunks
const chunkResults = await batchProcessor.processSequentially(
  geoEvents,
  chunkSize,
  async (chunk) => {
    return await this.geoEventService.deduplicateAndSave(
      chunk,
      geoEventProviderId,
      preFetchedIds // ← Reuse pre-fetched IDs
    );
  }
);
```

---

### Optimization #3: Early Exit Strategy

#### V3 Implementation

**File**: `apps/server/src/Services/GeoEvent/GeoEventService.ts`
**Method**: `deduplicateAndSave()`
**Code**:

```typescript
// Early exit if no unique events
if (uniqueEvents.length === 0) {
  logger(`No unique events to insert for provider ${providerId}`, "debug");
  return {
    created: 0,
    new: 0,
  };
}
```

---

### Optimization #4: Concurrency Control

#### V0 (Unlimited)

**File**: `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
**Code**:

```typescript
const promises = selectedProviders.map(async (provider) => {
  // Process provider
});
await Promise.all(promises); // No concurrency limit
```

#### V3 (Configurable)

**File**: `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
**Function**: `refactoredImplementation()`
**Code**:

```typescript
const concurrency = env.PROVIDER_CONCURRENCY || 3;
const queue = new PQueue({ concurrency });

const providerService = new GeoEventProviderService(
  providerRepo,
  geoEventService,
  siteAlertService,
  providerManager,
  queue // ← Concurrency control
);
```

**Environment Variable**: `PROVIDER_CONCURRENCY` (default: 3)

---

## 🏗️ Architecture Changes

### Feature Flag Implementation

**File**: `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
**Function**: `alertFetcher()`
**Code**:

```typescript
export default async function alertFetcher(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check feature flag to determine which implementation to use
  if (env.USE_REFACTORED_PIPELINE) {
    logger("Using REFACTORED pipeline implementation", "info");
    return await refactoredImplementation(req, res);
  } else {
    logger("Using LEGACY pipeline implementation", "info");
    return await legacyImplementation(req, res);
  }
}
```

**Environment Variable**: `USE_REFACTORED_PIPELINE` (boolean)

---

### Service Layer Files

#### GeoEventProviderService

**File**: `apps/server/src/Services/GeoEventProvider/GeoEventProviderService.ts`
**Key Methods**:

- `processProviders()` - Orchestrates multiple providers
- `processEachProvider()` - Processes single provider

#### GeoEventService

**File**: `apps/server/src/Services/GeoEvent/GeoEventService.ts`
**Key Methods**:

- `deduplicateAndSave()` - Main event processing pipeline

#### SiteAlertService

**File**: `apps/server/src/Services/SiteAlert/SiteAlertService.ts`
**Key Methods**:

- `createAlertsForProvider()` - Main alert creation workflow
- `processBatch()` - Batch processing logic

---

### Repository Files

#### GeoEventProviderRepository

**File**: `apps/server/src/Services/GeoEventProvider/GeoEventProviderRepository.ts`
**Key Methods**:

- `findEligibleProviders()` - Query eligible providers
- `updateLastRun()` - Update provider timestamp

#### GeoEventRepository

**File**: `apps/server/src/Services/GeoEvent/GeoEventRepository.ts`
**Key Methods**:

- `fetchExistingIdsWithTiming()` - Query existing IDs with metrics
- `bulkCreate()` - Bulk insert events
- `findUnprocessedByProvider()` - Query unprocessed events
- `markStaleAsProcessed()` - Mark old events as processed

#### SiteAlertRepository

**File**: `apps/server/src/Services/SiteAlert/SiteAlertRepository.ts`
**Key Methods**:

- `createAlertsForGeostationary()` - GEOSTATIONARY-specific SQL
- `createAlertsForPolar()` - POLAR-specific SQL

---

### Utility Files

#### EventProcessor

**File**: `apps/server/src/utils/EventProcessor.ts`
**Key Methods**:

- `generateChecksums()` - Generate event checksums
- `filterDuplicates()` - Filter against DB IDs
- `filterInMemory()` - Filter in-memory duplicates

#### ProviderManager

**File**: `apps/server/src/utils/ProviderManager.ts`
**Key Methods**:

- `selectProviders()` - Shuffle and select providers
- `createProvider()` - Factory method for provider instances

#### RequestHandler

**File**: `apps/server/src/utils/RequestHandler.ts`
**Key Methods**:

- `validateCron()` - Validate CRON_KEY
- `parseLimit()` - Parse limit parameter
- `buildSuccess()` - Build success response
- `buildUnauthorized()` - Build 403 response

#### BatchProcessor

**File**: `apps/server/src/utils/BatchProcessor.ts`
**Key Methods**:

- `processSequentially()` - Process items in sequence
- `processBatches()` - Process items in parallel

#### OperationResult

**File**: `apps/server/src/utils/OperationResult.ts`
**Key Methods**:

- `addEventsProcessed()` - Track events processed
- `addEventsCreated()` - Track events created
- `addAlertsCreated()` - Track alerts created
- `merge()` - Merge multiple results
- `setMetrics()` - Attach performance metrics

#### PerformanceMetrics

**File**: `apps/server/src/utils/PerformanceMetrics.ts`
**Key Methods**:

- `startTimer()` - Start timing operation
- `endTimer()` - End timing and return duration
- `recordMetric()` - Record custom metric
- `recordMemorySnapshot()` - Record memory usage
- `getMetrics()` - Get all metrics

---

## 📊 Metrics Comparison

### V0 Metrics Output

**File**: `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
**Location**: End of function
**Code**:

```typescript
res.status(200).json({
  message: "Geo-event-fetcher Cron job executed successfully",
  eventsProcessed: totalEventsProcessed,
  eventsCreated: totalEventsCreated,
  alertsCreated: newSiteAlertCount,
  processedProviders: processedProviders,
  metrics: finalMetrics, // PerformanceMetrics.getMetrics()
  status: 200,
});
```

### V3 Metrics Output

**File**: `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
**Function**: `refactoredImplementation()`
**Code**:

```typescript
res.status(200).json(RequestHandler.buildSuccess(result));
// result is OperationResult with embedded PerformanceMetrics
```

---

## 🔍 Debugging Locations

### V0 Logging

**File**: `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
**Key Logs**:

- Line ~90: "Running Geo Event Fetcher. Taking X eligible providers."
- Line ~150: "Fetched X geoEvents"
- Line ~180: "Found X new Geo Events"
- Line ~185: "Created X Geo Events"
- Line ~200: "Created X Site Alerts"
- Line ~250: "=== LEGACY PERFORMANCE SUMMARY ==="

### V3 Logging

**File**: `apps/server/src/Services/GeoEventProvider/GeoEventProviderService.ts`
**Key Logs**:

- "Fetched X geoEvents"
- "Pre-fetched X existing IDs in Xms"
- "Processing X events in chunks of 2000"
- "Chunk X completed in Xms"
- "Found X new Geo Events"
- "Created X Geo Events"
- "Created X Site Alerts"
- "WARNING: Provider X took Xms (>30s threshold)"

---

## 🧪 Testing Entry Points

### V0 Testing

**Entry Point**: `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
**Test Approach**: Integration tests only (monolithic function)

### V3 Testing

**Entry Points**:

- Unit tests: Each service class independently
- Integration tests: Full workflow through handler

**Example Test Locations**:

```
apps/server/src/Services/GeoEvent/__tests__/GeoEventService.test.ts
apps/server/src/Services/SiteAlert/__tests__/SiteAlertService.test.ts
apps/server/src/utils/__tests__/EventProcessor.test.ts
```

---

## 📝 Configuration Files

### Environment Variables

**File**: `apps/server/src/env.mjs`

**V3 Additions**:

```typescript
USE_REFACTORED_PIPELINE: z.boolean().default(false),
PROVIDER_CONCURRENCY: z.number().int().positive().default(3),
```

---

## 🚀 Deployment Files

### Feature Flag Control

**File**: `.env` or environment configuration
**Variables**:

```bash
USE_REFACTORED_PIPELINE=true  # Enable V3
PROVIDER_CONCURRENCY=3        # Concurrency limit
```

---

**Document Version**: 1.0
**Date**: December 19, 2024
**Purpose**: Code location reference for V0 → V3 changes
**Usage**: Use this document to quickly locate specific code changes
