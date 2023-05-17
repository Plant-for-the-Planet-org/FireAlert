-- Add trigger to Site to generate detection geometry
CREATE OR REPLACE FUNCTION handle_sitedetection() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO "SiteDetection" ("id", "siteId", "detectionGeometry")
        VALUES (gen_random_uuid(), NEW."id", ST_Buffer(ST_GeomFromGeoJSON(NEW."geometry"::text), NEW."radius"));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE "SiteDetection" 
        SET "detectionGeometry" = ST_Buffer(ST_GeomFromGeoJSON(NEW."geometry"::text), NEW."radius")
        WHERE "siteId" = NEW."id";
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_insert_trigger
AFTER INSERT ON "Site" 
FOR EACH ROW EXECUTE FUNCTION handle_sitedetection();

CREATE TRIGGER site_update_trigger
AFTER UPDATE OF "geometry", "radius" ON "Site" 
FOR EACH ROW EXECUTE FUNCTION handle_sitedetection();


-- Add trigger to GeoEvent table
CREATE OR REPLACE FUNCTION handle_geoevent() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        NEW."geometry" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        NEW."geometry" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER geoevent_insert_update_trigger
BEFORE INSERT OR UPDATE ON "GeoEvent"
FOR EACH ROW EXECUTE FUNCTION handle_geoevent();
