import React, {memo} from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {MyLocIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';
import {SELECT_MAP_LAYER} from '../../global/actions/Types';
import {MapLayerContext, useMapLayers} from '../../global/reducers/mapLayers';

interface ILayerModalProps {
  visible: boolean;
  onRequestClose?: any;
}

const layers = [
  {title: 'Street', value: 'Street'},
  {title: 'Outdoors', value: 'Outdoors'},
  {title: 'Satellite', value: 'Satellite'},
  {title: 'Satellite-street', value: 'SatelliteStreet'},
];

const LayerModal = ({visible, onRequestClose = () => {}}: ILayerModalProps) => {
  const {state, dispatch} = useMapLayers(MapLayerContext);

  const selectMapLayer = item => {
    dispatch({type: SELECT_MAP_LAYER, payload: item});
    onRequestClose();
  };

  return (
    <Modal onRequestClose={onRequestClose} visible={visible} transparent>
      <TouchableOpacity onPress={onRequestClose} style={styles.container}>
        <View style={styles.subContainer}>
          {layers.map((item, index) => (
            <View key={item?.title}>
              <TouchableOpacity
                onPress={() => selectMapLayer(item?.value)}
                style={styles.layerTextContainer}>
                <Text style={styles.layerText}>{item?.title}</Text>
                {item?.value === state && <MyLocIcon width={20} height={20} />}
              </TouchableOpacity>
              {layers.length - 1 !== index && <View style={styles.separator} />}
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default memo(LayerModal);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-end',
  },
  subContainer: {
    top: 150,
    right: 74,
    width: '50%',
    borderRadius: 10,
    backgroundColor: Colors.WHITE,
    // shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  layerText: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  separator: {
    height: 1,
    width: '100%',
    backgroundColor: Colors.GRAY_LIGHT,
  },
  layerTextContainer: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
});
