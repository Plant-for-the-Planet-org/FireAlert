import * as React from 'react';
import MapboxGL from '@rnmapbox/maps';
import Config from 'react-native-config';
import {useEffect, useRef, useState} from 'react';

import MarkerSVG from '../markerSVG';
import {Colors} from '../../../styles';
import {toLetters} from '../../../utils/mapMarkingCoordinate';

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

interface MarkersProps {
  geoJSON: geoJSONType;
  onPressMarker?: () => void;
  draggable?: boolean;
  onDeselected?: (e: any, index: number) => void;
  onDragStart?: (e: any, index: number) => void;
  onDrag?: (e: any, index: number) => void;
  onDragEnd?: (e: any, index: number) => void;
  ignoreLastMarker?: boolean;
  type?: 'LineString' | 'Polygon';
  nonDragablePoint?: boolean;
}
const Markers = ({
  geoJSON,
  onPressMarker = () => {},
  draggable,
  onDeselected,
  onDragStart,
  onDrag,
  onDragEnd,
  ignoreLastMarker = false,
  type = 'Polygon',
  nonDragablePoint = false,
}: MarkersProps) => {
  const [alphabets, setAlphabets] = useState<string[]>([]);
  const markers: JSX.Element[] = [];

  useEffect(() => {
    let alphabetsArray = [];
    for (var x = 1, y; x <= 130; x++) {
      y = toLetters(x);
      alphabetsArray.push(y);
    }
    setAlphabets(alphabetsArray);
  }, []);
  for (let i = 0; i < geoJSON.features.length; i++) {
    return (
      <PointAnnotationMarker
        markers={markers}
        geoJSON={geoJSON}
        i={i}
        alphabets={alphabets}
        onPressMarker={onPressMarker}
        draggable={draggable}
        onDeselected={onDeselected}
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        ignoreLastMarker={ignoreLastMarker}
        type={type}
        nonDragablePoint={nonDragablePoint}
      />
    );
  }
  return <>{markers}</>;
};

interface PointAnnotationMarkerProps {
  markers: JSX.Element[];
  geoJSON: geoJSONType;
  i: number;
  alphabets: string[];
  onPressMarker: any;
  draggable?: boolean;
  onDeselected?: (e: any, index: number) => void;
  onDragStart?: (e: any, index: number) => void;
  onDrag?: (e: any, index: number) => void;
  onDragEnd?: (e: any, index: number) => void;
  ignoreLastMarker?: boolean;
  type?: 'LineString' | 'Polygon';
  nonDragablePoint?: boolean;
}

const PointAnnotationMarker = ({
  markers,
  geoJSON,
  i,
  alphabets,
  onPressMarker,
  draggable = false,
  onDeselected = () => {},
  onDragStart = () => {},
  onDrag = () => {},
  onDragEnd = () => {},
  ignoreLastMarker = false,
  type = 'Polygon',
  nonDragablePoint = false,
}: PointAnnotationMarkerProps): JSX.Element => {
  const annotationRefList = useRef<MapboxGL.PointAnnotation[] | null>([]);
  const calloutRefList = useRef<MapboxGL.Callout[] | null>([]);

  let onePolygon = geoJSON.features[i];

  let coordinates =
    type === 'Polygon'
      ? onePolygon?.geometry?.coordinates[0]
      : onePolygon.geometry.coordinates;

  useEffect(() => {
    annotationRefList.current = annotationRefList.current.slice(
      0,
      coordinates.length,
    );
    calloutRefList.current = calloutRefList.current.slice(
      0,
      coordinates.length,
    );
  }, [onePolygon.geometry.coordinates]);

  const iterationCount = ignoreLastMarker
    ? coordinates?.length - 1
    : coordinates?.length;
  for (let j = 0; j < iterationCount; j++) {
    let oneMarker = coordinates[j];

    markers.push(
      <MapboxGL.PointAnnotation
        key={`${i}${j}`}
        id={`${i}${j}`}
        coordinate={oneMarker}
        ref={el => {
          annotationRefList.current[j] = el;
        }}
        onSelected={feature => {
          onPressMarker({
            coordinate: feature.geometry.coordinates,
            coordinateIndex: j,
          });
        }}
        draggable={draggable}
        onDeselected={e => onDeselected(e, j)}
        onDragStart={e => onDragStart(e, j)}
        onDrag={e => onDrag(e, j)}
        onDragEnd={e => onDragEnd(e, j)}>
        <MarkerSVG point={alphabets[j]} color={Colors.PRIMARY} />
      </MapboxGL.PointAnnotation>,
    );
  }

  return <>{markers}</>;
};

export default Markers;
