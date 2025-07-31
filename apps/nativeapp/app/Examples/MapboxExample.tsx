import Mapbox from '@rnmapbox/maps';
import { StyleSheet, View } from 'react-native';

Mapbox.setAccessToken(
  'sk.eyJ1IjoibWF5YW5rNHBsYW50LWZvci10aGUtcGxhbmV0IiwiYSI6ImNsZnFsYjc0eDAwZzIzdG8xNzY1Y3R5N28ifQ.rCuy0XY72xLiEQcpSWf5wA',
);

export default function MapboxExample() {
  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <Mapbox.MapView style={styles.map} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    height: 300,
    width: 300,
  },
  map: {
    flex: 1,
  },
});
