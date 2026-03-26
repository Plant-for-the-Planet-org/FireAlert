import React, {memo, useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {Colors} from '../../styles';
import {AlertDetectionSection} from './AlertDetectionSection';
import {AlertSiteSection} from './AlertSiteSection';

// Extended interface to match the data structure from the original code
export interface AlertSummaryCardData {
  id: string;
  eventDate: Date | string;
  localEventDate?: Date | string;
  localTimeZone?: string;
  latitude: number;
  longitude: number;
  detectedBy: string;
  confidence: string;
  distance: number;
  site?: {
    id: string;
    name: string | null;
    project?: {
      id: string;
      name: string;
    } | null;
  };
  siteIncidentId?: string;
}

interface AlertSummaryCardProps {
  alert: AlertSummaryCardData;
  onPress?: () => void;
}

export const AlertSummaryCard = memo<AlertSummaryCardProps>(
  ({alert, onPress}) => {
    const handlePress = useCallback(() => {
      onPress?.();
    }, [onPress]);

    return (
      <View style={styles.container} onTouchEnd={handlePress}>
        <AlertDetectionSection
          detectedBy={alert.detectedBy}
          localEventDate={alert.localEventDate}
          eventDate={alert.eventDate}
          localTimeZone={alert.localTimeZone}
          confidence={alert.confidence}
        />

        {alert.site && <AlertSiteSection site={alert.site} />}
      </View>
    );
  },
);

AlertSummaryCard.displayName = 'AlertSummaryCard';

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.GRAY_LIGHT + '40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
});
