# SQL Query Comparison: V0 vs V3

## Purpose

Verify that the `siteAlertCreationQuery` SQL is identical between V0 (CreateSiteAlert.ts) and V3 (SiteAlertRepository.ts).

## GEOSTATIONARY Query Comparison

### V0 (CreateSiteAlert.ts - Line 54)

```sql
INSERT INTO "SiteAlert" (id, TYPE, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
SELECT
    gen_random_uuid(),
    e.type,
    FALSE,
    e."eventDate",
    ${geoEventProviderClientId},
    e.confidence,
    e.latitude,
    e.longitude,
    s.id AS SiteId,
    e.data,
    ST_Distance(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex'))) AS distance
FROM
    "GeoEvent" e
CROSS JOIN
    "Site" s,
    jsonb_array_elements_text(s."geometry"->'properties'->'detection_geometry') AS dg_elem
WHERE
    e.id IN (${Prisma.join(unprocessedGeoEventIds)})
    AND s."type" = 'MultiPolygon'
    AND s."deletedAt" IS NULL
    AND s."isMonitored" = TRUE
    AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
    AND e."isProcessed" = FALSE
    AND e. "geoEventProviderId" = ${geoEventProviderId}
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(s.slices) AS slice_element
      WHERE slice_element = ANY(string_to_array(${Prisma.raw(`'${slice}'`)}, ',')::text[])
    )
    AND ST_Within(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex')))
    AND NOT EXISTS (
        SELECT 1
        FROM "SiteAlert"
        WHERE "SiteAlert".longitude = e.longitude
            AND "SiteAlert".latitude = e.latitude
            AND "SiteAlert"."eventDate" = e."eventDate"
            AND "SiteAlert"."siteId" = s.id
    )

UNION

SELECT
    gen_random_uuid(),
    e.type,
    FALSE,
    e."eventDate",
    ${geoEventProviderClientId},
    e.confidence,
    e.latitude,
    e.longitude,
    s.id AS SiteId,
    e.data,
    ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
FROM
    "GeoEvent" e
INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
    AND e.id IN (${Prisma.join(unprocessedGeoEventIds)})
    AND s."deletedAt" IS NULL
    AND s."isMonitored" = TRUE
    AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
    AND e."isProcessed" = FALSE
    AND e. "geoEventProviderId" = ${geoEventProviderId}
    AND (s.type = 'Polygon' OR s.type = 'Point')
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(s.slices) AS slice_element
      WHERE slice_element = ANY(string_to_array(${Prisma.raw(`'${slice}'`)}, ',')::text[])
    )
    AND NOT EXISTS (
        SELECT 1
        FROM "SiteAlert"
        WHERE "SiteAlert".longitude = e.longitude
            AND "SiteAlert".latitude = e.latitude
            AND "SiteAlert"."eventDate" = e."eventDate"
            AND "SiteAlert"."siteId" = s.id
    );
```

### V3 (SiteAlertRepository.ts - createAlertsForGeostationary)

```sql
INSERT INTO "SiteAlert" (id, TYPE, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
SELECT
    gen_random_uuid(),
    e.type,
    FALSE,
    e."eventDate",
    ${clientId},
    e.confidence,
    e.latitude,
    e.longitude,
    s.id AS SiteId,
    e.data,
    ST_Distance(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex'))) AS distance
FROM
    "GeoEvent" e
CROSS JOIN
    "Site" s,
    jsonb_array_elements_text(s."geometry"->'properties'->'detection_geometry') AS dg_elem
WHERE
    e.id IN (${Prisma.join(eventIds)})
    AND s."type" = 'MultiPolygon'
    AND s."deletedAt" IS NULL
    AND s."isMonitored" = TRUE
    AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
    AND e."isProcessed" = FALSE
    AND e. "geoEventProviderId" = ${providerId}
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(s.slices) AS slice_element
      WHERE slice_element = ANY(string_to_array(${Prisma.raw(`'${slice}'`)}, ',')::text[])
    )
    AND ST_Within(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex')))
    AND NOT EXISTS (
        SELECT 1
        FROM "SiteAlert"
        WHERE "SiteAlert".longitude = e.longitude
            AND "SiteAlert".latitude = e.latitude
            AND "SiteAlert"."eventDate" = e."eventDate"
            AND "SiteAlert"."siteId" = s.id
    )

UNION

SELECT
    gen_random_uuid(),
    e.type,
    FALSE,
    e."eventDate",
    ${clientId},
    e.confidence,
    e.latitude,
    e.longitude,
    s.id AS SiteId,
    e.data,
    ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
FROM
    "GeoEvent" e
INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
    AND e.id IN (${Prisma.join(eventIds)})
    AND s."deletedAt" IS NULL
    AND s."isMonitored" = TRUE
    AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
    AND e."isProcessed" = FALSE
    AND e. "geoEventProviderId" = ${providerId}
    AND (s.type = 'Polygon' OR s.type = 'Point')
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(s.slices) AS slice_element
      WHERE slice_element = ANY(string_to_array(${Prisma.raw(`'${slice}'`)}, ',')::text[])
    )
    AND NOT EXISTS (
        SELECT 1
        FROM "SiteAlert"
        WHERE "SiteAlert".longitude = e.longitude
            AND "SiteAlert".latitude = e.latitude
            AND "SiteAlert"."eventDate" = e."eventDate"
            AND "SiteAlert"."siteId" = s.id
    );
```

### GEOSTATIONARY Differences:

✅ **IDENTICAL** - Only variable name differences:

- `unprocessedGeoEventIds` → `eventIds`
- `geoEventProviderClientId` → `clientId`
- `geoEventProviderId` → `providerId`

These are just parameter names and don't affect the SQL logic.

---

## POLAR Query Comparison

### V0 (CreateSiteAlert.ts - Line 180)

```sql
INSERT INTO "SiteAlert" (id, TYPE, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")

SELECT
    gen_random_uuid(),
    e.type,
    FALSE,
    e."eventDate",
    ${geoEventProviderClientId},
    e.confidence,
    e.latitude,
    e.longitude,
    s.id AS SiteId,
    e.data,
    ST_Distance(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex'))) AS distance
FROM
    "GeoEvent" e
CROSS JOIN
    "Site" s,
    jsonb_array_elements_text(s."geometry"->'properties'->'detection_geometry') AS dg_elem
WHERE
    e.id IN (${Prisma.join(unprocessedGeoEventIds)})
    AND s."type" = 'MultiPolygon'
    AND s."deletedAt" IS NULL
    AND s."isMonitored" = TRUE
    AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
    AND e."isProcessed" = FALSE
    AND e. "geoEventProviderId" = ${geoEventProviderId}
    AND s.slices @> ('["' || ${slice} || '"]')::jsonb
    AND ST_Within(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex')))
    AND NOT EXISTS (
        SELECT 1
        FROM "SiteAlert"
        WHERE "SiteAlert".longitude = e.longitude
            AND "SiteAlert".latitude = e.latitude
            AND "SiteAlert"."eventDate" = e."eventDate"
            AND "SiteAlert"."siteId" = s.id
    )

UNION

SELECT
    gen_random_uuid(),
    e.type,
    FALSE,
    e."eventDate",
    ${geoEventProviderClientId},
    e.confidence,
    e.latitude,
    e.longitude,
    s.id AS SiteId,
    e.data,
    ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
FROM
    "GeoEvent" e
INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
    AND e.id IN (${Prisma.join(unprocessedGeoEventIds)})
    AND s."deletedAt" IS NULL
    AND s."isMonitored" = TRUE
    AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
    AND e."isProcessed" = FALSE
    AND e. "geoEventProviderId" = ${geoEventProviderId}
    AND s.slices @> ('["' || ${slice} || '"]')::jsonb
    AND (s.type = 'Polygon' OR s.type = 'Point')
    AND NOT EXISTS (
        SELECT 1
        FROM "SiteAlert"
        WHERE "SiteAlert".longitude = e.longitude
            AND "SiteAlert".latitude = e.latitude
            AND "SiteAlert"."eventDate" = e."eventDate"
            AND "SiteAlert"."siteId" = s.id
    );
```

### V3 (SiteAlertRepository.ts - createAlertsForPolar)

```sql
INSERT INTO "SiteAlert" (id, TYPE, "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")

SELECT
    gen_random_uuid(),
    e.type,
    FALSE,
    e."eventDate",
    ${clientId},
    e.confidence,
    e.latitude,
    e.longitude,
    s.id AS SiteId,
    e.data,
    ST_Distance(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex'))) AS distance
FROM
    "GeoEvent" e
CROSS JOIN
    "Site" s,
    jsonb_array_elements_text(s."geometry"->'properties'->'detection_geometry') AS dg_elem
WHERE
    e.id IN (${Prisma.join(eventIds)})
    AND s."type" = 'MultiPolygon'
    AND s."deletedAt" IS NULL
    AND s."isMonitored" = TRUE
    AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
    AND e."isProcessed" = FALSE
    AND e. "geoEventProviderId" = ${providerId}
    AND s.slices @> ('["' || ${slice} || '"]')::jsonb
    AND ST_Within(ST_SetSRID(ST_MakePoint(e.longitude, e.latitude), 4326), ST_GeomFromEWKB(decode(dg_elem, 'hex')))
    AND NOT EXISTS (
        SELECT 1
        FROM "SiteAlert"
        WHERE "SiteAlert".longitude = e.longitude
            AND "SiteAlert".latitude = e.latitude
            AND "SiteAlert"."eventDate" = e."eventDate"
            AND "SiteAlert"."siteId" = s.id
    )

UNION

SELECT
    gen_random_uuid(),
    e.type,
    FALSE,
    e."eventDate",
    ${clientId},
    e.confidence,
    e.latitude,
    e.longitude,
    s.id AS SiteId,
    e.data,
    ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
FROM
    "GeoEvent" e
INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
    AND e.id IN (${Prisma.join(eventIds)})
    AND s."deletedAt" IS NULL
    AND s."isMonitored" = TRUE
    AND (s."stopAlertUntil" IS NULL OR s."stopAlertUntil" < CURRENT_TIMESTAMP)
    AND e."isProcessed" = FALSE
    AND e. "geoEventProviderId" = ${providerId}
    AND s.slices @> ('["' || ${slice} || '"]')::jsonb
    AND (s.type = 'Polygon' OR s.type = 'Point')
    AND NOT EXISTS (
        SELECT 1
        FROM "SiteAlert"
        WHERE "SiteAlert".longitude = e.longitude
            AND "SiteAlert".latitude = e.latitude
            AND "SiteAlert"."eventDate" = e."eventDate"
            AND "SiteAlert"."siteId" = s.id
    );
```

### POLAR Differences:

✅ **IDENTICAL** - Only variable name differences:

- `unprocessedGeoEventIds` → `eventIds`
- `geoEventProviderClientId` → `clientId`
- `geoEventProviderId` → `providerId`

---

## Key Difference: Slice Matching Logic

### GEOSTATIONARY (Both V0 and V3):

```sql
AND EXISTS (
  SELECT 1
  FROM jsonb_array_elements_text(s.slices) AS slice_element
  WHERE slice_element = ANY(string_to_array('${slice}', ',')::text[])
)
```

**Explanation:** GEOSTATIONARY slices can contain comma-separated values (e.g., "0,1,2"), so it splits the slice string and checks if ANY element matches.

### POLAR (Both V0 and V3):

```sql
AND s.slices @> ('["' || ${slice} || '"]')::jsonb
```

**Explanation:** POLAR slices are exact matches using JSONB containment operator `@>`.

---

## UPDATE Query Comparison

### V0 GEOSTATIONARY:

```sql
UPDATE "GeoEvent"
SET "isProcessed" = true
WHERE id IN (${Prisma.join(unprocessedGeoEventIds)})
```

✅ **Correct** - Updates only the batch

### V0 POLAR:

```sql
UPDATE "GeoEvent"
SET "isProcessed" = true
WHERE "isProcessed" = false
  AND "geoEventProviderId" = ${geoEventProviderId}
  AND "slice" = ${slice}
```

❌ **BUG** - Updates ALL events for provider+slice, not just the batch!

### V3 GEOSTATIONARY:

```sql
UPDATE "GeoEvent"
SET "isProcessed" = true
WHERE id IN (${Prisma.join(eventIds)})
```

✅ **Correct** - Updates only the batch

### V3 POLAR:

```sql
UPDATE "GeoEvent"
SET "isProcessed" = true
WHERE id IN (${Prisma.join(eventIds)})
```

✅ **Fixed** - Now updates only the batch (bug fixed!)

---

## Conclusion

✅ **Alert Creation Queries: IDENTICAL**

- V0 and V3 use the exact same SQL for creating alerts
- Only parameter name differences (no functional changes)

✅ **V3 Fixes V0 Bug**

- V0 POLAR branch has a bug in the UPDATE query
- V3 correctly updates only the processed batch

✅ **Queries Verified**

- GEOSTATIONARY: Identical logic
- POLAR: Identical logic
- Both should produce the same alert counts
