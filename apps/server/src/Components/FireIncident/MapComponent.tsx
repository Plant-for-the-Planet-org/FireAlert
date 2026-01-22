import React from 'react';
import {FC} from 'react';
import Map, {
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  MapRef,
  Marker,
  Source,
  Layer,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapStyle from '../../data/mapStyleOutput.json';
import Image from 'next/image';
import {highlightWave} from '../../../../nativeapp/app/assets/animation/lottie';
import Lottie from 'react-lottie';

export type AlertTheme = 'orange' | 'brown' | 'gray';

export interface MapMarker {
  latitude: number;
  longitude: number;
  id: string;
  theme: AlertTheme;
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

  // Calculate bbox from markers if available
  if (markers.length > 0) {
    bbox = markers.reduce<BBox>(
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

  // Calculate the zoom level based on the size of the bounding box
  const zoomLevel = bbox && bbox[0] !== Infinity ? getZoomLevel(bbox) : 13;

  const mapRef = React.useRef<MapRef | null>(null);
  const [viewState, setViewState] = React.useState({
    latitude: center[1],
    longitude: center[0],
    zoom: zoomLevel,
  });

  const onMapLoad = React.useCallback(() => {
    const map = mapRef?.current?.getMap();
    map?.setStyle(mapStyle);
  }, []);

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

  return (
    <Map
      initialViewState={viewState}
      onLoad={onMapLoad}
      onMove={evt => setViewState(evt.viewState)}
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
                <Lottie options={defaultLottieOptions} isClickToPauseDisabled={true}  />
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
      <NavigationControl />
      <ScaleControl />
      <FullscreenControl />
    </Map>
  );
};

export default MapComponent;
