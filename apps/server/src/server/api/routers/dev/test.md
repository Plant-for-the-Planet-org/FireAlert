# Test Points for Site Incident Testing

**Site Center:** `[86.39005, 23.67988]`  
**Detection Radius:** 50km

## Test Points

```javascript
// CLUSTER A - Close proximity (within 1km of center)
const clusterA = [
  { lat: 23.67988, lon: 86.39005 }, // exact center
  { lat: 23.68100, lon: 86.39150 }, // ~1.8km NE
  { lat: 23.67850, lon: 86.38900 }, // ~1.5km SW
];


// CLUSTER B - Medium distance (5-10km from center)
const clusterB = [
  { lat: 23.72000, lon: 86.43000 }, // ~6.5km NE
  { lat: 23.73000, lon: 86.44000 }, // ~8km NE
];

// EDGE POINT - Near detection boundary (~45km)
const edgePoint = { lat: 23.95000, lon: 86.70000 };
```

## Test Execution Guide

### Test Case 1: Initial Incident

```bash
# Create first alert
curl -X POST /api/trpc/dev.siteAlert.create \
  -d '{"siteId":"cmj9qdbfq0005drntft81wrdh","latitude":23.67988,"longitude":86.39005}'

# Run manager
curl /api/cron/site-incident-manager

# Verify: 1 incident, isActive=true, 1 alert linked
```

### Test Case 2: Alert Association (Within 6H)

```bash
# Create bulk alerts from Cluster A
curl -X POST /api/trpc/dev.siteAlert.createBulk \
  -d '{"siteId":"cmj9qdbfq0005drntft81wrdh","latitude":23.68100,"longitude":86.39150,"count":2,"radiusKm":0.5}'

# Run manager
curl /api/cron/site-incident-manager

# Verify: Same incident, 3 alerts total, latestSiteAlertId updated
```

### Test Case 3: Incident Resolution

```bash
# Option A: Wait 6+ hours (real-time)
sleep 21600

# Option B: Manual DB update (instant)
# UPDATE "SiteIncident" SET "updatedAt" = NOW() - INTERVAL '7 hours' WHERE "siteId" = 'cmj9qdbfq0005drntft81wrdh';
# UPDATE "SiteAlert" SET "eventDate" = NOW() - INTERVAL '7 hours' WHERE "siteIncidentId" = '<incident_id>';

# Run manager
curl /api/cron/site-incident-manager

# Verify: isActive=false, endedAt set, isProcessed=false
```

### Test Case 4: New Incident After Gap

```bash
# Create old alert (7h ago)
curl -X POST /api/trpc/dev.siteAlert.create \
  -d '{"siteId":"cmj9qdbfq0005drntft81wrdh","latitude":23.72000,"longitude":86.43000,"eventDate":"2025-01-21T17:00:00Z"}'

# Run manager (creates & resolves Incident A)
curl /api/cron/site-incident-manager

# Create new alert (now)
curl -X POST /api/trpc/dev.siteAlert.create \
  -d '{"siteId":"cmj9qdbfq0005drntft81wrdh","latitude":23.73000,"longitude":86.44000}'

# Run manager (creates Incident B)
curl /api/cron/site-incident-manager

# Verify: 2 incidents total, A closed, B active
```

### Test Case 5: Backfill

```bash
# Create 10 unlinked alerts
curl -X POST /api/trpc/dev.siteAlert.createBulk \
  -d '{"siteId":"cmj9qdbfq0005drntft81wrdh","latitude":23.67988,"longitude":86.39005,"count":10,"radiusKm":2}'

# Run manager once
curl /api/cron/site-incident-manager

# Verify: linkedCount=10, all in same incident
```

## Verification Queries

```sql
-- Check incident status
SELECT id, "isActive", "startedAt", "endedAt", "startSiteAlertId", "latestSiteAlertId" 
FROM "SiteIncident" 
WHERE "siteId" = 'cmj9qdbfq0005drntft81wrdh';

-- Check alert linkage
SELECT id, "eventDate", "siteIncidentId" 
FROM "SiteAlert" 
WHERE "siteId" = 'cmj9qdbfq0005drntft81wrdh' 
ORDER BY "eventDate" DESC;

-- Count alerts per incident
SELECT "siteIncidentId", COUNT(*) 
FROM "SiteAlert" 
WHERE "siteId" = 'cmj9qdbfq0005drntft81wrdh' 
GROUP BY "siteIncidentId";
```