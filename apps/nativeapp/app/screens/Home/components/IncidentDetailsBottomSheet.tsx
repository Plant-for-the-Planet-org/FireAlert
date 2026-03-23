import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import moment from 'moment-timezone';
import {BottomSheet} from '../../../components';
import {IncidentSummaryCard} from '../../../components/Incident/IncidentSummaryCard';
import {SatelliteIcon, LocationPinIcon} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';
import {trpc} from '../../../services/trpc';
import type {SiteAlertData} from '../../../types/incident';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface IncidentDetailsBottomSheetProps {
  isVisible: boolean;
  incidentId: string | null;
  onClose: () => void;
  onAlertTap: (alert: SiteAlertData) => void;
  onStopAlerts?: (incidentId: string) => void;
}

export const IncidentDetailsBottomSheet: React.FC<
  IncidentDetailsBottomSheetProps
> = ({isVisible, incidentId, onClose, onAlertTap, onStopAlerts}) => {
  // Fetch incident data
  const {
    data: incident,
    isLoading,
    isError,
  } = (trpc as any).siteIncident.getIncident.useQuery(
    {json: {incidentId: incidentId || ''}},
    {
      enabled: !!incidentId && isVisible,
      retryDelay: 3000,
    },
  );

  // Sort alerts by event date (newest first)
  const sortedAlerts = useMemo<any[]>(() => {
    if (!incident?.json?.data?.siteAlerts) return [];
    return [...incident.json.data.siteAlerts].sort(
      (a, b) =>
        new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    );
  }, [incident]);

  const renderAlertItem = ({item}: {item: any}) => {
    const alert = item;
    return (
      <TouchableOpacity
        style={styles.alertItem}
        onPress={() => onAlertTap(alert)}
        accessibilityLabel={`Alert detected at ${alert.latitude}, ${alert.longitude}`}
        accessibilityRole="button">
        <View style={styles.alertHeader}>
          <View style={styles.alertIconContainer}>
            <SatelliteIcon width={20} height={20} />
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

        <View style={styles.alertDetails}>
          <View style={styles.alertDetailRow}>
            <LocationPinIcon width={16} height={16} />
            <Text style={styles.alertDetailText}>
              {Number.parseFloat(alert.latitude).toFixed(5)},{' '}
              {Number.parseFloat(alert.longitude).toFixed(5)}
            </Text>
          </View>
          <View style={styles.alertConfidence}>
            <Text style={styles.confidenceLabel}>Confidence: </Text>
            <Text style={styles.confidenceValue}>{alert.confidence}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.GRADIENT_PRIMARY} />
          <Text style={styles.loadingText}>Loading incident details...</Text>
        </View>
      );
    }

    if (isError || !incident?.json?.data) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load incident details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onClose}>
            <Text style={styles.retryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const incidentData = incident.json.data;

    return (
      <BottomSheetFlatList
        data={sortedAlerts}
        renderItem={renderAlertItem}
        keyExtractor={item => item.id}
        style={styles.alertsList}
        contentContainerStyle={styles.alertsListContent}
        showsVerticalScrollIndicator={true}
        ListHeaderComponent={
          <>
            <IncidentSummaryCard
              isActive={incidentData.isActive}
              startAlert={incidentData.startSiteAlert}
              latestAlert={incidentData.latestSiteAlert}
              allAlerts={incidentData.siteAlerts}
            />

            <View style={styles.alertsSection}>
              <Text style={styles.alertsSectionTitle}>
                All Fire Detections ({sortedAlerts.length})
              </Text>
              <Text style={styles.alertsSectionSubtitle}>
                Tap any detection to view on map
              </Text>
            </View>

            {onStopAlerts && (
              <View style={styles.stopAlertsSection}>
                <TouchableOpacity
                  style={styles.stopAlertsButton}
                  onPress={() => onStopAlerts(incidentData.id)}
                  accessibilityLabel="Stop alerts for this incident"
                  accessibilityRole="button">
                  <Text style={styles.stopAlertsButtonText}>
                    Stop Alerts for the Incident
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
      />
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
        <View style={styles.modalHeader} />
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
    width: 46,
    height: 8,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 5,
    alignSelf: 'center',
    backgroundColor: Colors.GRAY_MEDIUM,
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
  alertsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  alertsSectionTitle: {
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    marginBottom: 4,
  },
  alertsSectionSubtitle: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
  },
  alertsList: {
    flex: 1,
  },
  alertsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  alertItem: {
    backgroundColor: Colors.GRAY_LIGHTEST + '40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.GRADIENT_PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertDetectedBy: {
    fontSize: Typography.FONT_SIZE_10,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
  },
  alertDetails: {
    gap: 8,
  },
  alertDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertDetailText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  alertConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
  },
  confidenceValue: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.GRADIENT_PRIMARY,
    textTransform: 'uppercase',
  },
  stopAlertsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  stopAlertsButton: {
    backgroundColor: Colors.ALERT,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopAlertsButtonText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.WHITE,
  },
});
