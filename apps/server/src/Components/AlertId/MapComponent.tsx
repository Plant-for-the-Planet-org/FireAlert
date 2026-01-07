import React from 'react'
import { FC, useEffect, useMemo } from 'react';
import Map, { NavigationControl, ScaleControl, FullscreenControl, MapRef, Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapStyle from '../../data/mapStyleOutput.json'
import Image from 'next/image';
// import vector from '../../../public/alertPage/Vector.png'
import { highlightWave } from '../../../../nativeapp/app/assets/animation/lottie'
import Lottie from 'react-lottie';
import classes from './MapComponent.module.css'
import type { AlertIdProps, GeoJSONGeometry, AlertForSiteData } from '../../types/alert.types';
import { getAlertTheme, getDaysSince } from './alertTheme.utils';

interface Props {
    alertData: AlertIdProps;
    historicAlerts?: AlertForSiteData[];
    selectedAlertId?: string | null;
    isHistoricView?: boolean;
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
const calculateBbox = (coords: [number, number][]): [number, number, number, number] => {
    return coords.reduce<[number, number, number, number]>(
        ([minLon, minLat, maxLon, maxLat], [lon, lat]) =>
            [Math.min(minLon, lon), Math.min(minLat, lat), Math.max(maxLon, lon), Math.max(maxLat, lat)],
        [Infinity, Infinity, -Infinity, -Infinity]
    );
};

const MapComponent: FC<Props> = ({ alertData, historicAlerts, selectedAlertId, isHistoricView = false }) => {
    const mapRef = React.useRef<MapRef | null>(null);

    // Calculate bounds for all alerts when in historic view
    const allAlertsBounds = useMemo(() => {
        if (!isHistoricView || !historicAlerts || historicAlerts.length === 0) {
            return null;
        }

        let minLon = Infinity;
        let minLat = Infinity;
        let maxLon = -Infinity;
        let maxLat = -Infinity;

        historicAlerts.forEach(alert => {
            const lon = alert.longitude;
            const lat = alert.latitude;
            minLon = Math.min(minLon, lon);
            minLat = Math.min(minLat, lat);
            maxLon = Math.max(maxLon, lon);
            maxLat = Math.max(maxLat, lat);
        });

        return [minLon, minLat, maxLon, maxLat] as [number, number, number, number];
    }, [isHistoricView, historicAlerts]);

    // Get the primary alert data (either current alert or selected historic alert)
    const primaryAlert = useMemo(() => {
        if (isHistoricView && selectedAlertId && historicAlerts) {
            const selected = historicAlerts.find(a => a.id === selectedAlertId);
            if (selected) {
                return {
                    latitude: selected.latitude,
                    longitude: selected.longitude,
                    polygon: alertData.polygon, // Use site polygon for all alerts
                };
            }
        }
        return {
            latitude: parseFloat(alertData.latitude),
            longitude: parseFloat(alertData.longitude),
            polygon: alertData.polygon,
        };
    }, [isHistoricView, selectedAlertId, historicAlerts, alertData]);

    // Type guard to ensure polygon is a valid GeoJSON geometry
    const polygon: GeoJSONGeometry = (() => {
        if (typeof primaryAlert.polygon === 'object' && primaryAlert.polygon !== null) {
            const geom = primaryAlert.polygon as Record<string, unknown>;
            if (
                typeof geom.type === 'string' &&
                Array.isArray(geom.coordinates) &&
                (geom.type === 'Point' || geom.type === 'Polygon' || geom.type === 'MultiPolygon')
            ) {
                return primaryAlert.polygon as GeoJSONGeometry;
            }
        }
        // Fallback to Point if invalid
        return {
            type: 'Point',
            coordinates: [primaryAlert.longitude, primaryAlert.latitude],
        };
    })();

    // Convert polygon data to GeoJSON format
    const polygonGeoJSON = {
        type: "Feature" as const,
        geometry: polygon
    };

    // Calculate the bounding box and center point
    let bbox: [number, number, number, number] | undefined;
    if (isHistoricView && allAlertsBounds) {
        // Use bounds from all alerts
        bbox = allAlertsBounds;
    } else if (polygon.type === 'Polygon') {
        bbox = calculateBbox(polygon.coordinates[0]);
    } else if (polygon.type === 'MultiPolygon') {
        bbox = polygon.coordinates.reduce<[number, number, number, number]>(
            (bbox, polyCoords) => {
                const polyBbox = calculateBbox(polyCoords[0]);
                return [
                    Math.min(bbox[0], polyBbox[0]),
                    Math.min(bbox[1], polyBbox[1]),
                    Math.max(bbox[2], polyBbox[2]),
                    Math.max(bbox[3], polyBbox[3]),
                ];
            },
            [Infinity, Infinity, -Infinity, -Infinity]
        );
    }

    // Calculate center and zoom
    const center = bbox 
        ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2] 
        : [primaryAlert.longitude, primaryAlert.latitude];

    const zoom = bbox ? getZoomLevel(bbox) : 13;

    const [viewState, setViewState] = React.useState({
        latitude: center[1],
        longitude: center[0],
        zoom: zoom
    });

    // Update view state when selected alert changes or bounds change
    useEffect(() => {
        if (isHistoricView && selectedAlertId && historicAlerts) {
            // Focus on selected alert but keep zoom to show all alerts
            const selected = historicAlerts.find(a => a.id === selectedAlertId);
            if (selected && bbox) {
                // Use bounds for zoom but center on selected alert
                const boundsZoom = getZoomLevel(bbox);
                setViewState(prev => ({
                    latitude: selected.latitude,
                    longitude: selected.longitude,
                    zoom: Math.max(boundsZoom, 12) // Ensure minimum zoom to see context
                }));
            } else if (selected) {
                setViewState(prev => ({
                    ...prev,
                    latitude: selected.latitude,
                    longitude: selected.longitude,
                    zoom: 13
                }));
            }
        } else if (bbox) {
            // Show all alerts with proper bounds
            const newCenter = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
            const newZoom = getZoomLevel(bbox);
            setViewState({
                latitude: newCenter[1],
                longitude: newCenter[0],
                zoom: newZoom
            });
        }
    }, [selectedAlertId, bbox, isHistoricView, historicAlerts]);

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
            {/* Render markers for all alerts in historic view */}
            {isHistoricView && historicAlerts && historicAlerts.map(alert => {
                const isSelected = alert.id === selectedAlertId;
                // Get theme based on days since alert
                const daysSince = getDaysSince(alert.eventDate);
                const themeConfig = getAlertTheme(daysSince);
                
                return (
                    <Marker 
                        key={alert.id} 
                        longitude={alert.longitude} 
                        latitude={alert.latitude} 
                        anchor="bottom">
                        <div 
                            className={classes.vectorAnimationContainer}
                            style={{
                                transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                                transition: 'all 0.3s ease',
                                zIndex: isSelected ? 10 : 1,
                            }}>
                            <Image 
                                src={themeConfig.iconPath} 
                                alt="Fire Alert Marker" 
                                width={24}
                                height={24}
                                style={{
                                    filter: isSelected ? 'drop-shadow(0 0 8px rgba(232, 111, 86, 0.8))' : 'none',
                                }}
                            />
                            {isSelected && (
                                <div className={classes.lottieAnimation}>
                                    <Lottie
                                        options={defaultLottieOptions}
                                    />
                                </div>
                            )}
                        </div>
                    </Marker>
                );
            })}

            {/* Render single marker for default view */}
            {!isHistoricView && (
                <Marker longitude={center[0]} latitude={center[1]} anchor="bottom">
                    <div className={classes.vectorAnimationContainer}>
                        <Image width={24} height={24} src="/alertPage/orange-fire-icon.svg" alt="Map Focus" className={classes.vector} />
                        <div className={classes.lottieAnimation}>
                            <Lottie
                                options={defaultLottieOptions}
                            />
                        </div>
                    </div>
                </Marker>
            )}
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
