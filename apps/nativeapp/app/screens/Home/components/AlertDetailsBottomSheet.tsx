import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import {BottomSheet} from '../../../components';
import {trpc} from '../../../services/trpc';
import {Colors, Typography} from '../../../styles';
import {BackArrowIcon} from '../../../assets/svgs';
import {
  AlertDetectionSection,
  AlertSiteSection,
  AlertLocationSection,
  AlertRadiusSection,
  AlertActionsSection,
} from '../../../components/Alert';
import {IncidentSummaryCard} from '../../../components/Incident/IncidentSummaryCard';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface AlertDetailsBottomSheetProps {
  isVisible: boolean;
  alertId: string | null;
  onClose: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const AlertDetailsBottomSheet: React.FC<
  AlertDetailsBottomSheetProps
> = ({isVisible, alertId, onClose, onBack, showBackButton}) => {
  // Helper functions
  const handleCopyCoordinates = (latitude: number, longitude: number) => {
    const coordinates = `${latitude}, ${longitude}`;
    // Copy to clipboard logic would go here
    console.log('Copied to clipboard:', coordinates);
  };

  const handleGoogleRedirect = (latitude: number, longitude: number) => {
    const lat = Number.parseFloat(latitude.toString());
    const lng = Number.parseFloat(longitude.toString());
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
  };

  // Fetch alert data
  const {
    data: alertResponse,
    isLoading,
    isError,
  } = (trpc as any).alert.getAlert.useQuery(
    {json: {id: alertId || ''}},
    {
      enabled: !!alertId && isVisible,
      retryDelay: 3000,
    },
  );

  const alert = alertResponse?.json.data;

  // Fetch incident data if alert has siteIncidentId
  const {
    incident,
    isLoading: isIncidentLoading,
    isError: isIncidentError,
  } = trpc.siteIncident.getIncident.useQuery(
    {json: {incidentId: alert?.siteIncidentId}},
    {
      enabled: !!alert?.siteIncidentId && isVisible,
      retryDelay: 3000,
    },
  );

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
      console.log({alert});
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
      <>
        {/* Debug console logs */}
        {console.log(
          `[incident] Alert modal opened - alertId: ${
            alert.id
          }, siteIncidentId: ${alert.siteIncidentId || 'none'}, site: ${
            alert.site?.name || 'unknown'
          }`,
        )}

        {/* Incident Summary Card - shown when incident data is available */}
        {incident && (
          <>
            {console.log(
              `[incident] Displaying incident details - incidentId: ${
                incident.id
              }, isActive: ${incident.isActive}, alertCount: ${
                incident.siteAlerts.length
              }, firePoints: ${incident.siteAlerts
                .map(
                  (a, i) =>
                    `[${i}](${a.latitude.toFixed(4)},${a.longitude.toFixed(
                      4,
                    )})`,
                )
                .join(' ')}`,
            )}

            <IncidentSummaryCard
              isActive={incident.isActive}
              startAlert={incident.startSiteAlert}
              latestAlert={incident.latestSiteAlert}
              allAlerts={incident.siteAlerts}
              incidentId={incident.id}
            />

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
              onCopyCoordinates={() =>
                handleCopyCoordinates(alert.latitude, alert.longitude)
              }
            />

            <AlertRadiusSection distance={alert.distance} />

            <AlertActionsSection
              onOpenInGoogleMaps={() =>
                handleGoogleRedirect(alert.latitude, alert.longitude)
              }
            />
          </>
        )}
        {!incident &&
          alert?.siteIncidentId &&
          (console.log(
            `[incident] Incident data loading - alertId: ${alert.id}, siteIncidentId: ${alert.siteIncidentId}, isLoading: ${isIncidentLoading}, isError: ${isIncidentError}`,
          ),
          null)}

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
          onCopyCoordinates={() =>
            handleCopyCoordinates(alert.latitude, alert.longitude)
          }
        />

        <AlertRadiusSection distance={alert.distance} />

        <AlertActionsSection
          onOpenInGoogleMaps={() =>
            handleGoogleRedirect(alert.latitude, alert.longitude)
          }
        />
      </>
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
      <View style={[styles.modalContainer, styles.commonPadding]}>
        <View style={styles.modalHeaderContainer}>
          <View style={styles.modalHeader} />
        </View>
        <View style={styles.headerActions}>
          {showBackButton && onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              accessibilityLabel="Go back to incident details"
              accessibilityRole="button">
              {/* <CrossIcon width={20} height={20} style={styles.backIcon} /> */}
              <BackArrowIcon />
            </TouchableOpacity>
          )}
          {/* <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close alert details"
              accessibilityRole="button">
              <CrossIcon width={20} height={20} />
            </TouchableOpacity> */}
        </View>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}>
          {renderContent()}
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    bottom: 0,
    borderRadius: 15,
    width: SCREEN_WIDTH,
    backgroundColor: Colors.WHITE,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 16,
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
  modalHeaderContainer: {
    position: 'relative',
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerActions: {
    position: 'absolute',
    top: 10,
    left: 16,
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  backIcon: {
    transform: [{rotate: '90deg'}],
  },
  commonPadding: {
    paddingHorizontal: 16,
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
  satelliteInfoCon: {
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
  alertLocInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  satelliteInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  simpleBtn: {
    backgroundColor: Colors.GRADIENT_PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  siteActionText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.WHITE,
  },
});
