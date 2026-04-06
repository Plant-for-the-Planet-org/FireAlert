import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {LocationPinIcon, CopyIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';

interface AlertLocationSectionProps {
  latitude: number;
  longitude: number;
  onCopyCoordinates: () => void;
}

export const AlertLocationSection: React.FC<AlertLocationSectionProps> = ({
  latitude,
  longitude,
  onCopyCoordinates,
}) => {
  return (
    <>
      <View style={styles.separator} />
      <View style={[styles.alertLocInfoCon, styles.alertLocInfoConJustified]}>
        <View style={styles.satelliteInfoLeft}>
          <View style={styles.satelliteIcon}>
            <LocationPinIcon />
          </View>
          <View style={styles.satelliteInfo}>
            <Text style={styles.satelliteLocText}>LOCATION</Text>
            <Text style={styles.alertLocText}>
              {Number.parseFloat(latitude.toString()).toFixed(5)},{' '}
              {Number.parseFloat(longitude.toString()).toFixed(5)}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onCopyCoordinates}>
          <CopyIcon />
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: Colors.GRAY_LIGHT,
    marginVertical: 20,
  },
  alertLocInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertLocInfoConJustified: {
    justifyContent: 'space-between',
  },
  satelliteInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  satelliteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  satelliteInfo: {
    flex: 1,
  },
  satelliteLocText: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    marginBottom: 4,
  },
  alertLocText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
});
