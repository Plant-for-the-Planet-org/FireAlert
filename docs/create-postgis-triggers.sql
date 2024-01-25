-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add trigger to Site to generate detection geometry and determine slices
CREATE OR REPLACE FUNCTION app_site_detectionGeometry_update() 
RETURNS TRIGGER AS $$
DECLARE
    sliceKeys TEXT[];
    detectionGeometryHex TEXT[];
    polygon JSONB;
BEGIN
    IF NEW."type" = 'MultiPolygon' THEN
        detectionGeometryHex := ARRAY[]::TEXT[];

        FOR polygon IN SELECT jsonb_array_elements(NEW."geometry"->'coordinates')
        LOOP
            detectionGeometryHex := array_append(detectionGeometryHex, encode(
                ST_AsEWKB(
                    ST_Transform(
                        ST_Buffer(
                            ST_Transform(
                                ST_GeomFromGeoJSON(
                                    jsonb_build_object(
                                        'type', 'Polygon',
                                        'coordinates', polygon
                                    )::text
                                ),
                                3857
                            ),
                            NEW."radius"
                        ),
                        4326
                    )
                ),
                'hex'
            ));
        END LOOP;

        NEW."geometry" = jsonb_set(NEW."geometry", '{detection_geometry}', to_jsonb(detectionGeometryHex));

        -- Calculate detectionGeometry for MultiPolygon as a whole
        NEW."detectionGeometry" = ST_Collect(ARRAY(
        SELECT ST_GeomFromEWKB(decode(dg_elem, 'hex'))
        FROM jsonb_array_elements_text(NEW."geometry"->'detection_geometry') AS dg_elem
        ));
    ELSE
        -- Handle Point and Polygon as before
        NEW."originalGeometry" = ST_Transform(ST_Transform(ST_GeomFromGeoJSON(NEW."geometry"::text), 3857), 4326);
        NEW."detectionGeometry" = ST_Transform(ST_Buffer(ST_Transform(ST_GeomFromGeoJSON(NEW."geometry"::text), 3857), NEW."radius"), 4326);
    END IF;

    -- Calculate detection area
    NEW."detectionArea" := ST_Area(
                                ST_Transform(
                                    ST_Buffer(
                                        ST_Transform(
                                            ST_SetSRID(
                                                ST_GeomFromGeoJSON(NEW."geometry"::text),
                                                4326
                                            ),
                                            3857
                                        ),
                                        NEW."radius"
                                    ),
                                    3857
                                )
                            );

    -- Determine slices
    WITH slices AS (
        SELECT 
        slice_key,
        ST_GeomFromText('POLYGON((' || bbox || '))', 4326) AS slice_geometry
        FROM (
        VALUES
            ('1', '-180 -90, 180 -90, 180 -30, -180 -30, -180 -90'),
            ('2', '-180 -30, 180 -30, 180 -15, -180 -15, -180 -30'),
            ('3', '-180 -15, 180 -15, 180 0, -180 0, -180 -15'),
            ('4', '-180 0, 180 0, 180 15, -180 15, -180 0'),
            ('5', '-180 15, 180 15, 180 30, -180 30, -180 15'),
            ('6', '-180 30, 180 30, 180 45, -180 45, -180 30'),
            ('7', '-180 45, 180 45, 180 60, -180 60, -180 45'),
            ('8', '-180 60, 180 60, 180 90, -180 90, -180 60')
        ) AS slices(slice_key, bbox)
    )
    SELECT INTO sliceKeys ARRAY_AGG(slice_key) 
    FROM slices 
    WHERE ST_Intersects(NEW."detectionGeometry", slice_geometry);

    
    -- If sliceKeys is null (happens when site.geometry is a line or a point, and not a polygon ) then set it to ["0"], 
    -- "0" means it falls inside all slices
    
    IF sliceKeys IS NULL THEN
        sliceKeys := ARRAY['0'];
    END IF;

    -- Convert the array to a JSON array before assignment
    NEW."slices" = array_to_json(sliceKeys);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER site_update_trigger
BEFORE INSERT OR UPDATE OF "geometry", "radius", "slices" ON "Site"
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

CREATE OR REPLACE TRIGGER geoevent_insert_update_trigger
BEFORE INSERT OR UPDATE ON "GeoEvent"
FOR EACH ROW EXECUTE FUNCTION handle_geoevent();