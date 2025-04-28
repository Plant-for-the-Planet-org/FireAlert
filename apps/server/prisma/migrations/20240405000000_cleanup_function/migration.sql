-- Create cleanup function with minimal locks and dry-run mode
CREATE OR REPLACE FUNCTION cleanup_old_records(dry_run BOOLEAN DEFAULT false)
RETURNS TABLE (
    table_name TEXT,
    records_to_delete BIGINT,
    actually_deleted BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    geo_events_deleted INTEGER;
    sites_deleted INTEGER;
    site_alerts_deleted INTEGER;
    geo_events_batch_size INTEGER := 10000;
    sites_batch_size INTEGER := 1000;
    site_alerts_batch_size INTEGER := 1000;
    max_iterations INTEGER := 1;
    iteration INTEGER := 0;
BEGIN
    -- Return a table of what would be deleted
    RETURN QUERY
    WITH counts AS (
        SELECT 
            'GeoEvent' as table_name,
            COUNT(*) as to_delete,
            0 as deleted
        FROM "GeoEvent"
        WHERE "eventDate" <= CURRENT_DATE - INTERVAL '14 days'
        UNION ALL
        SELECT 
            'Site' as table_name,
            COUNT(*) as to_delete,
            0 as deleted
        FROM "Site"
        WHERE "deletedAt" <= CURRENT_DATE - INTERVAL '14 days'
        UNION ALL
        SELECT 
            'SiteAlert' as table_name,
            COUNT(*) as to_delete,
            0 as deleted
        FROM "SiteAlert"
        WHERE "deletedAt" <= CURRENT_DATE - INTERVAL '13 days'
    )
    SELECT * FROM counts;

    -- If dry_run, don't actually delete anything
    IF dry_run THEN
        RETURN;
    END IF;

    -- Cleanup GeoEvents
    geo_events_deleted := 0;
    iteration := 0;
    WHILE iteration < max_iterations LOOP
        WITH target_rows AS (
            SELECT id FROM "GeoEvent"
            WHERE "eventDate" <= CURRENT_DATE - INTERVAL '14 days'
            LIMIT geo_events_batch_size
            FOR UPDATE SKIP LOCKED
        ),
        deleted AS (
            DELETE FROM "GeoEvent"
            WHERE id IN (SELECT id FROM target_rows)
            RETURNING *
        )
        SELECT COUNT(*) INTO geo_events_deleted FROM deleted;
        
        IF geo_events_deleted = 0 THEN
            EXIT;
        END IF;
        
        iteration := iteration + 1;
    END LOOP;
    
    -- Update Stats for GeoEvents
    INSERT INTO "Stats" ("id", "metric", "count", "lastUpdated")
    VALUES (gen_random_uuid(), 'geoEvents_deleted', geo_events_deleted, CURRENT_TIMESTAMP)
    ON CONFLICT ("metric") DO UPDATE
    SET "count" = "Stats"."count" + EXCLUDED."count",
        "lastUpdated" = CURRENT_TIMESTAMP;

    -- Cleanup Sites
    sites_deleted := 0;
    iteration := 0;
    WHILE iteration < max_iterations LOOP
        WITH target_rows AS (
            SELECT id FROM "Site"
            WHERE "deletedAt" <= CURRENT_DATE - INTERVAL '14 days'
            LIMIT sites_batch_size
            FOR UPDATE SKIP LOCKED
        ),
        deleted AS (
            DELETE FROM "Site"
            WHERE id IN (SELECT id FROM target_rows)
            RETURNING *
        )
        SELECT COUNT(*) INTO sites_deleted FROM deleted;
        
        IF sites_deleted = 0 THEN
            EXIT;
        END IF;
        
        iteration := iteration + 1;
    END LOOP;
    
    -- Update Stats for Sites
    INSERT INTO "Stats" ("id", "metric", "count", "lastUpdated")
    VALUES (gen_random_uuid(), 'sites_deleted', sites_deleted, CURRENT_TIMESTAMP)
    ON CONFLICT ("metric") DO UPDATE
    SET "count" = "Stats"."count" + EXCLUDED."count",
        "lastUpdated" = CURRENT_TIMESTAMP;

    -- Cleanup SiteAlerts
    site_alerts_deleted := 0;
    iteration := 0;
    WHILE iteration < max_iterations LOOP
        WITH target_rows AS (
            SELECT id FROM "SiteAlert"
            WHERE "deletedAt" <= CURRENT_DATE - INTERVAL '13 days'
            LIMIT site_alerts_batch_size
            FOR UPDATE SKIP LOCKED
        ),
        deleted AS (
            DELETE FROM "SiteAlert"
            WHERE id IN (SELECT id FROM target_rows)
            RETURNING *
        )
        SELECT COUNT(*) INTO site_alerts_deleted FROM deleted;
        
        IF site_alerts_deleted = 0 THEN
            EXIT;
        END IF;
        
        iteration := iteration + 1;
    END LOOP;
    
    -- Update Stats for SiteAlerts
    INSERT INTO "Stats" ("id", "metric", "count", "lastUpdated")
    VALUES (gen_random_uuid(), 'siteAlerts_deleted', site_alerts_deleted, CURRENT_TIMESTAMP)
    ON CONFLICT ("metric") DO UPDATE
    SET "count" = "Stats"."count" + EXCLUDED."count",
        "lastUpdated" = CURRENT_TIMESTAMP;

    -- Log the cleanup results
    RAISE NOTICE 'Cleanup completed: % GeoEvents, % Sites, % SiteAlerts deleted',
        geo_events_deleted, sites_deleted, site_alerts_deleted;

    -- Return final results
    RETURN QUERY
    SELECT 'GeoEvent' as table_name, geo_events_deleted as records_to_delete, geo_events_deleted as actually_deleted
    UNION ALL
    SELECT 'Site' as table_name, sites_deleted as records_to_delete, sites_deleted as actually_deleted
    UNION ALL
    SELECT 'SiteAlert' as table_name, site_alerts_deleted as records_to_delete, site_alerts_deleted as actually_deleted;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION cleanup_old_records(BOOLEAN) IS 'Cleans up old records from GeoEvent, Site, and SiteAlert tables. Uses SKIP LOCKED to minimize lock contention. Processes GeoEvents in batches of 10000, Sites and SiteAlerts in batches of 1000. Set dry_run=true to see what would be deleted without actually deleting.'; 