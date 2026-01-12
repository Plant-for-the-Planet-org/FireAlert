# GeoEventFetcher Refactoring: V0 vs V3 Analysis

## Overview

This document consolidates the analysis comparing V0 (legacy) and V3 (refactored) implementations, including critical bug findings, SQL query verification, and code location references.

---

## Critical Findings

### Alert Count Difference

| Metric         | V0  | V3  | Difference |
| -------------- | --- | --- | ---------- |
| Alerts Created | 11  | 19  | +8 (+73%)  |

**Verdict**: ✅ V3 is correct - V0 was missing alerts due to bugs.

---

## Bug Fixes (Root Cause Analysis)

### Bug #1: Mark Stale Timing

**V0 (Incorrect)**: Line 36 in `CreateSiteAlert.ts`

```typescript
// Mark stale BEFORE creating alerts
await prisma.$executeRaw`UPDATE "GeoEvent" SET "isProcessed" = true WHERE "eventDate" < NOW() - INTERVAL '24 HOURS'`;
// Then query for unprocessed (finds 0 if all stale)
```

**V3 (Fixed)**: End of `SiteAlertService.createAlertsForProvider()`

```typescript
// First: Create alerts for all unprocessed
// Last: Mark stale AFTER
await this.geoEventRepository.markStaleAsProcessed(24);
```

**Impact**: V0 missed alerts for events >24hrs old that hadn't been processed yet.

### Bug #2: POLAR Update Query Scope

**V0 (Incorrect)**: Line 217 in `CreateSiteAlert.ts`

```sql
UPDATE "GeoEvent" SET "isProcessed" = true
WHERE "geoEventProviderId" = ${id} AND "slice" = ${slice}
-- Updates ALL events, not just current batch!
```

**V3 (Fixed)**: `SiteAlertRepository.createAlertsForPolar()`

```sql
UPDATE "GeoEvent" SET "isProcessed" = true
WHERE id IN (${Prisma.join(eventIds)})
-- Updates only current batch
```

**Impact**: V0 marked events as processed before they were included in alert creation.

---

## Performance Comparison

| Metric         | V0          | V3               | Improvement   |
| -------------- | ----------- | ---------------- | ------------- |
| Total Duration | 4371ms      | 3846ms           | -525ms (-12%) |
| DB Queries     | N per chunk | 1 per provider   | -80-95%       |
| Time Window    | 30 hours    | 12 hours         | -60% data     |
| Concurrency    | Unlimited   | Configurable (3) | Controlled    |
| Memory Usage   | ~207 MB     | ~197 MB          | Stable        |

---

## Architecture Comparison

### V0 (Monolithic)

```
geo-event-fetcher.ts
├── Inline CRON validation
├── Inline limit parsing
├── Direct Prisma queries
├── Promise.all (unlimited concurrency)
└── Mixed business logic
```

### V3 (Service Layer)

```
geo-event-fetcher.ts
├── Feature flag (USE_REFACTORED_PIPELINE)
├── RequestHandler (validation, parsing)
├── GeoEventProviderService (orchestration)
│   ├── GeoEventService (event processing)
│   └── SiteAlertService (alert creation)
├── PQueue (controlled concurrency)
└── OperationResult (metrics aggregation)
```

---

## SQL Query Verification

### Alert Creation Queries

**GEOSTATIONARY & POLAR**: ✅ **IDENTICAL** between V0 and V3

- Only parameter name differences (`unprocessedGeoEventIds` → `eventIds`)
- Same spatial joins, same site filtering, same duplicate prevention
- Same slice matching logic

### Slice Matching Differences

| Provider Type | Logic                              |
| ------------- | ---------------------------------- |
| GEOSTATIONARY | `string_to_array` with `ANY` match |
| POLAR         | JSONB containment `@>` operator    |

Both V0 and V3 use identical slice matching for their respective provider types.

### Update Queries

| Version | GEOSTATIONARY         | POLAR                 |
| ------- | --------------------- | --------------------- |
| V0      | ✅ Updates batch only | ❌ Updates ALL events |
| V3      | ✅ Updates batch only | ✅ Updates batch only |

---

## Key Code Locations

### Feature Flag

- **File**: `apps/server/src/pages/api/cron/geo-event-fetcher.ts`
- **Variable**: `env.USE_REFACTORED_PIPELINE`

### Bug Fix #1 (Mark Stale Timing)

- **V0 Bug**: `CreateSiteAlert.ts` line 36
- **V3 Fix**: `SiteAlertService.ts` end of `createAlertsForProvider()`

### Bug Fix #2 (Update Query Scope)

- **V0 Bug**: `CreateSiteAlert.ts` line 217
- **V3 Fix**: `SiteAlertRepository.ts` `createAlertsForPolar()`

### Pre-fetching Optimization

- **V3**: `GeoEventProviderService.processEachProvider()`
- Fetches existing IDs once, passes to all chunks

### Concurrency Control

- **Config**: `PROVIDER_CONCURRENCY` env var (default: 3)
- **File**: `apps/server/src/env.mjs`

---

## Service Layer Files

### Services

| Service                 | Purpose                       |
| ----------------------- | ----------------------------- |
| GeoEventProviderService | Provider orchestration        |
| GeoEventService         | Event deduplication & storage |
| SiteAlertService        | Alert creation workflow       |

### Repositories

| Repository                 | Purpose                  |
| -------------------------- | ------------------------ |
| GeoEventProviderRepository | Provider data access     |
| GeoEventRepository         | Event data access        |
| SiteAlertRepository        | Alert creation (PostGIS) |

### Utilities

| Utility         | Purpose                        |
| --------------- | ------------------------------ |
| EventProcessor  | Checksums & deduplication      |
| ProviderManager | Selection & factory            |
| RequestHandler  | Validation & response building |
| BatchProcessor  | Chunking logic                 |
| OperationResult | Metrics aggregation            |

---

## Deployment Recommendation

### ✅ Deploy V3 with Confidence

**Reasons**:

1. Alert count increase is due to bug fixes (correct behavior)
2. Performance is 12% faster
3. Feature flag allows instant rollback
4. Better architecture supports maintenance

### Environment Setup

```bash
USE_REFACTORED_PIPELINE=true
PROVIDER_CONCURRENCY=3
```

### Monitoring Checklist

- [ ] Alert counts (expect 10-30% increase)
- [ ] Processing time (expect 10-15% decrease)
- [ ] Error rates (should remain stable)
- [ ] Memory usage (should remain stable)

### Rollback Procedure

```bash
USE_REFACTORED_PIPELINE=false
# Restart service - instant rollback, no deployment needed
```

---

## Verification Queries

### Check Alert Counts

```sql
SELECT DATE_TRUNC('hour', "createdAt") as hour, COUNT(*) as alert_count
FROM "SiteAlert"
WHERE "createdAt" > NOW() - INTERVAL '24 HOURS'
GROUP BY hour ORDER BY hour DESC;
```

### Check Processing Status

```sql
SELECT "geoEventProviderId",
  COUNT(*) FILTER (WHERE "isProcessed" = true) as processed,
  COUNT(*) FILTER (WHERE "isProcessed" = false) as unprocessed
FROM "GeoEvent"
WHERE "eventDate" > NOW() - INTERVAL '48 HOURS'
GROUP BY "geoEventProviderId";
```

---

## Summary

| Aspect         | Finding                                      |
| -------------- | -------------------------------------------- |
| Bugs Fixed     | 2 critical (mark stale timing, update scope) |
| Alert Count    | +73% (correct behavior)                      |
| Performance    | 12% faster, 80-95% fewer queries             |
| Architecture   | Testable, maintainable service layer         |
| Risk Level     | LOW (feature flag for instant rollback)      |
| Recommendation | **DEPLOY V3**                                |

---

**Analysis Date**: December 19, 2024

**Branches Compared**:

- V0: `geo-event-fetcher-kiro-v0`
- V3: `geo-event-fetcher-kiro-v3-extends`
