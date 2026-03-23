import moment from 'moment-timezone';
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CopyIcon,
  CrossIcon,
  LocationPinIcon,
  RadarIcon,
  SatelliteIcon,
  SiteIcon,
} from '../../../assets/svgs';
import {BottomSheet} from '../../../components';
import {trpc} from '../../../services/trpc';
import {Colors, Typography} from '../../../styles';
import {BackArrowIcon} from '../../../assets/svgs';

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

            {/* Detection Details Section */}
            <View style={styles.satelliteInfoCon}>
              <View style={styles.satelliteIcon}>
                <SatelliteIcon />
              </View>
              <View style={styles.satelliteInfo}>
                <Text style={styles.satelliteText}>
                  DETECTED BY {alert.detectedBy}
                </Text>
                <Text style={styles.eventDate}>
                  <Text style={styles.eventFromNow}>
                    {moment(alert.localEventDate || alert.eventDate)
                      ?.tz(alert.localTimeZone || 'UTC')
                      ?.fromNow()}
                  </Text>{' '}
                  (
                  {moment(alert.localEventDate || alert.eventDate)
                    ?.tz(alert.localTimeZone || 'UTC')
                    ?.format('DD MMM YYYY [at] HH:mm')}
                  )
                </Text>
                <Text style={styles.confidence}>
                  <Text style={styles.confidenceVal}>{alert.confidence}</Text>{' '}
                  alert confidence
                </Text>
              </View>
            </View>

            {/* Site Information Section */}
            <View
              style={[
                styles.alertLocInfoCon,
                {marginTop: 30, justifyContent: 'space-between'},
              ]}>
              <View style={styles.satelliteInfoLeft}>
                <View style={styles.satelliteIcon}>
                  <SiteIcon />
                </View>
                {alert.site?.project ? (
                  <View style={styles.satelliteInfo}>
                    <Text style={styles.satelliteLocText}>PROJECT</Text>
                    <Text style={styles.alertLocText}>
                      {alert.site.project.name}{' '}
                      <Text style={{fontSize: Typography.FONT_SIZE_12}}>
                        {alert.site.name}
                      </Text>
                    </Text>
                  </View>
                ) : (
                  <View style={styles.satelliteInfo}>
                    <Text style={styles.satelliteLocText}>SITE</Text>
                    <Text style={styles.alertLocText}>{alert.site?.name}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Location Section */}
            <View style={styles.separator} />
            <View
              style={[
                styles.alertLocInfoCon,
                {justifyContent: 'space-between'},
              ]}>
              <View style={styles.satelliteInfoLeft}>
                <View style={styles.satelliteIcon}>
                  <LocationPinIcon />
                </View>
                <View style={styles.satelliteInfo}>
                  <Text style={styles.satelliteLocText}>LOCATION</Text>
                  <Text style={styles.alertLocText}>
                    {Number.parseFloat(alert.latitude).toFixed(5)},{' '}
                    {Number.parseFloat(alert.longitude).toFixed(5)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  // Copy coordinates to clipboard
                  // This should be implemented with clipboard API
                }}>
                <CopyIcon />
              </TouchableOpacity>
            </View>

            {/* Search Radius Section */}
            <View style={styles.separator} />
            <View style={styles.alertRadiusInfoCon}>
              <View style={styles.satelliteIcon}>
                <RadarIcon />
              </View>
              <View style={styles.satelliteInfo}>
                <Text
                  style={[styles.alertLocText, {width: SCREEN_WIDTH / 1.3}]}>
                  Search for fire within a{' '}
                  <Text
                    style={[
                      styles.confidenceVal,
                      {textTransform: 'lowercase'},
                    ]}>
                    {alert.distance == 0 ? 1 : alert.distance} km
                  </Text>{' '}
                  radius around the location.
                </Text>
              </View>
            </View>

            {/* Actions Section */}
            <View style={styles.separator} />
            <TouchableOpacity
              onPress={() => {
                // Open in Google Maps
                // This should be implemented with Google Maps URL
              }}
              style={styles.simpleBtn}>
              <Text style={[styles.siteActionText, {marginLeft: 0}]}>
                Open in Google Maps
              </Text>
            </TouchableOpacity>
          </>
        )}
        {!incident &&
          alert?.siteIncidentId &&
          (console.log(
            `[incident] Incident data loading - alertId: ${alert.id}, siteIncidentId: ${alert.siteIncidentId}, isLoading: ${isIncidentLoading}, isError: ${isIncidentError}`,
          ),
          null)}

        <View style={styles.satelliteInfoCon}>
          <View style={styles.satelliteIcon}>
            <SatelliteIcon />
          </View>
          <View style={styles.satelliteInfo}>
            <Text style={styles.satelliteText}>
              DETECTED BY {alert.detectedBy}
            </Text>
            <Text style={styles.eventDate}>
              <Text style={styles.eventFromNow}>
                {moment(alert.localEventDate || alert.eventDate)
                  ?.tz(alert.localTimeZone || 'UTC')
                  ?.fromNow()}
              </Text>{' '}
              (
              {moment(alert.localEventDate || alert.eventDate)
                ?.tz(alert.localTimeZone || 'UTC')
                ?.format('DD MMM YYYY [at] HH:mm')}
              )
            </Text>
            <Text style={styles.confidence}>
              <Text style={styles.confidenceVal}>{alert.confidence}</Text> alert
              confidence
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.alertLocInfoCon,
            {marginTop: 30, justifyContent: 'space-between'},
          ]}>
          <View style={styles.satelliteInfoLeft}>
            <View style={styles.satelliteIcon}>
              <SiteIcon />
            </View>
            {alert.site?.project ? (
              <View style={styles.satelliteInfo}>
                <Text style={styles.satelliteLocText}>PROJECT</Text>
                <Text style={styles.alertLocText}>
                  {alert.site.project.name}{' '}
                  <Text style={{fontSize: Typography.FONT_SIZE_12}}>
                    {alert.site.name}
                  </Text>
                </Text>
              </View>
            ) : (
              <View style={styles.satelliteInfo}>
                <Text style={styles.satelliteLocText}>SITE</Text>
                <Text style={styles.alertLocText}>{alert.site?.name}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.separator} />
        <View
          style={[styles.alertLocInfoCon, {justifyContent: 'space-between'}]}>
          <View style={styles.satelliteInfoLeft}>
            <View style={styles.satelliteIcon}>
              <LocationPinIcon />
            </View>
            <View style={styles.satelliteInfo}>
              <Text style={styles.satelliteLocText}>LOCATION</Text>
              <Text style={styles.alertLocText}>
                {Number.parseFloat(alert.latitude).toFixed(5)},{' '}
                {Number.parseFloat(alert.longitude).toFixed(5)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              // Copy coordinates to clipboard
              // This should be implemented with the clipboard API
            }}>
            <CopyIcon />
          </TouchableOpacity>
        </View>
        <View style={styles.separator} />
        <View style={styles.alertRadiusInfoCon}>
          <View style={styles.satelliteIcon}>
            <RadarIcon />
          </View>
          <View style={styles.satelliteInfo}>
            <Text style={[styles.alertLocText, {width: SCREEN_WIDTH / 1.3}]}>
              Search for the fire within a{' '}
              <Text
                style={[styles.confidenceVal, {textTransform: 'lowercase'}]}>
                {alert.distance == 0 ? 1 : alert.distance} km
              </Text>{' '}
              radius around the location.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            // Open in Google Maps
            // This should be implemented with Google Maps URL
          }}
          style={styles.simpleBtn}>
          <Text style={[styles.siteActionText, {marginLeft: 0}]}>
            Open in Google Maps
          </Text>
        </TouchableOpacity>
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
