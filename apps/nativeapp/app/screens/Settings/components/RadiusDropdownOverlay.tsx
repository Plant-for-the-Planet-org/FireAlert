import React from 'react';
import {Text, View, TouchableOpacity, StyleSheet} from 'react-native';
import {LayerCheck} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';
import {RADIUS_ARR} from '../../../constants';

interface RadiusDropdownOverlayProps {
  visible: boolean;
  onClose: () => void;
  currentRadius: number;
  siteGeometry: string;
  position: {x: number; y: number};
  onSelectRadius: (radius: number) => void;
}

export const RadiusDropdownOverlay: React.FC<RadiusDropdownOverlayProps> = ({
  visible,
  onClose,
  currentRadius,
  siteGeometry,
  position,
  onSelectRadius,
}) => {
  if (!visible) return null;

  return (
    <>
      <TouchableOpacity style={styles.overlay} onPress={onClose} />
      <View
        style={[
          styles.dropDownModal,
          {
            top: position.y + 15,
          },
        ]}>
        {RADIUS_ARR.map((item, index) => (
          <View key={`RADIUS_ARR_${index}`} style={styles.subDropDownCon}>
            <TouchableOpacity
              style={styles.siteRadiusCon}
              disabled={
                item.value === currentRadius ||
                (siteGeometry === 'Point' && item.value === 0)
              }
              onPress={() => onSelectRadius(item.value)}>
              <Text
                style={[
                  styles.siteRadiusText,
                  item.value === currentRadius &&
                    styles.fontFamilyBoldColorGradientPrimary,
                  siteGeometry === 'Point' &&
                    item.value === 0 &&
                    styles.colorDisable,
                ]}>
                {item.name}
              </Text>
              {item.value === currentRadius && <LayerCheck />}
            </TouchableOpacity>
            {RADIUS_ARR.length - 1 !== index && (
              <View style={[styles.separator, styles.marginHorizontal16]} />
            )}
          </View>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  dropDownModal: {
    position: 'absolute',
    right: 16,
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
    minWidth: 150,
  },
  subDropDownCon: {
    // Container for each dropdown item
  },
  siteRadiusCon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  siteRadiusText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  fontFamilyBoldColorGradientPrimary: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.GRADIENT_PRIMARY,
  },
  colorDisable: {
    color: Colors.DISABLE,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#e0e0e0',
  },
  marginHorizontal16: {
    marginHorizontal: 16,
  },
});
