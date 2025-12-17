# Performance Audit: Identify and Fix Bottlenecks in GeoEvent Pipeline

## Objective

Analyze current implementation for performance issues and implement fixes while maintaining correctness and data integrity.

## Areas to Investigate & Fix

### 1. Sequential vs Parallel Chunk Processing

**File:** `src/Services/GeoEventProviderService.ts`

**Current:** Uses `processSequentially` which processes chunks one-by-one.

**Analysis Needed:**

- Can chunks be processed in parallel without causing issues?
- Is there shared state (database connections, hasher) that prevents parallelization?
- Would parallel processing cause race conditions in duplicate detection?

**Task:**

- If safe, replace `processSequentially` with `processBatches` for parallel chunk processing
- If not safe, document why sequential processing is required
- Consider making this configurable (sequential for safety, parallel for speed)

### 2. Database Query Optimization

**File:** `src/repositories/GeoEventRepository.ts`

**Current:** `fetchExistingIds` queries ALL events from last 30 hours for duplicate checking.

**Potential Issues:**

- If provider has 100k+ events in 30 hours, fetches all IDs into memory
- Query runs once per chunk (in sequential mode) or per 2000 events

**Tasks:**

- Verify if indexes exist on: `geoEventProviderId`, `eventDate`, `id`
- Consider limiting to last 6-12 hours instead of 30 for active providers
- Evaluate if we can query once before chunking and reuse results
- Add query timing metrics to identify slow queries

**Optimization Options:**

```typescript
// Option A: Query once, reuse for all chunks
const existingIds = await this.repository.fetchExistingIds(providerId, 30);
await batchProcessor.processSequentially(
  geoEvents,
  chunkSize,
  async (chunk) => {
    // Pass existingIds to avoid re-querying
    return await this.geoEventService.deduplicateAndSave(
      chunk,
      providerId,
      existingIds // Pass as parameter
    );
  }
);

// Option B: Reduce time window
fetchExistingIds(providerId, 6); // 6 hours instead of 30
```

### 3. Spatial Join Performance

**File:** `src/repositories/SiteAlertRepository.ts`

**Current:** Complex PostGIS queries with CROSS JOINs and spatial functions.

**Tasks:**

- Verify spatial indexes exist on Site.detectionGeometry
- Check if GIST indexes are present
- Profile query execution time
- Consider if Site data can be cached (if Sites don't change frequently)

**Queries to Run:**

```sql
EXPLAIN ANALYZE [paste the alert creation query]
```

Verify indexes:

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('Site', 'GeoEvent');
```

### 4. PQueue Concurrency Tuning

**File:** `src/pages/api/cron/geo-event-fetcher.ts`

**Current:** Hardcoded concurrency of 3.

**Tasks:**

- Make concurrency configurable via environment variable
- Test with different concurrency levels (3, 5, 10)
- Monitor database connection pool exhaustion
- Document optimal concurrency based on:
  - Serverless memory limits
  - Database connection pool size
  - Average provider processing time

### 5. ChecksumGenerator Initialization

**File:** `src/utils/ChecksumGenerator.ts`

**Current:** Hasher initialized once per request.

**Potential Issue:** If hash-wasm initialization is expensive and done per request.

**Tasks:**

- Measure initialization time
- Consider singleton pattern or lazy initialization
- Profile if XXHash3 creation impacts startup time

### 6. Memory Usage During Large Fetches

**Current:** If NASA returns 50k events, all loaded into memory even with chunking.

**Tasks:**

- Add memory usage logging: `process.memoryUsage().heapUsed`
- Set alerts for heap usage >500MB
- Consider streaming approach if events can be processed as they arrive

### 7. Transaction Overhead

**File:** `src/repositories/SiteAlertRepository.ts`

**Current:** Each batch creates a transaction.

**Tasks:**

- Measure transaction overhead
- Consider if multiple small batches could be combined
- Verify transaction isolation level is appropriate

## Deliverables

1. Performance report with metrics showing before/after
2. Implemented optimizations with feature flags for safe rollout
3. Documentation of remaining bottlenecks that cannot be easily fixed
4. Recommendations for infrastructure changes (database tuning, connection pools, etc.)
