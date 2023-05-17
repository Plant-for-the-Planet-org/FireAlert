-- Add trigger to Site to generate detection geometry
CREATE OR REPLACE FUNCTION handle_sitedetection() 
RETURNS TRIGGER AS $$
BEGIN
    NEW."detectionGeometry" = ST_Transform(ST_Buffer(ST_Transform(ST_GeomFromGeoJSON(NEW."geometry"::text), 3857), NEW."radius"), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_update_trigger
BEFORE UPDATE OF "geometry", "radius" ON "Site"
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
