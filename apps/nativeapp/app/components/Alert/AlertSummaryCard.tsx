import React, {memo, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ToastAndroid,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import {Colors} from '../../styles';
import {AlertDetectionSection} from './AlertDetectionSection';
import {AlertSiteSection} from './AlertSiteSection';
import {AlertLocationSection} from './AlertLocationSection';
import {AlertRadiusSection} from './AlertRadiusSection';
import {AlertActionsSection} from './AlertActionsSection';

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
  showToast?: (message: string) => void;
}

export const AlertSummaryCard = memo<AlertSummaryCardProps>(
  ({alert, onPress, showToast}) => {
    const handleCopyCoordinates = useCallback(() => {
      const coordinates = `${alert.latitude}, ${alert.longitude}`;

      if (Platform.OS === 'android') {
        ToastAndroid.show('copied', ToastAndroid.SHORT);
      } else {
        // For iOS, you might want to use a different toast library
        Alert.alert('Copied', coordinates);
      }

      // Show toast if callback provided
      if (showToast) {
        showToast('copied');
      }
    }, [alert.latitude, alert.longitude, showToast]);

    const handleOpenInGoogleMaps = useCallback(() => {
      const lat = Number.parseFloat(alert.latitude.toString());
      const lng = Number.parseFloat(alert.longitude.toString());
      const scheme = Platform.select({ios: 'maps:', android: 'geo:'});
      const url = Platform.select({
        ios: `${scheme}0,0?q=${lat},${lng}`,
        android: `${scheme}${lat},${lng}?q=${lat},${lng}`,
      });

      if (url) {
        Linking.openURL(url).catch(err => {
          console.error('Failed to open Google Maps:', err);
          Alert.alert('Error', 'Unable to open Google Maps');
        });
      }
    }, [alert.latitude, alert.longitude]);

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

        <AlertLocationSection
          latitude={alert.latitude}
          longitude={alert.longitude}
          onCopyCoordinates={handleCopyCoordinates}
        />

        <AlertRadiusSection distance={alert.distance} />

        <AlertActionsSection onOpenInGoogleMaps={handleOpenInGoogleMaps} />
      </View>
    );
  },
);

AlertSummaryCard.displayName = 'AlertSummaryCard';

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.GRAY_LIGHTEST + '40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
  },
});
