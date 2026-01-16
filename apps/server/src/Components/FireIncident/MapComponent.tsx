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
import vector from '../../../public/alertPage/Vector.png';
// @ts-ignore
import {highlightWave} from '../../../../nativeapp/app/assets/animation/lottie';
import Lottie from 'react-lottie';
import {Prisma} from '@prisma/client';

export interface MapMarker {
  latitude: number;
  longitude: number;
  id: string;
}

interface Props {
  polygon: Prisma.JsonValue;
  markers: MapMarker[];
  selectedMarkerId?: string;
  onMarkerClick?: (id: string) => void;
}

const getZoomLevel = (bbox: [number, number, number, number]) => {
  const WORLD_DIM = {height: 256, width: 256};
  const ZOOM_MAX = 21;

  function latRad(lat: number) {
    const sin = Math.sin((lat * Math.PI) / 180);
    const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
    return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
  }

  function zoom(mapPx: number, worldPx: number, fraction: number) {
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
  calculatedZoom -= 1.5;

  return calculatedZoom;
};

// Function to calculate the bounding box of a polygon
const calculateBbox = (coords: any) => {
  return coords.reduce(
    ([minLon, minLat, maxLon, maxLat]: number[], [lon, lat]: number[]) => [
      Math.min(minLon, lon),
      Math.min(minLat, lat),
      Math.max(maxLon, lon),
      Math.max(maxLat, lat),
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
  const polygonGeoJSON = {
    type: 'Feature',
    geometry: polygon,
  };

  // Calculate the bounding box and center point of the polygon
  let bbox: any;
  // @ts-ignore
  if (polygon?.type === 'Polygon') {
    // @ts-ignore
    bbox = calculateBbox(polygon.coordinates[0]);
    // @ts-ignore
  } else if (polygon?.type === 'MultiPolygon') {
    // @ts-ignore
    bbox = polygon.coordinates.reduce(
      (bbox, polyCoords) => {
        const polyBbox = calculateBbox(polyCoords[0]);
        return [
          Math.min(bbox[0], polyBbox[0]),
          Math.min(bbox[1], polyBbox[1]),
          Math.max(bbox[2], polyBbox[2]),
          Math.max(bbox[3], polyBbox[3]),
        ];
      },
      [Infinity, Infinity, -Infinity, -Infinity],
    );
  }
  // When the site is a point, then polygon.type is a "Point".
  // For site which is a point, we do not need to find the bbox. Thus, bbox is undefined.

  // So, if bbox is defined, then we calculate the center and zoom,
  // Else we calculate center as (longitude, latitude) and make zoom as the be a default value of 13

  // Default center from first marker if available, else 0,0
  const defaultCenter =
    markers.length > 0 ? [markers[0].longitude, markers[0].latitude] : [0, 0];

  const center = bbox
    ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
    : defaultCenter;

  // Calculate the zoom level based on the size of the bounding box
  const zoom = bbox ? getZoomLevel(bbox) : 13;

  const mapRef = React.useRef<MapRef | null>(null);
  const [viewState, setViewState] = React.useState({
    latitude: center[1],
    longitude: center[0],
    zoom: zoom,
  });

  const onMapLoad = React.useCallback(async () => {
    const map = mapRef?.current?.getMap();
    map?.setStyle(mapStyle);
  }, []);

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
      style={{width: '100%', height: '100%'}}
      mapStyle={mapStyle}
      scrollZoom={false}>
      {markers.map(marker => (
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
              width={24}
              height={24}
              src="/alertPage/orange-fire-icon.svg"
              alt="Map Focus"
              className="absolute top-0 w-full h-auto"
            />
            {selectedMarkerId === marker.id && (
              <div className="absolute top-[42%] left-[10%] scale-[5]">
                <Lottie options={defaultLottieOptions} />
              </div>
            )}
          </div>
        </Marker>
      ))}

      {/* @ts-ignore */}
      {polygon?.type !== 'Point' && (
        // @ts-ignore
        <Source id="polygon" type="geojson" data={polygonGeoJSON}>
          <Layer
            // @ts-ignore
            id={`${polygon?.type}-fill`}
            type="fill"
            paint={{
              'fill-color': '#e86f56',
              'fill-opacity': 0.1,
            }}
          />
          <Layer
            // @ts-ignore
            id={`${polygon?.type}-line`}
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
