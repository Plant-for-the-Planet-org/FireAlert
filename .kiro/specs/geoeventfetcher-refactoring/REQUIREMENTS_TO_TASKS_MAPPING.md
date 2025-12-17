# Requirements to Tasks Mapping

This document maps requirements from `metrics.md`, `perf-downside.md`, and `improvements.md` to specific tasks in the extended tasks.md file.

## From metrics.md: Add Performance Metrics to GeoEvent Processing Pipeline

### Requirement 1: Create PerformanceMetrics Domain Model

**Source:** metrics.md - Section "1. Create PerformanceMetrics Domain Model"

**Mapped Tasks:**

- **18.1** Create PerformanceMetrics domain model
  - Implement `startTimer(label: string): void`
  - Implement `endTimer(label: string): number`
  - Implement `recordMetric(label: string, value: number): void`
  - Implement `getMetrics(): object`
  - Implement `merge(other: PerformanceMetrics): PerformanceMetrics`

**Status:** ✅ Covered

---

### Requirement 2: Integrate into ProcessingResult

**Source:** metrics.md - Section "2. Integrate into ProcessingResult"

**Mapped Tasks:**

- **18.3** Integrate PerformanceMetrics into OperationResult
  - Add `metrics?: PerformanceMetrics` field
  - Update `toJSON()` to include metrics
  - Implement `setMetrics()` method

**Status:** ✅ Covered

---

### Requirement 3: Add Timing to GeoEventProviderService

**Source:** metrics.md - Section "3. Add Timing to GeoEventProviderService"

**Mapped Tasks:**

- **18.4** Add timing to GeoEventProviderService
  - Track total provider processing time
  - Track event fetching time
  - Track chunk processing time
  - Track alert creation time
  - Track database update time

**Status:** ✅ Covered

---

### Requirement 4: Add Timing to GeoEventService

**Source:** metrics.md - Section "4. Add Timing to GeoEventService"

**Mapped Tasks:**

- **18.5** Add timing to GeoEventService
  - Track checksum generation time
  - Track database fetch time
  - Track duplicate filtering time
  - Track bulk insert time

**Status:** ✅ Covered

---

### Requirement 5: Add Timing to SiteAlertService

**Source:** metrics.md - Section "5. Add Timing to SiteAlertService"

**Mapped Tasks:**

- **18.6** Add timing to SiteAlertService
  - Track mark stale time
  - Track per-batch alert creation time
  - Track total alert creation time

**Status:** ✅ Covered

---

### Requirement 6: Update Response to Include Metrics

**Source:** metrics.md - Section "6. Update Response to Include Metrics"

**Mapped Tasks:**

- **18.7** Update RequestHandler response formatting
  - Include metrics breakdown in success response
  - Include total_duration_ms, provider_processing details
  - Include avg_chunk_duration_ms, slowest_chunk_ms

**Status:** ✅ Covered

---

### Requirement 7: Add Logging for Key Metrics

**Source:** metrics.md - Section "7. Add Logging for Key Metrics"

**Mapped Tasks:**

- **18.8** Add performance-based logging
  - Log at INFO level for providers >5s
  - Log at INFO level for chunks >2s
  - Log at INFO level for alerts >3s
  - Log at WARN level for providers >30s
  - Log at WARN level for timeouts

**Status:** ✅ Covered

---

## From perf-downside.md: Performance Audit & Bottleneck Analysis

### Area 1: Sequential vs Parallel Chunk Processing

**Source:** perf-downside.md - Section "1. Sequential vs Parallel Chunk Processing"

**Mapped Tasks:**

- **20.10** Evaluate parallel chunk processing
  - Analyze if chunks can be processed in parallel
  - Review duplicate detection for race conditions
  - Implement parallel processing option if safe
  - Make configurable via environment variable
  - Document decision and trade-offs

**Status:** ✅ Covered

---

### Area 2: Database Query Optimization

**Source:** perf-downside.md - Section "2. Database Query Optimization"

**Mapped Tasks:**

- **19.1** Verify database indexes

  - Check indexes on geoEventProviderId, eventDate, id
  - Verify spatial indexes on Site.detectionGeometry
  - Run SQL query to list all indexes
  - Document findings

- **19.2** Optimize fetchExistingIds query

  - Analyze current 30-hour time window
  - Evaluate reducing to 6-12 hours
  - Implement query once before chunking
  - Pass existing IDs through pipeline
  - Update GeoEventService to accept pre-fetched IDs
  - Add metrics to track query execution time

- **20.2** Implement single existing IDs query
  - Modify deduplicateAndSave() to accept optional pre-fetched IDs
  - Update GeoEventProviderService to fetch IDs once
  - Pass fetched IDs to all chunks
  - Add metrics to track query reduction

**Status:** ✅ Covered

---

### Area 3: Spatial Join Performance

**Source:** perf-downside.md - Section "3. Spatial Join Performance"

**Mapped Tasks:**

- **19.3** Profile spatial join queries

  - Review alert creation queries
  - Run EXPLAIN ANALYZE on queries
  - Document query execution plans
  - Identify missing indexes or inefficient joins
  - Consider Site data caching
  - Add query timing metrics

- **20.8** Implement optional Site data caching
  - Create SiteCache class
  - Implement in-memory cache for Site geometries
  - Set TTL to 5 minutes
  - Add cache hit/miss metrics

**Status:** ✅ Covered

---

### Area 4: PQueue Concurrency Tuning

**Source:** perf-downside.md - Section "4. PQueue Concurrency Tuning"

**Mapped Tasks:**

- **19.4** Make PQueue concurrency configurable
  - Add PROVIDER_CONCURRENCY environment variable
  - Update env.mjs
  - Use configurable concurrency in PQueue
  - Document concurrency tuning recommendations

**Status:** ✅ Covered

---

### Area 5: ChecksumGenerator Initialization

**Source:** perf-downside.md - Section "5. ChecksumGenerator Initialization"

**Mapped Tasks:**

- **19.5** Analyze ChecksumGenerator initialization
  - Review EventProcessor (formerly ChecksumGenerator)
  - Measure XXHash3 initialization time
  - Determine if initialization is expensive
  - Consider singleton or lazy initialization
  - Add timing metrics
  - Document findings

**Status:** ✅ Covered

---

### Area 6: Memory Usage During Large Fetches

**Source:** perf-downside.md - Section "6. Memory Usage During Large Fetches"

**Mapped Tasks:**

- **19.6** Monitor memory usage during processing
  - Add memory usage logging in GeoEventProviderService
  - Log heap usage before/after event fetching
  - Log heap usage before/after chunking
  - Set alerts for heap usage >500MB
  - Track memory growth patterns
  - Document findings

**Status:** ✅ Covered

---

### Area 7: Transaction Overhead

**Source:** perf-downside.md - Section "7. Transaction Overhead"

**Mapped Tasks:**

- **19.7** Analyze transaction overhead
  - Review transaction usage in SiteAlertRepository
  - Measure transaction overhead per batch
  - Evaluate combining multiple small batches
  - Verify transaction isolation level
  - Document findings

**Status:** ✅ Covered

---

## From improvements.md: Code Optimization & Advanced Performance Improvements

### Category 1: Database Query Batching & Optimization

**Source:** improvements.md - Section "1. Database Query Batching & Optimization"

**Mapped Tasks:**

#### A. Batch Provider Updates

- **20.1** Implement batch provider updates
  - Add updateLastRunBatch() method
  - Collect all provider updates during processing
  - Execute single batch update at end
  - Update GeoEventProviderService to use batch updates

#### B. Single Existing IDs Query

- **20.2** Implement single existing IDs query (already covered above)

#### C. Prepared Statements

- **20.7** Verify Prisma prepared statements
  - Review Prisma client configuration
  - Verify prepared statements are enabled
  - Check connection pooling settings
  - Document findings

**Status:** ✅ Covered

---

### Category 2: Algorithmic Optimizations

**Source:** improvements.md - Section "2. Algorithmic Optimizations"

**Mapped Tasks:**

#### A. Duplicate Detection

- **19.1** Verify database indexes (includes duplicate detection optimization)

#### B. In-Memory Filtering

- **20.2** Implement single existing IDs query (includes in-memory filtering optimization)

**Status:** ✅ Covered

---

### Category 3: Caching Strategies

**Source:** improvements.md - Section "3. Caching Strategies"

**Mapped Tasks:**

#### A. Site Data Caching

- **20.8** Implement optional Site data caching (already covered above)

#### B. Provider Config Caching

- **20.9** Implement optional provider config caching
  - Update ProviderManager
  - Cache parsed provider configs
  - Avoid re-parsing JSON config
  - Add cache invalidation strategy
  - Add cache effectiveness metrics

**Status:** ✅ Covered

---

### Category 4: Parallelization Opportunities

**Source:** improvements.md - Section "4. Parallelization Opportunities"

**Mapped Tasks:**

#### A. Chunk Processing

- **20.10** Evaluate parallel chunk processing (already covered above)

#### B. Alert Creation Batches

- **20.10** Evaluate parallel chunk processing (includes alert batch parallelization)

**Status:** ✅ Covered

---

### Category 5: Resource Management

**Source:** improvements.md - Section "5. Resource Management"

**Mapped Tasks:**

#### A. Connection Pooling

- **20.7** Verify Prisma prepared statements (includes connection pooling)

#### B. Memory Management

- **19.6** Monitor memory usage during processing (already covered above)

**Status:** ✅ Covered

---

### Category 6: Early Exit Strategies

**Source:** improvements.md - Section "6. Early Exit Strategies"

**Mapped Tasks:**

#### A. Skip Empty Results

- **20.3** Implement early exit strategies
  - Skip bulk insert if no unique events
  - Exit loop if no unprocessed events
  - Add logging for early exits

#### B. Provider-Level Skip

- **20.4** Implement provider-level skip logic
  - Skip processing if provider returns 0 events
  - Track inactive providers
  - Consider temporary backoff

**Status:** ✅ Covered

---

### Category 7: Logging Optimization

**Source:** improvements.md - Section "7. Logging Optimization"

**Mapped Tasks:**

- **20.5** Optimize logging strategy
  - Use DEBUG level for chunk details
  - Use INFO level for provider operations
  - Use WARN level for performance issues
  - Batch related logs
  - Consider structured logging (JSON)

**Status:** ✅ Covered

---

### Category 8: Code-Level Micro-Optimizations

**Source:** improvements.md - Section "8. Code-Level Micro-Optimizations"

**Mapped Tasks:**

#### A. Array Operations

- **20.6** Implement array operation micro-optimizations
  - Replace multiple reduce calls with single-pass
  - Minimize object creation in hot paths
  - Document optimizations

#### B. Object Creation

- **20.6** Implement array operation micro-optimizations (includes object creation)

**Status:** ✅ Covered

---

## Implementation Priority Mapping

### High Priority (Do First)

**From improvements.md:**

1. Query existing IDs once per provider, not per chunk

   - **Mapped to:** 20.2 Implement single existing IDs query

2. Verify database indexes

   - **Mapped to:** 19.1 Verify database indexes

3. Make PQueue concurrency configurable

   - **Mapped to:** 19.4 Make PQueue concurrency configurable

4. Add early exit for empty results
   - **Mapped to:** 20.3 Implement early exit strategies

**Task Order:** 19.1 → 19.4 → 20.2 → 20.3

---

### Medium Priority

**From improvements.md:** 5. Batch provider updates

- **Mapped to:** 20.1 Implement batch provider updates

6. Parallel chunk processing (if safe)

   - **Mapped to:** 20.10 Evaluate parallel chunk processing

7. Site data caching
   - **Mapped to:** 20.8 Implement optional Site data caching

**Task Order:** 20.1 → 20.10 → 20.8

---

### Low Priority (Measure First)

**From improvements.md:** 8. Micro-optimizations

- **Mapped to:** 20.6 Implement array operation micro-optimizations

9. Advanced caching strategies

   - **Mapped to:** 20.9 Implement optional provider config caching

10. Memory management tweaks
    - **Mapped to:** 19.6 Monitor memory usage during processing

**Task Order:** 20.6 → 20.9 → 19.6

---

## Success Metrics Mapping

### From improvements.md - Success Metrics

**Metric 1: Provider processing time reduced by >30%**

- Validated by: **21.2** Benchmark provider processing time
- Optimizations contributing:
  - 20.1 Batch provider updates
  - 20.2 Single existing IDs query
  - 20.3 Early exit strategies
  - 20.4 Provider-level skip logic

**Metric 2: Database query count reduced by >40%**

- Validated by: **21.4** Benchmark database query performance
- Optimizations contributing:
  - 20.2 Single existing IDs query
  - 20.1 Batch provider updates
  - 19.1 Verify database indexes

**Metric 3: Memory usage stays under 512MB for 50k events**

- Validated by: **21.3** Benchmark memory usage
- Optimizations contributing:
  - 19.6 Monitor memory usage
  - 20.3 Early exit strategies
  - 20.4 Provider-level skip logic

**Metric 4: No increase in duplicate events (correctness maintained)**

- Validated by: **21.7** Verify no increase in duplicate events
- Optimizations maintaining correctness:
  - 20.2 Single existing IDs query (maintains deduplication)
  - 20.3 Early exit strategies (no logic changes)
  - 20.4 Provider-level skip logic (no logic changes)

---

## Deliverables Mapping

### From metrics.md - Expected Output

**Deliverable: Metrics in API Response**

- Implemented by: **18.7** Update RequestHandler response formatting
- Includes:
  - total_duration_ms
  - provider_processing details
  - avg_chunk_duration_ms
  - slowest_chunk_ms

**Mapped Task:** 18.7

---

### From perf-downside.md - Deliverables

**Deliverable 1: Performance report with metrics showing before/after**

- Implemented by: **21.6** Create performance baseline report
- Includes:
  - Before/after comparisons
  - Performance improvement percentages
  - Identified bottlenecks

**Deliverable 2: Implemented optimizations with feature flags for safe rollout**

- Implemented by: **22.2** Verify feature flag functionality
- Includes:
  - Feature flag testing
  - Rollback procedure verification

**Deliverable 3: Documentation of remaining bottlenecks**

- Implemented by: **19.8** Create performance audit report
- Includes:
  - Identified bottlenecks
  - Impact analysis
  - Recommendations

**Deliverable 4: Recommendations for infrastructure changes**

- Implemented by: **19.8** Create performance audit report
- Includes:
  - Database tuning recommendations
  - Connection pool recommendations

---

### From improvements.md - Success Metrics

**Metric Validation:**

- Provider processing time >30% reduction: **21.2**
- Database query count >40% reduction: **21.4**
- Memory usage <512MB for 50k events: **21.3**
- No increase in duplicate events: **21.7**

---

## Complete Requirements Coverage

### metrics.md Coverage: ✅ 100%

- Requirement 1 (PerformanceMetrics): Task 18.1
- Requirement 2 (ProcessingResult integration): Task 18.3
- Requirement 3 (GeoEventProviderService timing): Task 18.4
- Requirement 4 (GeoEventService timing): Task 18.5
- Requirement 5 (SiteAlertService timing): Task 18.6
- Requirement 6 (Response formatting): Task 18.7
- Requirement 7 (Logging): Task 18.8

### perf-downside.md Coverage: ✅ 100%

- Area 1 (Sequential vs Parallel): Task 20.10
- Area 2 (Database Query Optimization): Tasks 19.1, 19.2, 20.2
- Area 3 (Spatial Join Performance): Tasks 19.3, 20.8
- Area 4 (PQueue Concurrency): Task 19.4
- Area 5 (ChecksumGenerator Initialization): Task 19.5
- Area 6 (Memory Usage): Task 19.6
- Area 7 (Transaction Overhead): Task 19.7

### improvements.md Coverage: ✅ 100%

- Category 1 (Database Query Batching): Tasks 20.1, 20.2, 20.7
- Category 2 (Algorithmic Optimizations): Tasks 19.1, 20.2
- Category 3 (Caching Strategies): Tasks 20.8, 20.9
- Category 4 (Parallelization): Task 20.10
- Category 5 (Resource Management): Tasks 20.7, 19.6
- Category 6 (Early Exit Strategies): Tasks 20.3, 20.4
- Category 7 (Logging Optimization): Task 20.5
- Category 8 (Micro-Optimizations): Task 20.6

---

## Summary

**Total Requirements Mapped:** 30+  
**Total Tasks Created:** 43  
**Coverage:** 100%

All requirements from the three performance and optimization documents have been mapped to specific, actionable tasks in the extended tasks.md file. Each task includes clear objectives, deliverables, and success criteria.
