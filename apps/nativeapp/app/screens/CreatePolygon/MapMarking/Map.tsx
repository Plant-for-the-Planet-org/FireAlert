import React from 'react';
import {SvgXml} from 'react-native-svg';
import Config from 'react-native-config';
import MapboxGL, {Logger} from '@rnmapbox/maps';
import {View, Platform, StyleSheet, ImageSourcePropType} from 'react-native';

import Markers from '../markers';
import {
  useMapLayers,
  MapLayerContext,
} from '../../../global/reducers/mapLayers';
import {active_marker} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';

const IS_ANDROID = Platform.OS === 'android';
let attributionPosition: any = {
  bottom: IS_ANDROID ? 72 : 76,
  left: 18,
};

let compassViewMargins = {
  x: IS_ANDROID ? 16 : 17,
  y: IS_ANDROID ? 160 : 135,
};

const compassViewPosition = 3;

type CompassImage = 'compass1';
const images: Record<CompassImage, ImageSourcePropType> = {
  compass1: require('../../../assets/images/compassImage.png'),
};

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

Logger.setLogCallback(log => {
  const {message} = log;
  // expected warnings - see https://github.com/mapbox/mapbox-gl-native/issues/15341#issuecomment-522889062
  if (
    message.match('Request failed due to a permanent error: Canceled') ||
    message.match('Request failed due to a permanent error: Socket Closed')
  ) {
    return true;
  }
  return false;
});

interface IMapProps {
  geoJSON?: any;
  setLoader?: any;
  map?: any;
  camera?: any;
  setIsCameraRefVisible?: any;
  location?: any;
  loader?: any;
  markerText?: any;
  activePolygonIndex?: any;
  setLocation?: any;
}

export default function Map({
  geoJSON,
  map,
  camera,
  setIsCameraRefVisible,
  location,
  activePolygonIndex,
  setLocation,
  onPressMap,
}: IMapProps) {
  let shouldRenderShape =
    geoJSON.features[activePolygonIndex].geometry.coordinates.length > 1;
  const {state} = useMapLayers(MapLayerContext);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={map}
        compassEnabled
        logoEnabled={false}
        onPress={onPressMap}
        showUserLocation={true}
        scaleBarEnabled={false}
        style={styles.container}
        compassImage={'compass1'}
        styleURL={MapboxGL.StyleURL[state]}
        compassViewMargins={compassViewMargins}
        compassViewPosition={compassViewPosition}
        attributionPosition={attributionPosition}>
        <MapboxGL.Camera
          ref={el => {
            camera.current = el;
            setIsCameraRefVisible(!!el);
          }}
        />
        <MapboxGL.Images images={images} />
        <Markers geoJSON={geoJSON} type={'LineString'} />
        {shouldRenderShape && (
          <MapboxGL.ShapeSource id={'polygon'} shape={geoJSON}>
            <MapboxGL.LineLayer id={'polyline'} style={polyline} />
          </MapboxGL.ShapeSource>
        )}
        {location && (
          <MapboxGL.UserLocation
            showsUserHeadingIndicator
            onUpdate={data => setLocation(data)}
          />
        )}
      </MapboxGL.MapView>
      <View style={styles.fakeMarkerCont}>
        <SvgXml xml={active_marker} style={styles.markerImage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  fakeMarkerCont: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerImage: {
    position: 'absolute',
    resizeMode: 'contain',
    bottom: 0,
  },
  markerContainer: {
    width: 30,
    height: 43,
  },
  markerText: {
    width: 30,
    height: 43,
    color: Colors.BLACK,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontSize: Typography.FONT_SIZE_16,
    textAlign: 'center',
    paddingTop: 4,
  },
  loader: {
    position: 'absolute',
    bottom: 17,
  },
  activeMarkerLocation: {
    position: 'absolute',
    bottom: 19,
    color: Colors.BLACK,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontSize: Typography.FONT_SIZE_12,
  },
});

const polyline = {lineWidth: 5, lineColor: Colors.WHITE};
