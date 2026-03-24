import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import moment from 'moment-timezone';
import {SatelliteIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';

interface AlertDetectionSectionProps {
  detectedBy: string;
  localEventDate?: Date | string;
  eventDate?: Date | string;
  localTimeZone?: string;
  confidence: string;
}

export const AlertDetectionSection: React.FC<AlertDetectionSectionProps> = ({
  detectedBy,
  localEventDate,
  eventDate,
  localTimeZone = 'UTC',
  confidence,
}) => {
  const displayDate = localEventDate || eventDate;

  return (
    <View style={styles.satelliteInfoCon}>
      <View style={styles.satelliteIcon}>
        <SatelliteIcon />
      </View>
      <View style={styles.satelliteInfo}>
        <Text style={styles.satelliteText}>DETECTED BY {detectedBy}</Text>
        <Text style={styles.eventDate}>
          <Text style={styles.eventFromNow}>
            {moment(displayDate)?.tz(localTimeZone)?.fromNow()}
          </Text>{' '}
          (
          {moment(displayDate)
            ?.tz(localTimeZone)
            ?.format('DD MMM YYYY [at] HH:mm')}
          )
        </Text>
        <Text style={styles.confidence}>
          <Text style={styles.confidenceVal}>{confidence}</Text> alert
          confidence
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  satelliteInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
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
  satelliteText: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
  },
  eventFromNow: {
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  confidence: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
  },
  confidenceVal: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.GRADIENT_PRIMARY,
  },
});
