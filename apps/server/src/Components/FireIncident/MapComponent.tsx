import React, {useEffect, useMemo} from 'react';
import type {FC} from 'react';
import Map, {
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  Marker,
  Source,
  Layer,
} from 'react-map-gl/maplibre';
import type {MapRef} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapStyle from '../../data/mapStyleOutput.json';
import Image from 'next/image';
import {highlightWave} from '../../../../nativeapp/app/assets/animation/lottie';
import Lottie from 'react-lottie';
import {generateIncidentPolygon} from './incidentBoundaryUtils';

export type AlertTheme = 'orange' | 'brown' | 'gray';

export interface MapMarker {
  latitude: number;
  longitude: number;
  id: string;
  theme: AlertTheme;
}

export interface IncidentFirePoint {
  latitude: number;
  longitude: number;
}

export interface RelatedIncidentBoundary {
  incidentId: string;
  isActive: boolean;
  fires: IncidentFirePoint[];
}

// GeoJSON type definitions
type Position = [number, number];

interface PointGeometry {
  type: 'Point';
  coordinates: Position;
}

interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

type Geometry = PointGeometry | PolygonGeometry | MultiPolygonGeometry;

interface Props {
  polygon: Geometry | null;
  markers: MapMarker[];
  selectedMarkerId?: string;
  onMarkerClick?: (id: string) => void;
  /** Color for the incident circle - 'orange' for active, 'gray' for inactive */
  incidentCircleColor?: 'orange' | 'gray';
  /** Buffer distance in kilometers for smoothing incident polygon vertices (default: 0.5km) */
  bufferKm?: number;
  /** Related incident boundaries rendered with lower opacity */
  relatedIncidentBoundaries?: RelatedIncidentBoundary[];
  /** Toggle to render related incident boundaries */
  showRelatedIncidentBoundaries?: boolean;
  /** Combined boundary points from current + related incidents */
  combinedIncidentFires?: IncidentFirePoint[];
  /** Toggle to render combined boundary */
  showCombinedIncidentBoundary?: boolean;
  /** Active related incident ID for highlighting */
  activeRelatedIncidentId?: string | null;
}

type BBox = [number, number, number, number];

const getZoomLevel = (bbox: BBox): number => {
  const WORLD_DIM = {height: 256, width: 256};
  const ZOOM_MAX = 21;

  function latRad(lat: number): number {
    const sin = Math.sin((lat * Math.PI) / 180);
    const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
    return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
  }

  function zoom(mapPx: number, worldPx: number, fraction: number): number {
    return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
  }

  const ne = {lat: bbox[3], lon: bbox[2]};
  const sw = {lat: bbox[1], lon: bbox[0]};

  const latFraction = (latRad(ne.lat) - latRad(sw.lat)) / Math.PI;

  const lonDiff = ne.lon - sw.lon;
  const lonFraction = (lonDiff < 0 ? lonDiff + 360 : lonDiff) / 360;

  const latZoom = zoom(window.innerHeight, WORLD_DIM.height, latFraction);
  const lonZoom = zoom(window.innerWidth, WORLD_DIM.width, lonFraction);

  let calculatedZoom = Math.min(latZoom, lonZoom, ZOOM_MAX);

  // Subtract a small constant to slightly decrease zoom level
  calculatedZoom -= 4;

  return calculatedZoom;
};

// Function to calculate the bounding box of a polygon ring
const calculateBbox = (coords: Position[]): BBox => {
  return coords.reduce<BBox>(
    (acc, [lon, lat]) => [
      Math.min(acc[0], lon),
      Math.min(acc[1], lat),
      Math.max(acc[2], lon),
      Math.max(acc[3], lat),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
};

const MapComponent: FC<Props> = ({
  polygon,
  markers,
  selectedMarkerId,
  onMarkerClick,
  incidentCircleColor,
  bufferKm = 0.5,
  relatedIncidentBoundaries = [],
  showRelatedIncidentBoundaries = false,
  combinedIncidentFires = [],
  showCombinedIncidentBoundary = false,
  activeRelatedIncidentId = null,
}) => {
  // Convert polygon data to GeoJSON format
  const polygonGeoJSON = polygon
    ? {
        type: 'Feature' as const,
        properties: {},
        geometry: polygon,
      }
    : null;

  // Calculate the bounding box and center point
  let bbox: BBox | null = null;

  const relatedBoundaryPoints = relatedIncidentBoundaries.flatMap(
    incident => incident.fires,
  );
  const allVisiblePoints = [
    ...markers.map(marker => ({
      latitude: marker.latitude,
      longitude: marker.longitude,
    })),
    ...(showRelatedIncidentBoundaries ? relatedBoundaryPoints : []),
    ...(showCombinedIncidentBoundary ? combinedIncidentFires : []),
  ];

  // Calculate bbox from all currently visible incident points
  if (allVisiblePoints.length > 0) {
    bbox = allVisiblePoints.reduce<BBox>(
      (acc, marker) => [
        Math.min(acc[0], marker.longitude),
        Math.min(acc[1], marker.latitude),
        Math.max(acc[2], marker.longitude),
        Math.max(acc[3], marker.latitude),
      ],
      [Infinity, Infinity, -Infinity, -Infinity],
    );
  }

  // If no markers (unlikely given requirement), fallback to polygon logic.
  if ((!bbox || bbox[0] === Infinity) && polygon) {
    if (polygon.type === 'Polygon') {
      bbox = calculateBbox(polygon.coordinates[0]);
    } else if (polygon.type === 'MultiPolygon') {
      bbox = polygon.coordinates.reduce<BBox>(
        (currentBbox, polyCoords) => {
          const polyBbox = calculateBbox(polyCoords[0]);
          return [
            Math.min(currentBbox[0], polyBbox[0]),
            Math.min(currentBbox[1], polyBbox[1]),
            Math.max(currentBbox[2], polyBbox[2]),
            Math.max(currentBbox[3], polyBbox[3]),
          ];
        },
        [Infinity, Infinity, -Infinity, -Infinity],
      );
    }
  }

  // Default center from first marker if available, else 0,0
  const defaultCenter: [number, number] =
    markers.length > 0 ? [markers[0].longitude, markers[0].latitude] : [0, 0];

  const center: [number, number] =
    bbox && bbox[0] !== Infinity
      ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
      : defaultCenter;
  const centerLongitude = center[0];
  const centerLatitude = center[1];

  // Calculate the zoom level based on the size of the bounding box
  const zoomLevel = bbox && bbox[0] !== Infinity ? getZoomLevel(bbox) : 13;

  const mapRef = React.useRef<MapRef | null>(null);

  const syncViewportToDerivedBounds = React.useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    map.jumpTo({
      center: [centerLongitude, centerLatitude],
      zoom: zoomLevel,
    });
  }, [centerLongitude, centerLatitude, zoomLevel]);

  useEffect(() => {
    syncViewportToDerivedBounds();
  }, [syncViewportToDerivedBounds]);

  const onMapLoad = React.useCallback(() => {
    const map = mapRef?.current?.getMap();
    map?.setStyle(mapStyle);
    syncViewportToDerivedBounds();
  }, [syncViewportToDerivedBounds]);

  const defaultLottieOptions = {
    loop: true,
    autoplay: true,
    animationData: highlightWave,
  };

  // Helper to get icon path based on theme
  const getIconPath = (theme: AlertTheme): string => {
    switch (theme) {
      case 'orange':
        return '/alertPage/orange-fire-icon.svg';
      case 'brown':
        return '/alertPage/brown-fire-icon.svg';
      case 'gray':
        return '/alertPage/gray-fire-icon.svg';
      default:
        return '/alertPage/orange-fire-icon.svg';
    }
  };

  // Sort markers so selected one is last (on top)
  const sortedMarkers = React.useMemo(() => {
    return [...markers].sort((a, b) => {
      if (a.id === selectedMarkerId) return 1;
      if (b.id === selectedMarkerId) return -1;
      return 0;
    });
  }, [markers, selectedMarkerId]);

  const showPolygon = polygon && polygon.type !== 'Point';

  // Generate the incident polygon from fire markers
  const incidentPolygon = useMemo(() => {
    if (!incidentCircleColor || markers.length === 0) return null;
    const fires = markers.map(m => ({
      latitude: m.latitude,
      longitude: m.longitude,
    }));
    return generateIncidentPolygon(fires, bufferKm);
  }, [markers, incidentCircleColor, bufferKm]);

  const relatedIncidentPolygons = useMemo(() => {
    if (!showRelatedIncidentBoundaries) {
      return [];
    }

    return relatedIncidentBoundaries
      .map(boundary => ({
        incidentId: boundary.incidentId,
        isActive: boundary.isActive,
        polygon:
          boundary.fires.length > 0
            ? generateIncidentPolygon(boundary.fires, bufferKm)
            : null,
      }))
      .filter(
        (
          boundary,
        ): boundary is {
          incidentId: string;
          isActive: boolean;
          polygon: NonNullable<ReturnType<typeof generateIncidentPolygon>>;
        } => Boolean(boundary.polygon),
      );
  }, [relatedIncidentBoundaries, showRelatedIncidentBoundaries, bufferKm]);

  const combinedIncidentPolygon = useMemo(() => {
    if (!showCombinedIncidentBoundary || combinedIncidentFires.length === 0) {
      return null;
    }

    return generateIncidentPolygon(combinedIncidentFires, bufferKm);
  }, [combinedIncidentFires, showCombinedIncidentBoundary, bufferKm]);

  // Circle color based on incident status
  const circleColor = incidentCircleColor === 'orange' ? '#e86f56' : '#6b7280';

  return (
    <Map
      initialViewState={{
        latitude: centerLatitude,
        longitude: centerLongitude,
        zoom: zoomLevel,
      }}
      onLoad={onMapLoad}
      ref={mapRef}
      style={{width: '100%', height: '100%'}}
      mapStyle={mapStyle}
      scrollZoom={false}>
      {sortedMarkers.map(marker => (
        <Marker
          key={marker.id}
          longitude={marker.longitude}
          latitude={marker.latitude}
          anchor="bottom"
          onClick={e => {
            e.originalEvent.stopPropagation();
            if (onMarkerClick) onMarkerClick(marker.id);
          }}>
          <div className="relative w-[30px] h-[30px] flex justify-center items-center cursor-pointer">
            <Image
              src={getIconPath(marker.theme)}
              alt="Map Focus"
              width={30}
              height={30}
              className="absolute w-6 h-6 top-0"
            />
            {selectedMarkerId === marker.id && (
              <div className="absolute top-[42%] left-[10%] scale-[5] pointer-events-none">
                <Lottie
                  options={defaultLottieOptions}
                  isClickToPauseDisabled={true}
                />
              </div>
            )}
          </div>
        </Marker>
      ))}

      {showPolygon && polygonGeoJSON && (
        <Source id="polygon" type="geojson" data={polygonGeoJSON}>
          <Layer
            id={`${polygon.type}-fill`}
            type="fill"
            paint={{
              'fill-color': '#e86f56',
              'fill-opacity': 0.1,
            }}
          />
          <Layer
            id={`${polygon.type}-line`}
            type="line"
            paint={{
              'line-width': 2,
              'line-color': '#e86f56',
              'line-opacity': 1,
            }}
          />
        </Source>
      )}

      {combinedIncidentPolygon && (
        <Source
          id="combined-incident-polygon"
          type="geojson"
          data={combinedIncidentPolygon}>
          <Layer
            id="combined-incident-polygon-fill"
            type="fill"
            paint={{
              'fill-color': '#1f2937',
              'fill-opacity': 0.04,
            }}
          />
          <Layer
            id="combined-incident-polygon-line"
            type="line"
            paint={{
              'line-width': 2,
              'line-color': '#1f2937',
              'line-opacity': 0.6,
              'line-dasharray': [2, 2],
            }}
          />
        </Source>
      )}

      {relatedIncidentPolygons.map(incident => {
        const relatedColor = incident.isActive ? '#e86f56' : '#6b7280';
        const isActive = incident.incidentId === activeRelatedIncidentId;
        return (
          <Source
            key={incident.incidentId}
            id={`related-incident-polygon-${incident.incidentId}`}
            type="geojson"
            data={incident.polygon}>
            <Layer
              id={`related-incident-polygon-fill-${incident.incidentId}`}
              type="fill"
              paint={{
                'fill-color': relatedColor,
                'fill-opacity': isActive ? 0.15 : 0.06,
              }}
            />
            <Layer
              id={`related-incident-polygon-line-${incident.incidentId}`}
              type="line"
              paint={{
                'line-width': isActive ? 3 : 2,
                'line-color': relatedColor,
                'line-opacity': isActive ? 0.8 : 0.45,
              }}
            />
          </Source>
        );
      })}

      {activeRelatedIncidentId &&
        (() => {
          const activeBoundary = relatedIncidentBoundaries.find(
            b => b.incidentId === activeRelatedIncidentId,
          );
          if (!activeBoundary) return null;

          const fireTheme: AlertTheme = activeBoundary.isActive
            ? 'orange'
            : 'gray';

          return activeBoundary.fires.map((fire, index) => (
            <Marker
              key={`related-fire-${activeRelatedIncidentId}-${index}`}
              longitude={fire.longitude}
              latitude={fire.latitude}
              anchor="bottom">
              <div className="relative w-[20px] h-[20px] flex justify-center items-center pointer-events-none">
                <Image
                  src={getIconPath(fireTheme)}
                  alt="Related fire"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
              </div>
            </Marker>
          ));
        })()}

      {incidentPolygon && (
        <Source id="incident-polygon" type="geojson" data={incidentPolygon}>
          <Layer
            id="incident-polygon-fill"
            type="fill"
            paint={{
              'fill-color': circleColor,
              'fill-opacity': 0.15,
            }}
          />
          <Layer
            id="incident-polygon-line"
            type="line"
            paint={{
              'line-width': 2,
              'line-color': circleColor,
              'line-opacity': 0.8,
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
