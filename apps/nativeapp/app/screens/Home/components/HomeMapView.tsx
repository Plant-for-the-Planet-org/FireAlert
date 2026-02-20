/**
 * HomeMapView Component
 *
 * Renders the Mapbox map with camera controls and handles map lifecycle events.
 * This is a presentational component that receives all data via props and emits
 * events via callbacks.
 *
 * @component
 */

import React from 'react';
import {Platform, StyleSheet} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import type {HomeMapViewProps} from '../types';

const IS_ANDROID = Platform.OS === 'android';

const attributionPosition: any = {
  bottom: IS_ANDROID ? 72 : 56,
  left: 8,
};

const compassViewMargins = {
  x: IS_ANDROID ? 16 : 17,
  y: IS_ANDROID ? 160 : 160,
};

const compassViewPosition = 3;

const images = {
  compass1: require('../../../assets/images/compassImage.png'),
};

/**
 * HomeMapView - Renders the main map view with camera controls
 *
 * @param {HomeMapViewProps} props - Component props
 * @returns {JSX.Element} The map view component
 */
export const HomeMapView: React.FC<HomeMapViewProps> = ({
  mapRef,
  cameraRef,
  selectedLayer,
  location,
  onMapReady,
  onRegionDidChange,
  children,
}) => {
  return (
    <MapboxGL.MapView
      ref={mapRef}
      compassEnabled
      style={styles.map}
      logoEnabled={false}
      scaleBarEnabled={false}
      compassImage={'compass1'}
      styleURL={
        MapboxGL.StyleURL[selectedLayer as keyof typeof MapboxGL.StyleURL]
      }
      compassViewMargins={compassViewMargins}
      compassViewPosition={compassViewPosition}
      attributionPosition={attributionPosition}
      onDidFinishLoadingMap={onMapReady}
      onRegionDidChange={onRegionDidChange}>
      <MapboxGL.Images images={images} />
      <MapboxGL.Camera ref={cameraRef} />
      {location && (
        <MapboxGL.UserLocation
          showsUserHeadingIndicator
          onUpdate={() => {
            // Location updates are handled by parent component
          }}
        />
      )}
      {children}
    </MapboxGL.MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
