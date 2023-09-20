import React from 'react'
import { FC } from 'react';
import Map, { NavigationControl, ScaleControl, FullscreenControl, MapRef, Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapStyle from '../../data/mapStyleOutput.json'
import Image from 'next/image';
import vector from '../../../public/alertPage/Vector.png'
import { highlightWave } from '../../../../nativeapp/app/assets/animation/lottie'
import Lottie from 'react-lottie';
import classes from './MapComponent.module.css'
import { type AlertData } from './AlertId';

interface Props {
    alertData: AlertData;
}

const getZoomLevel = (bbox: [number, number, number, number]) => {
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 21;

    function latRad(lat: number) {
        const sin = Math.sin((lat * Math.PI) / 180);
        const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
        return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    }

    function zoom(mapPx: number, worldPx: number, fraction: number) {
        return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    }

    const ne = { lat: bbox[3], lon: bbox[2] };
    const sw = { lat: bbox[1], lon: bbox[0] };

    const latFraction = (latRad(ne.lat) - latRad(sw.lat)) / Math.PI;

    const lonDiff = ne.lon - sw.lon;
    const lonFraction = (lonDiff < 0 ? lonDiff + 360 : lonDiff) / 360;

    const latZoom = zoom(window.innerHeight, WORLD_DIM.height, latFraction);
    const lonZoom = zoom(window.innerWidth, WORLD_DIM.width, lonFraction);

    let calculatedZoom = Math.min(latZoom, lonZoom, ZOOM_MAX);

    // Subtract a small constant to slightly decrease zoom level
    calculatedZoom -= 1.5;

    return calculatedZoom;
};

// Function to calculate the bounding box of a polygon
const calculateBbox = (coords) => {
    return coords.reduce(([minLon, minLat, maxLon, maxLat], [lon, lat]) =>
        [Math.min(minLon, lon), Math.min(minLat, lat), Math.max(maxLon, lon), Math.max(maxLat, lat)],
        [Infinity, Infinity, -Infinity, -Infinity]
    );
};

const MapComponent: FC<Props> = ({ alertData }) => {
    let polygon = alertData.polygon;

    // Convert polygon data to GeoJSON format
    const polygonGeoJSON = {
        type: "Feature",
        geometry: polygon
    };

    // Calculate the bounding box and center point of the polygon
    let bbox;
    if (polygon.type === 'Polygon') {
        bbox = calculateBbox(polygon.coordinates[0]);
    } else if (polygon.type === 'MultiPolygon') {
        bbox = polygon.coordinates.reduce((bbox, polyCoords) => {
            const polyBbox = calculateBbox(polyCoords[0]);
            return [
                Math.min(bbox[0], polyBbox[0]),
                Math.min(bbox[1], polyBbox[1]),
                Math.max(bbox[2], polyBbox[2]),
                Math.max(bbox[3], polyBbox[3]),
            ];
        }, [Infinity, Infinity, -Infinity, -Infinity]);
    }
    // When the site is a point, then polygon.type is a "Point".
    // For site which is a point, we do not need to find the bbox. Thus, bbox is undefined.

    // So, if bbox is defined, then we calculate the center and zoom, 
    // Else we calculate center as (longitude, latitude) and make zoom as the be a default value of 13
    const center = bbox ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2] : [parseFloat(alertData.longitude), parseFloat(alertData.latitude)];

    // Calculate the zoom level based on the size of the bounding box
    const zoom = bbox? getZoomLevel(bbox) : 13

    const mapRef = React.useRef<MapRef | null>(null);
    const [viewState, setViewState] = React.useState({
        latitude: center[1],
        longitude: center[0],
        zoom: zoom
    });

    const onMapLoad = React.useCallback(async () => {
        const map = mapRef?.current?.getMap();
        map?.setStyle(mapStyle);
    }, [mapStyle]);

    const defaultLottieOptions = {
        loop: true,
        autoplay: true,
        animationData: highlightWave,
    };

    return (
        <Map
            initialViewState={viewState}
            onLoad={onMapLoad}
            onMove={evt => setViewState(evt.viewState)}
            ref={mapRef}
            style={{ width: '100%', height: '100%' }}
            mapStyle={mapStyle}
            scrollZoom={false}
        >
            <Marker longitude={center[0]} latitude={center[1]} anchor="bottom">
                <div className={classes.vectorAnimationContainer}>
                    <Image src={vector} alt="Map Focus" className={classes.vector} />
                    <div className={classes.lottieAnimation}>
                        <Lottie
                            options={defaultLottieOptions}
                        />
                    </div>
                </div>
            </Marker>
            {polygon.type !== 'Point' && (
                <Source id="polygon" type="geojson" data={polygonGeoJSON}>
                    <Layer
                        id={`${polygon.type}-fill`}
                        type="fill"
                        paint={{
                            'fill-color': '#e86f56',  // White color
                            'fill-opacity': 0.1,
                        }}
                    />
                    <Layer
                        id={`${polygon.type}-line`}
                        type="line"
                        paint={{
                            'line-width': 2,
                            'line-color': '#e86f56',  // White color
                            'line-opacity': 1,
                        }}
                    />
                </Source>
            )}
            <NavigationControl />
            <ScaleControl />
            <FullscreenControl />
        </Map>
    );
};

export default MapComponent;
