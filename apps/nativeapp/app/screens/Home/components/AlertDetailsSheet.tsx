/**
 * AlertDetailsSheet Component
 * Displays fire alert information in a bottom sheet modal
 * Shows confidence, detection time, location, site name, and incident summary
 */

import React, {useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import moment from 'moment-timezone';
import Toast from 'react-native-toast-notifications';
import {
  CopyIcon,
  LocationPinIcon,
  RadarIcon,
  SatelliteIcon,
  SiteIcon,
} from '../../../assets/svgs';
import {BottomSheet} from '../../../components';
import {IncidentSummaryCard} from '../../../components/Incident/IncidentSummaryCard';
import {Colors, Typography} from '../../../styles';
import type {AlertDetailsSheetProps} from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * AlertDetailsSheet Component
 * Renders a bottom sheet with detailed fire alert information
 *
 * @param props - Component props
 * @param props.visible - Whether the sheet is visible
 * @param props.onClose - Callback when sheet is closed
 * @param props.alertData - Alert data to display
 * @param props.incident - Incident data (optional, for incident summary)
 * @param props.onOpenInMaps - Callback to open location in Google Maps
 * @returns JSX element
 */
export function AlertDetailsSheet(
  props: AlertDetailsSheetProps & {incident?: any},
): React.ReactElement | null {
  const {visible, onClose, alertData, incident, onOpenInMaps} = props;
  const modalToast = useRef<Toast | null>(null);

  // Don't render if no alert data
  if (!alertData) {
    return null;
  }

  /**
   * Copies location coordinates to clipboard
   */
  const handleCopyLocation = () => {
    // Note: Clipboard functionality is commented out in original implementation
    // Clipboard.setString(JSON.stringify([alertData.latitude, alertData.longitude]));
    if (modalToast.current) {
      modalToast.current.show('copied');
    }
  };

  return (
    <BottomSheet
      isVisible={visible}
      onBackdropPress={onClose}
      backdropColor="transparent">
      <Toast ref={modalToast} offsetBottom={100} duration={2000} />
      <View style={[styles.modalContainer, styles.commonPadding]}>
        <View style={styles.modalHeader} />

        {/* Incident Summary Card - shown when incident data is available */}
        {incident && (
          <IncidentSummaryCard
            isActive={incident.isActive}
            startAlert={incident.startSiteAlert}
            latestAlert={incident.latestSiteAlert}
            allAlerts={incident.siteAlerts}
            incidentId={incident.id}
          />
        )}

        {/* Satellite Detection Information */}
        <View style={styles.satelliteInfoCon}>
          <View style={styles.satelliteIcon}>
            <SatelliteIcon />
          </View>
          <View style={styles.satelliteInfo}>
            <Text style={styles.satelliteText}>
              DETECTED BY {alertData.detectedBy}
            </Text>
            <Text style={styles.eventDate}>
              <Text style={styles.eventFromNow}>
                {moment(alertData.localEventDate)
                  ?.tz(alertData.localTimeZone)
                  ?.fromNow()}
              </Text>{' '}
              (
              {moment(alertData.localEventDate)
                ?.tz(alertData.localTimeZone)
                ?.format('DD MMM YYYY [at] HH:mm')}
              )
            </Text>
            <Text style={styles.confidence}>
              <Text style={styles.confidenceVal}>{alertData.confidence}</Text>{' '}
              alert confidence
            </Text>
          </View>
        </View>

        {/* Site/Project Information */}
        <View
          style={[
            styles.alertLocInfoCon,
            {marginTop: 30, justifyContent: 'space-between'},
          ]}>
          <View style={styles.satelliteInfoLeft}>
            <View style={styles.satelliteIcon}>
              <SiteIcon />
            </View>
            {alertData.site?.project ? (
              <View style={styles.satelliteInfo}>
                <Text style={styles.satelliteLocText}>PROJECT</Text>
                <Text style={styles.alertLocText}>
                  {alertData.site.project.name}{' '}
                  <Text style={{fontSize: Typography.FONT_SIZE_12}}>
                    {alertData.site.name}
                  </Text>
                </Text>
              </View>
            ) : (
              <View style={styles.satelliteInfo}>
                <Text style={styles.satelliteLocText}>SITE</Text>
                <Text style={styles.alertLocText}>{alertData.site?.name}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.separator} />

        {/* Location Information */}
        <View
          style={[styles.alertLocInfoCon, {justifyContent: 'space-between'}]}>
          <View style={styles.satelliteInfoLeft}>
            <View style={styles.satelliteIcon}>
              <LocationPinIcon />
            </View>
            <View style={styles.satelliteInfo}>
              <Text style={styles.satelliteLocText}>LOCATION</Text>
              <Text style={styles.alertLocText}>
                {Number.parseFloat(String(alertData.latitude)).toFixed(5)},{' '}
                {Number.parseFloat(String(alertData.longitude)).toFixed(5)}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleCopyLocation}>
            <CopyIcon />
          </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        {/* Search Radius Information */}
        <View style={styles.alertRadiusInfoCon}>
          <View style={styles.satelliteIcon}>
            <RadarIcon />
          </View>
          <View style={styles.satelliteInfo}>
            <Text style={[styles.alertLocText, {width: SCREEN_WIDTH / 1.3}]}>
              Search for the fire within a{' '}
              <Text
                style={[styles.confidenceVal, {textTransform: 'lowercase'}]}>
                {alertData.distance === 0 ? 1 : alertData.distance} km
              </Text>{' '}
              radius around the location.
            </Text>
          </View>
        </View>

        {/* Open in Google Maps Button */}
        <TouchableOpacity onPress={onOpenInMaps} style={styles.simpleBtn}>
          <Text style={[styles.siteActionText, {marginLeft: 0}]}>
            Open in Google Maps
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    bottom: 0,
    borderRadius: 15,
    paddingBottom: 30,
    width: SCREEN_WIDTH,
    backgroundColor: Colors.WHITE,
  },
  modalHeader: {
    width: 46,
    height: 8,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 5,
    alignSelf: 'center',
    backgroundColor: Colors.GRAY_MEDIUM,
  },
  commonPadding: {
    paddingHorizontal: 16,
  },
  satelliteInfoCon: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.GRADIENT_PRIMARY + '10',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 12,
  },
  alertLocInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertRadiusInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  satelliteInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  satelliteIcon: {
    // Icon container
  },
  satelliteInfo: {
    marginLeft: 10,
  },
  satelliteText: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_10,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  satelliteLocText: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_8,
    fontFamily: Typography.FONT_FAMILY_BOLD,
  },
  eventFromNow: {
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  eventDate: {
    marginVertical: 5,
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  alertLocText: {
    marginVertical: 2,
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  confidence: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  confidenceVal: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    textTransform: 'capitalize',
  },
  separator: {
    height: 0.4,
    marginVertical: 16,
    backgroundColor: '#BDBDBD',
  },
  simpleBtn: {
    height: 56,
    marginTop: 22,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.GRADIENT_PRIMARY,
  },
  siteActionText: {
    marginLeft: 30,
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
});
