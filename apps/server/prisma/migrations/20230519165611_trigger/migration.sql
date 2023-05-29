-- Add trigger to Site to generate detection geometry
CREATE OR REPLACE FUNCTION app_site_detectionGeometry_update() 
RETURNS TRIGGER AS $$
BEGIN
    NEW."originalGeometry" = ST_Transform(ST_Transform(ST_GeomFromGeoJSON(NEW."geometry"::text), 3857), 4326);
    NEW."detectionGeometry" = ST_Transform(ST_Buffer(ST_Transform(ST_GeomFromGeoJSON(NEW."geometry"::text), 3857), NEW."radius"), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_update_trigger
BEFORE INSERT OR UPDATE OF "geometry", "radius" ON "Site"
FOR EACH ROW EXECUTE FUNCTION app_site_detectionGeometry_update();


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