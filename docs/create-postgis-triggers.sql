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

        NEW."geometry" = jsonb_set(NEW."geometry", '{properties}', jsonb_build_object('detection_geometry', to_jsonb(detectionGeometryHex)));
    END IF;

    NEW."originalGeometry" = ST_Transform(ST_Transform(ST_GeomFromGeoJSON(NEW."geometry"::text), 3857), 4326);
    NEW."detectionGeometry" = ST_Transform(ST_Buffer(ST_Transform(ST_GeomFromGeoJSON(NEW."geometry"::text), 3857), NEW."radius"), 4326);

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
            ('10', '-180 -90, 180 -90, 180 -30, -180 -30, -180 -90'),
            ('21', '-180 -30, -30 -30, -30 -15, -180 -15, -180 -30'),
            ('22', '-30 -30, 60 -30, 60 -15, -30 -15, -30 -30'),
            ('23', '60 -30, 180 -30, 180 -15, 60 -15, 60 -30'),
            ('31', '-180 -15, -30 -15, -30 0, -180 0, -180 -15'),  
            ('32', '-30 -15, 60 -15, 60 0, -30 0, -30 -15'),       
            ('33', '60 -15, 180 -15, 180 0, 60 0, 60 -15'),       
            ('41', '-180 0, -30 0, -30 15, -180 15, -180 0'),     
            ('42', '-30 0, 60 0, 60 15, -30 15, -30 0'),          
            ('43', '60 0, 180 0, 180 15, 60 15, 60 0'),           
            ('51', '-180 15, -30 15, -30 30, -180 30, -180 15'),  
            ('52', '-30 15, 60 15, 60 30, -30 30, -30 15'),       
            ('53', '60 15, 180 15, 180 30, 60 30, 60 15'),        
            ('61', '-180 30, -30 30, -30 45, -180 45, -180 30'),  
            ('62', '-30 30, 60 30, 60 45, -30 45, -30 30'),       
            ('63', '60 30, 180 30, 180 45, 60 45, 60 30'),        
            ('70', '-180 45, 180 45, 180 60, -180 60, -180 45'),
            ('80', '-180 60, 180 60, 180 90, -180 90, -180 60')
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