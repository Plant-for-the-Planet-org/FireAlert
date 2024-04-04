-- Site View
CREATE OR REPLACE VIEW view_site AS
SELECT
    "id",
    "name",
    "type",
    "radius",
    "isMonitored",
    "userId",
    "slices"
FROM
    "Site"
WHERE
    "deletedAt" IS NULL;

-- SiteAlert View
CREATE OR REPLACE VIEW view_siteAlert AS
SELECT
    "id",
    "siteId",
    "type",
    "latitude",
    "longitude",
    "eventDate",
    "detectedBy",
    "confidence"
FROM
    "SiteAlert"
WHERE
    "deletedAt" IS NULL;
