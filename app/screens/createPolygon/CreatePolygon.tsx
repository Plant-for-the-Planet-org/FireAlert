import MapboxGL from '@rnmapbox/maps';
import React, {useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import Map from '../MapMarking/Map';
import {CustomButton} from '../../components';
import {Colors, Typography} from '../../styles';

const CreatePolygon = () => {
  const [loader, setLoader] = useState(false);
  const [alphabets, setAlphabets] = useState<string[]>([]);
  const [isCameraRefVisible, setIsCameraRefVisible] = useState(false);
  const [geoJSON, setGeoJSON] = useState<any>({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          isPolygonComplete: false,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [74.39102390805803, 35.883791472777204],
            [65.64784013827631, 22.199466457087468],
            [77.76929545703746, 6.665129463161108],
            [100.61741921894026, 28.829224142671507],
            [74.39102390805803, 35.883791472777204],
          ],
        },
      },
    ],
  });

  const camera = useRef<MapboxGL.Camera | null>(null);

  return (
    <View style={styles.container}>
      <Map
        geoJSON={geoJSON}
        camera={camera}
        loader={loader}
        setLoader={setLoader}
        markerText={alphabets[1]}
        setIsCameraRefVisible={setIsCameraRefVisible}
      />
      <CustomButton
        title="Continue"
        style={styles.btn}
        titleStyle={styles.title}
      />
    </View>
  );
};
export default CreatePolygon;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addSpecies: {
    color: Colors.ALERT,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_18,
    lineHeight: Typography.LINE_HEIGHT_30,
  },
  btn: {
    position: 'absolute',
    bottom: 29,
  },
  title: {
    color: Colors.WHITE,
  },
});
