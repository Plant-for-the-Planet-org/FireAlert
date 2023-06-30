import React, {memo} from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {LayerCheck} from '../../assets/svgs';
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
                <Text
                  style={[
                    styles.layerText,
                    item?.value === state && {
                      fontFamily: Typography.FONT_FAMILY_BOLD,
                      color: Colors.GRADIENT_PRIMARY,
                    },
                  ]}>
                  {item?.title}
                </Text>
                {item?.value === state && <LayerCheck />}
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
    top: 140,
    right: 82,
    width: 169,
    borderRadius: 12,
    backgroundColor: Colors.WHITE,
    paddingVertical: 6,
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
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  separator: {
    height: 0.4,
    marginHorizontal: 16,
    backgroundColor: '#BDBDBD',
  },
  layerTextContainer: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
});
