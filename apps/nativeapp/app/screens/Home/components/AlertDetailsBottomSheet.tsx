import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {BottomSheet} from '../../../components';
import {SatelliteIcon, LocationPinIcon, CrossIcon} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';
import {trpc} from '../../../services/trpc';
import moment from 'moment-timezone';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface AlertDetailsBottomSheetProps {
  isVisible: boolean;
  alertId: string | null;
  onClose: () => void;
  onBack: () => void;
  showBackButton: boolean;
}

export const AlertDetailsBottomSheet: React.FC<
  AlertDetailsBottomSheetProps
> = ({isVisible, alertId, onClose, onBack, showBackButton}) => {
  // Fetch alert data
  const {
    data: alertResponse,
    isLoading,
    isError,
  } = (trpc as any).alert.getAlert.useQuery(
    {id: alertId || ''},
    {
      enabled: !!alertId && isVisible,
      retryDelay: 3000,
    },
  );

  const alert = alertResponse?.data;

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.GRADIENT_PRIMARY} />
          <Text style={styles.loadingText}>Loading alert details...</Text>
        </View>
      );
    }

    if (isError || !alert) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load alert details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onClose}>
            <Text style={styles.retryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.alertContent}>
        {/* Alert Header */}
        <View style={styles.alertHeader}>
          <View style={styles.alertIconContainer}>
            <SatelliteIcon width={24} height={24} />
          </View>
          <View style={styles.alertInfo}>
            <Text style={styles.alertDetectedBy}>
              DETECTED BY {alert.detectedBy}
            </Text>
            <Text style={styles.alertTime}>
              {moment(alert.localEventDate || alert.eventDate)
                .tz(alert.localTimeZone || 'UTC')
                .format('DD MMM YYYY [at] HH:mm')}
            </Text>
          </View>
        </View>

        {/* Alert Details */}
        <View style={styles.alertDetails}>
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Location</Text>
            <View style={styles.locationRow}>
              <LocationPinIcon width={16} height={16} />
              <Text style={styles.locationText}>
                {Number.parseFloat(alert.latitude).toFixed(5)},{' '}
                {Number.parseFloat(alert.longitude).toFixed(5)}
              </Text>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Detection Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Confidence:</Text>
              <Text style={styles.detailValue}>{alert.confidence}</Text>
            </View>
            {alert.type && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{alert.type}</Text>
              </View>
            )}
            {alert.distance && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Distance:</Text>
                <Text style={styles.detailValue}>{alert.distance} km</Text>
              </View>
            )}
          </View>

          {/* Associated Incident */}
          {alert.siteIncidentId && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Associated Incident</Text>
              <Text style={styles.incidentIdText}>
                ID: {alert.siteIncidentId}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <BottomSheet
      isVisible={isVisible}
      onBackdropPress={onClose}
      backdropColor="transparent"
      snapPoints={['50%']}
      initialSnapIndex={0}
      useScrollableContainer>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderHandle} />
          <View style={styles.headerActions}>
            {showBackButton && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                accessibilityLabel="Go back to incident details"
                accessibilityRole="button">
                <CrossIcon width={20} height={20} style={styles.backIcon} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close alert details"
              accessibilityRole="button">
              <CrossIcon width={20} height={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {renderContent()}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    bottom: 0,
    borderRadius: 15,
    paddingBottom: 12,
    width: SCREEN_WIDTH,
    backgroundColor: Colors.WHITE,
  },
  modalHeader: {
    position: 'relative',
    paddingTop: 10,
    paddingBottom: 16,
  },
  modalHeaderHandle: {
    width: 46,
    height: 8,
    borderRadius: 5,
    alignSelf: 'center',
    backgroundColor: Colors.GRAY_MEDIUM,
    marginBottom: 16,
  },
  headerActions: {
    position: 'absolute',
    top: 10,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.GRAY_LIGHTEST,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.GRAY_LIGHTEST,
  },
  backIcon: {
    transform: [{rotate: '90deg'}],
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
  },
  errorText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.GRADIENT_PRIMARY,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.WHITE,
  },
  alertContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.GRAY_LIGHT,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.GRADIENT_PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  alertInfo: {
    flex: 1,
  },
  alertDetectedBy: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
  },
  alertDetails: {
    flex: 1,
    gap: 24,
  },
  detailSection: {
    gap: 12,
  },
  detailSectionTitle: {
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
    flex: 1,
  },
  detailValue: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
    flex: 1,
    textAlign: 'right',
  },
  incidentIdText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
    backgroundColor: Colors.GRAY_LIGHTEST,
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
});
