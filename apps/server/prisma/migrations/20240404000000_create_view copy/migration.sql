-- Update SiteAlert View
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
    "deletedAt" IS NULL
    AND "eventDate" >= CURRENT_DATE - INTERVAL '30 days';

