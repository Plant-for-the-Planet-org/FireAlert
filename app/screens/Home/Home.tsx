import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';

import {BottomBar} from '../../components';

const Home = () => {
  const onListPress = () => {};
  const onMapPress = () => {};
  return (
    <SafeAreaView style={styles.safeAreaView}>
      <BottomBar onListPress={onListPress} onMapPress={onMapPress} />
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: '#000',
  },
});
