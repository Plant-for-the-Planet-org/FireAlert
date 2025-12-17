# Add Performance Metrics to GeoEvent Processing Pipeline

## Objective

Add detailed timing and performance metrics throughout the processing pipeline to identify bottlenecks and track system health.

## Requirements

### 1. Create PerformanceMetrics Domain Model

**File:** `src/domain/PerformanceMetrics.ts`

Create a class that tracks:

- Start/end timestamps for operations
- Duration calculations
- Nested timing (e.g., provider → chunks → deduplication)
- Memory snapshots (if feasible)
- Ability to merge metrics from multiple operations

Methods needed:

- `startTimer(label: string): void`
- `endTimer(label: string): number` // returns duration in ms
- `recordMetric(label: string, value: number): void`
- `getMetrics(): object`
- `merge(other: PerformanceMetrics): PerformanceMetrics`

### 2. Integrate into ProcessingResult

**File:** `src/domain/ProcessingResult.ts`

Add a `metrics` field to store PerformanceMetrics and include in `toJSON()` output.

### 3. Add Timing to GeoEventProviderService

**File:** `src/Services/GeoEventProviderService.ts`

Track:

- Total provider processing time
- Event fetching time
- Chunk processing time (per chunk)
- Alert creation time
- Database update time

Example structure:

```typescript
const metrics = new PerformanceMetrics();
metrics.startTimer('provider_total');
metrics.startTimer('fetch_events');
const geoEvents = await geoEventProvider.getLatestGeoEvents(...);
metrics.endTimer('fetch_events');
// ... continue for each major step
```

### 4. Add Timing to GeoEventService

**File:** `src/Services/GeoEventService.ts`

Track:

- Checksum generation time
- Database fetch time (existing IDs)
- Duplicate filtering time
- Bulk insert time

### 5. Add Timing to SiteAlertService

**File:** `src/Services/SiteAlertService.ts`

Track:

- Mark stale time
- Per-batch alert creation time
- Total alert creation time

### 6. Update Response to Include Metrics

**File:** `src/handlers/utils/ResponseBuilder.ts`

Include detailed metrics breakdown in success response.

### 7. Add Logging for Key Metrics

Log performance data at INFO level for:

- Providers taking >5 seconds
- Chunks taking >2 seconds
- Alert creation taking >3 seconds

Log at WARN level for:

- Providers taking >30 seconds
- Any operation timing out

## Expected Output Example

```json
{
  "message": "Geo-event-fetcher Cron job executed successfully",
  "alertsCreated": 150,
  "eventsProcessed": 5000,
  "eventsCreated": 4500,
  "processedProviders": 3,
  "metrics": {
    "total_duration_ms": 8500,
    "provider_processing": {
      "provider_1": {
        "total_ms": 3200,
        "fetch_ms": 800,
        "deduplication_ms": 1500,
        "alert_creation_ms": 900,
        "chunks_processed": 3
      }
    },
    "avg_chunk_duration_ms": 450,
    "slowest_chunk_ms": 1200
  }
}
```
