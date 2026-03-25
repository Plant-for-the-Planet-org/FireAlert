import React, {useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {useToast} from 'react-native-toast-notifications';
import {BottomSheet} from '../../../components';
import {IncidentSummaryCard} from '../../../components/Incident/IncidentSummaryCard';
import {
  AlertSummaryCard,
  type AlertSummaryCardData,
} from '../../../components/Alert';
import {Colors, Typography} from '../../../styles';
import {trpc} from '../../../services/trpc';
import type {SiteAlertData} from '../../../types/incident';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface IncidentDetailsBottomSheetProps {
  isVisible: boolean;
  incidentId: string | null;
  onClose: () => void;
  onAlertTap: (alert: SiteAlertData) => void;
}

export const IncidentDetailsBottomSheet: React.FC<
  IncidentDetailsBottomSheetProps
> = ({isVisible, incidentId, onClose, onAlertTap}) => {
  const toast = useToast();

  // Fetch incident data
  const {
    data: incident,
    isLoading,
    isError,
    refetch,
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

  const stopAlertsMutation = (trpc as any).siteIncident.updateIncidentReviewStatus.useMutation(
    {
      retry: 1,
      onSuccess: async (res: any) => {
        toast.show(
          res?.json?.message ||
            res?.message ||
            'Alerts stopped for this incident.',
          {
            type: 'success',
          },
        );
        await refetch();
      },
      onError: (error: any) => {
        toast.show(
          error?.message || 'Failed to stop alerts for this incident.',
          {
            type: 'danger',
          },
        );
      },
    },
  );

  const handleStopAlerts = useCallback(
    (incidentData: any) => {
      if (!incidentData?.id) {
        toast.show('Incident details are not ready yet.', {type: 'warning'});
        return;
      }

      if (!incidentData.isActive) {
        toast.show('Incident is already closed.', {type: 'warning'});
        return;
      }

      if (incidentData.reviewStatus === 'STOP_ALERTS') {
        toast.show('Alerts are already stopped for this incident.', {
          type: 'warning',
        });
        return;
      }

      stopAlertsMutation.mutate({
        json: {
          incidentId: incidentData.id,
          status: 'STOP_ALERTS',
        },
      });
    },
    [stopAlertsMutation, toast],
  );

  const renderAlertItem = ({item}: {item: any}) => {
    const alert = item;

    // Convert alert data to AlertSummaryCardData format
    const alertSummaryData: AlertSummaryCardData = {
      id: alert.id,
      eventDate: alert.eventDate,
      localEventDate: alert.localEventDate,
      localTimeZone: alert.localTimeZone,
      latitude: alert.latitude,
      longitude: alert.longitude,
      detectedBy: alert.detectedBy,
      confidence: alert.confidence,
      distance: alert.distance || 1, // Default distance if not provided
      site: alert.site,
      siteIncidentId: alert.siteIncidentId,
    };

    return (
      <AlertSummaryCard
        alert={alertSummaryData}
        onPress={() => onAlertTap(alert)}
      />
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
    const isAlertsStopped = incidentData.reviewStatus === 'STOP_ALERTS';

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

            <View style={styles.stopAlertsSection}>
              <TouchableOpacity
                style={[
                  styles.stopAlertsButton,
                  isAlertsStopped && styles.stopAlertsButtonOutlined,
                ]}
                onPress={() => handleStopAlerts(incidentData)}
                disabled={stopAlertsMutation.status === 'pending'}
                accessibilityLabel="Stop alerts for this incident"
                accessibilityRole="button">
                {stopAlertsMutation.status === 'pending' ? (
                  <ActivityIndicator
                    color={
                      isAlertsStopped ? Colors.GRADIENT_PRIMARY : Colors.WHITE
                    }
                  />
                ) : (
                  <Text
                    style={[
                      styles.stopAlertsButtonText,
                      isAlertsStopped && styles.stopAlertsButtonTextOutlined,
                    ]}>
                    {isAlertsStopped
                      ? 'Alerts Stopped for this Incident'
                      : 'Stop Alerts for the Incident'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.alertsSection}>
              <Text style={styles.alertsSectionTitle}>
                All Fire Detections ({sortedAlerts.length})
              </Text>
              <Text style={styles.alertsSectionSubtitle}>
                Tap any detection to view on map
              </Text>
            </View>
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
  stopAlertsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  stopAlertsButton: {
    backgroundColor: Colors.GRADIENT_PRIMARY,
    borderColor: Colors.GRADIENT_PRIMARY,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopAlertsButtonOutlined: {
    backgroundColor: 'transparent',
  },
  stopAlertsButtonText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.WHITE,
  },
  stopAlertsButtonTextOutlined: {
    color: Colors.GRADIENT_PRIMARY,
  },
});
