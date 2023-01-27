import React from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import MapboxGL, {Logger} from '@rnmapbox/maps';

import Markers from '../Markers';
import {Colors, Typography} from '../../styles';

MapboxGL.setAccessToken(
  'sk.eyJ1IjoibWF5YW5rNHBsYW50LWZvci10aGUtcGxhbmV0IiwiYSI6ImNsZGNvbW44azBjN2UzdXF6YXlsZHQ2NjAifQ.biPiyvXSzxjT_-oEPRQSRQ',
);

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
}: IMapProps) {
  const onChangeRegionStart = () => setLoader(true);

  const onChangeRegionComplete = () => {
    setLoader(false);
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        showUserLocation={true}
        style={styles.container}
        ref={map}
        compassViewPosition={3}
        compassViewMargins={{
          x: 30,
          y: 230,
        }}
        logo
        onRegionIsChanging={onChangeRegionStart}
        onRegionDidChange={onChangeRegionComplete}>
        <Markers
          geoJSON={geoJSON}
          type={'LineString'}
          onPressMarker={() => Alert.alert('dfd')}
        />

        <MapboxGL.Camera
          ref={el => {
            camera.current = el;
            setIsCameraRefVisible(!!el);
          }}
        />

        <MapboxGL.ShapeSource id={'polygon'} shape={geoJSON}>
          <MapboxGL.LineLayer id={'polyline'} style={polyline} />
        </MapboxGL.ShapeSource>
        {location && (
          <MapboxGL.UserLocation
            showsUserHeadingIndicator
            onUpdate={data => setLocation(data)}
          />
        )}
      </MapboxGL.MapView>

      {/* <View style={styles.fakeMarkerCont}>
        <SvgXml xml={active_marker} style={styles.markerImage} />
        {treeType === MULTI ? (
          loader ? (
            <ActivityIndicator color={Colors.WHITE} style={styles.loader} />
          ) : (
            <Text style={styles.activeMarkerLocation}>{markerText}</Text>
          )
        ) : (
          []
        )}
      </View> */}
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
    fontWeight: 'bold',
    fontSize: 16,
  },
});

const polyline = {lineWidth: 5, lineColor: Colors.BLACK};
