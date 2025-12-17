# Code Optimization: Advanced Performance Improvements

## Objective

Identify and implement advanced optimizations while maintaining code quality and correctness.

## Optimization Categories

### 1. Database Query Batching & Optimization

#### A. Batch Provider Updates

**Current:** Updates `lastRun` individually per provider.
**File:** `src/Services/GeoEventProviderService.ts`

**Optimization:**

```typescript
// Instead of updating inside processEachProvider:
await this.providerRepository.updateLastRun(geoEventProviderId, new Date());

// Collect all updates and batch at the end:
await this.providerRepository.updateLastRunBatch(
  providers.map((p) => ({ id: p.id, lastRun: new Date() }))
);
```

#### B. Single Existing IDs Query

**Current:** Queries existing IDs once per chunk (or once per provider).
**Optimization:** Query once before chunking, pass results through pipeline.

#### C. Prepared Statements

**Task:** Verify Prisma uses prepared statements for repeated queries.

### 2. Algorithmic Optimizations

#### A. Duplicate Detection

**Current:** Creates Set from existing IDs for O(1) lookup.
**Review:** Verify implementation is optimal, consider Bloom filters for very large datasets.

#### B. In-Memory Filtering

**Current:** Two-pass filtering (DB duplicates, then in-memory).
**Optimization:** Single pass with combined Set if possible.

### 3. Caching Strategies

#### A. Site Data Caching

**Observation:** Site geometries rarely change but queried repeatedly.

**Implementation:**

```typescript
// Add in-memory cache for Site data
class SiteCache {
  private cache: Map<string, Site[]> = new Map();
  private ttl = 5 * 60 * 1000; // 5 minutes

  async getSitesForSlice(slice: string): Promise<Site[]> {
    // Check cache, return if valid, otherwise query
  }
}
```

**Trade-off:** Memory usage vs query reduction. Profile to determine value.

#### B. Provider Config Caching

**Current:** Parses JSON config on every provider process.
**Optimization:** Cache parsed configs with provider ID as key.

### 4. Parallelization Opportunities

#### A. Chunk Processing

**Decision Point:** Can chunks be processed in parallel?

- **Pro:** 3-5x faster for large event sets
- **Con:** Potential race conditions in duplicate detection
- **Solution:** Pre-fetch all existing IDs, pass as immutable reference

#### B. Alert Creation Batches

**Current:** Sequential batch processing in while loop.
**Consideration:** Can batches be parallel if they operate on different event IDs?

### 5. Resource Management

#### A. Connection Pooling

**Task:** Verify Prisma connection pool settings:

```typescript
// Check prisma schema datasource settings
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add if not present:
  // connection_limit = 10
  // pool_timeout = 10
}
```

#### B. Memory Management

**Optimization:** Explicitly null large objects after use to help GC:

```typescript
let geoEvents = await fetch...;
// ... process
geoEvents = null; // Help GC
```

### 6. Early Exit Strategies

#### A. Skip Empty Results

**Add checks:**

```typescript
// In GeoEventService
if (uniqueEvents.length === 0) {
  return { created: 0, new: 0 }; // Skip bulk insert
}

// In SiteAlertService
if (unprocessed.length === 0) {
  break; // Exit loop immediately
}
```

#### B. Provider-Level Skip

**If provider consistently returns 0 events, consider:**

- Temporary backoff
- Logging for investigation
- Skip subsequent processing steps

### 7. Logging Optimization

**Current:** Multiple logger calls per operation.
**Optimization:**

- Use log levels appropriately (DEBUG for chunk details)
- Batch logs where possible
- Consider structured logging (JSON) for better parsing
- Add sampling for high-frequency logs

### 8. Code-Level Micro-Optimizations

#### A. Array Operations

```typescript
// Instead of multiple reduce calls:
const totalCreated = chunkResults.reduce((sum, r) => sum + r.created, 0);
const totalNew = chunkResults.reduce((sum, r) => sum + r.new, 0);

// Single pass:
const { totalCreated, totalNew } = chunkResults.reduce(
  (acc, r) => ({
    totalCreated: acc.totalCreated + r.created,
    totalNew: acc.totalNew + r.new,
  }),
  { totalCreated: 0, totalNew: 0 }
);
```

#### B. Object Creation

Minimize object creation in hot paths (inside loops).

## Implementation Priority

**High Priority (do first):**

1. Query existing IDs once per provider, not per chunk
2. Verify database indexes
3. Make PQueue concurrency configurable
4. Add early exit for empty results

**Medium Priority:** 5. Batch provider updates 6. Parallel chunk processing (if safe) 7. Site data caching

**Low Priority (measure first):** 8. Micro-optimizations 9. Advanced caching strategies 10. Memory management tweaks

## Success Metrics

- Provider processing time reduced by >30%
- Database query count reduced by >40%
- Memory usage stays under 512MB for 50k events
- No increase in duplicate events (correctness maintained)
