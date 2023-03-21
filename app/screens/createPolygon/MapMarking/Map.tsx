import {
  Text,
  View,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import React from 'react';
import {SvgXml} from 'react-native-svg';
import Config from 'react-native-config';
import MapboxGL, {Logger} from '@rnmapbox/maps';

import Markers from '../Markers';
import {Colors, Typography} from '../../../styles';
import {active_marker} from '../../../assets/svgs';
import {
  MapLayerContext,
  useMapLayers,
} from '../../../global/reducers/mapLayers';

const IS_ANDROID = Platform.OS === 'android';
let attributionPosition: any = {
  bottom: IS_ANDROID ? 72 : 76,
  left: 18,
};
let compassViewMargins: {
  x: 30;
  y: 230;
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
  setLoader,
  map,
  camera,
  setIsCameraRefVisible,
  location,
  loader,
  markerText,
  activePolygonIndex,
  setLocation,
  onPressMap,
}: IMapProps) {
  let shouldRenderShape =
    geoJSON.features[activePolygonIndex].geometry.coordinates.length > 1;
  const {state} = useMapLayers(MapLayerContext);
  const onChangeRegionStart = () => setLoader(true);

  const onChangeRegionComplete = () => {
    setLoader(false);
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={map}
        logoEnabled={false}
        onPress={onPressMap}
        compassViewPosition={3}
        showUserLocation={true}
        scaleBarEnabled={false}
        style={styles.container}
        styleURL={MapboxGL.StyleURL[state]}
        compassViewMargins={compassViewMargins}
        onRegionIsChanging={onChangeRegionStart}
        attributionPosition={attributionPosition}
        onRegionDidChange={onChangeRegionComplete}>
        <MapboxGL.Camera
          ref={el => {
            camera.current = el;
            setIsCameraRefVisible(!!el);
          }}
        />
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
        {loader ? (
          <ActivityIndicator color={Colors.WHITE} style={styles.loader} />
        ) : (
          <Text style={styles.activeMarkerLocation}>{markerText}</Text>
        )}
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
    color: Colors.WHITE,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontSize: Typography.FONT_SIZE_16,
    textAlign: 'center',
    paddingTop: 4,
  },
  loader: {
    position: 'absolute',
    bottom: 67,
  },
  activeMarkerLocation: {
    position: 'absolute',
    bottom: 67,
    color: Colors.WHITE,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontSize: Typography.FONT_SIZE_16,
  },
});

const polyline = {lineWidth: 5, lineColor: Colors.BLACK};
