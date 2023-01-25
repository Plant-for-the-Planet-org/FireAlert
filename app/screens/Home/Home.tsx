import React from 'react';
import MapboxGL from '@rnmapbox/maps';
import {SafeAreaView, StyleSheet, View} from 'react-native';

import {BottomBar} from '../../components';

const Home = () => {
  const onListPress = () => {};
  const onMapPress = () => {};
  return (
    <>
      <MapboxGL.MapView style={styles.map} />
      <SafeAreaView style={styles.safeAreaView}>
        <BottomBar onListPress={onListPress} onMapPress={onMapPress} />
      </SafeAreaView>
    </>
  );
};

export default Home;

const styles = StyleSheet.create({
  safeAreaView: {
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
});
