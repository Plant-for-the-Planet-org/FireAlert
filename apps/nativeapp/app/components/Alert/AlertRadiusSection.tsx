import React from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import {RadarIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface AlertRadiusSectionProps {
  distance: number;
}

export const AlertRadiusSection: React.FC<AlertRadiusSectionProps> = ({
  distance,
}) => {
  const searchRadius = distance === 0 ? 1 : distance;

  return (
    <>
      <View style={styles.separator} />
      <View style={styles.alertRadiusInfoCon}>
        <View style={styles.satelliteIcon}>
          <RadarIcon />
        </View>
        <View style={styles.satelliteInfo}>
          <Text style={[styles.alertLocText, {width: SCREEN_WIDTH / 1.3}]}>
            Search for the fire within a{' '}
            <Text style={styles.confidenceVal}>{searchRadius} km</Text> radius
            around the location.
          </Text>
        </View>
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
  alertRadiusInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  satelliteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.GRADIENT_PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  satelliteInfo: {
    flex: 1,
  },
  alertLocText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  confidenceVal: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.GRADIENT_PRIMARY,
    textTransform: 'lowercase',
  },
});
