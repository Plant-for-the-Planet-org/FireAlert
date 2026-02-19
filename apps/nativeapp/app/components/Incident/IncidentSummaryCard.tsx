/**
 * IncidentSummaryCard Component
 * Displays incident summary information including timeline and statistics
 */

import React, {useMemo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {Linking} from 'react-native';
import moment from 'moment-timezone';
import {
  OrangeFireIcon,
  IncidentActiveIcon,
  IncidentInactiveIcon,
  CalendarActiveIcon,
  CalendarInactiveIcon,
  ClockActiveIcon,
  ClockInactiveIcon,
  IncidentAreaActiveIcon,
  IncidentAreaInactiveIcon,
  BlackFireIcon,
} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';
import {calculateIncidentArea} from '../../utils/incident/incidentCircleUtils';
import {Config} from '../../../config';
import type {IncidentSummaryCardProps} from '../../types/incident';

/**
 * Formats a date to "DD MMM YYYY" format
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  return moment(date).format('DD MMM YYYY');
}

/**
 * Formats a time to "HH:mm AM/PM" format
 * @param date - Date to format
 * @returns Formatted time string
 */
function formatTime(date: Date): string {
  return moment(date).format('HH:mm A');
}

/**
 * IncidentSummaryCard Component
 * Displays a summary of fire incident including:
 * - Header with incident icon and status badge
 * - Timeline showing start and end/latest times
 * - Statistics showing total fires and area affected
 *
 * @param props - Component props
 * @returns JSX element
 */
export interface IncidentSummaryCardProps {
  isActive: boolean;
  startAlert: SiteAlertData;
  latestAlert: SiteAlertData;
  allAlerts: SiteAlertData[];
  incidentId?: string;
}

export function IncidentSummaryCard(
  props: IncidentSummaryCardProps,
): React.ReactElement {
  const {isActive, startAlert, latestAlert, allAlerts, incidentId} = props;

  // Calculate incident metrics
  const totalFires = allAlerts.length;
  const areaAffected = useMemo(() => {
    return calculateIncidentArea(
      allAlerts.map(a => ({latitude: a.latitude, longitude: a.longitude})),
      2,
    );
  }, [allAlerts]);

  // Determine colors based on active status
  const backgroundColor = isActive ? Colors.FIRE_ORANGE : Colors.FIRE_GRAY;
  const badgeColor = isActive ? Colors.FIRE_ORANGE : Colors.PLANET_DARK_GRAY;
  const badgeText = isActive ? 'Active' : 'Resolved';

  // Handle opening incident URL in browser
  const handleOpenIncidentUrl = async () => {
    if (!incidentId) {
      Alert.alert('Error', 'Incident ID not available');
      return;
    }

    const url = `${Config.APP_URL}/incident/${incidentId}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open the incident URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open the incident URL');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: `${backgroundColor}40`}, // 25% opacity
      ]}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.iconWrapper}>
            {isActive ? (
              <IncidentActiveIcon width={24} height={24} />
            ) : (
              <IncidentInactiveIcon width={24} height={24} />
            )}
          </View>
          <Text style={styles.title}>Fire Incident Summary</Text>
        </View>
        <View style={[styles.badge, {backgroundColor: badgeColor}]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      </View>

      {/* Timeline Section */}
      <View style={styles.timelineContainer}>
        {/* Started At */}
        <View style={styles.timelineColumn}>
          <Text style={styles.timelineLabel}>Started at</Text>
          <View style={styles.timelineContent}>
            <View style={styles.timelineItem}>
              {isActive ? (
                <CalendarActiveIcon width={16} height={16} />
              ) : (
                <CalendarInactiveIcon width={16} height={16} />
              )}
              <Text style={styles.timelineText}>
                {formatDate(startAlert.eventDate)}
              </Text>
            </View>
            <View style={styles.timelineItem}>
              {isActive ? (
                <ClockActiveIcon width={16} height={16} />
              ) : (
                <ClockInactiveIcon width={16} height={16} />
              )}
              <Text style={styles.timelineText}>
                {formatTime(startAlert.eventDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Latest/Ended At */}
        <View style={styles.timelineColumn}>
          <Text style={styles.timelineLabel}>
            {isActive ? 'Latest at' : 'Ended at'}
          </Text>
          <View style={styles.timelineContent}>
            <View style={styles.timelineItem}>
              {isActive ? (
                <CalendarActiveIcon width={16} height={16} />
              ) : (
                <CalendarInactiveIcon width={16} height={16} />
              )}
              <Text style={styles.timelineText}>
                {formatDate(latestAlert.eventDate)}
              </Text>
            </View>
            <View style={styles.timelineItem}>
              {isActive ? (
                <ClockActiveIcon width={16} height={16} />
              ) : (
                <ClockInactiveIcon width={16} height={16} />
              )}
              <Text style={styles.timelineText}>
                {formatTime(latestAlert.eventDate)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Statistics Section */}
      <View style={styles.statisticsContainer}>
        {/* Total Fires */}
        <View style={styles.statisticCard}>
          <View style={styles.statisticIconWrapper}>
            {isActive ? (
              <OrangeFireIcon width={20} height={20} />
            ) : (
              <BlackFireIcon width={20} height={20} />
            )}
          </View>
          <View style={styles.statisticContent}>
            <Text style={styles.statisticLabel}>Total Fires</Text>
            <Text style={styles.statisticValue}>{totalFires}</Text>
          </View>
        </View>

        {/* Area Affected */}
        <View style={styles.statisticCard}>
          <View style={styles.statisticIconWrapper}>
            {isActive ? (
              <IncidentAreaActiveIcon width={16} height={16} />
            ) : (
              <IncidentAreaInactiveIcon width={16} height={16} />
            )}
          </View>
          <View style={styles.statisticContent}>
            <Text style={styles.statisticLabel}>Area Affected</Text>
            <Text style={styles.statisticValue}>
              {areaAffected.toFixed(2)} km²
            </Text>
          </View>
        </View>
      </View>

      {/* View Incident Link */}
      <TouchableOpacity
        style={styles.linkButton}
        onPress={handleOpenIncidentUrl}
        disabled={!incidentId}>
        <Text style={styles.linkButtonText}>View Incident Details</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: '600',
    color: Colors.PLANET_DARK_GRAY,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: Typography.FONT_SIZE_12,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  timelineContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  timelineColumn: {
    flex: 1,
    paddingLeft: 12,
  },
  timelineLabel: {
    fontSize: Typography.FONT_SIZE_12,
    color: `${Colors.PLANET_DARK_GRAY}99`, // 60% opacity
    marginBottom: 12,
  },
  timelineContent: {
    gap: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineIcon: {
    fontSize: 16,
    width: 16,
    height: 16,
    textAlign: 'center',
  },
  timelineText: {
    fontSize: Typography.FONT_SIZE_14,
    color: Colors.PLANET_DARK_GRAY,
  },
  statisticsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statisticCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: `${Colors.WHITE}40`, // 25% opacity
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  statisticIconWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statisticContent: {
    flex: 1,
  },
  statisticLabel: {
    fontSize: Typography.FONT_SIZE_12,
    color: `${Colors.PLANET_DARK_GRAY}B3`, // 70% opacity
    marginBottom: 2,
  },
  statisticValue: {
    fontSize: Typography.FONT_SIZE_14,
    fontWeight: '700',
    color: Colors.PLANET_DARK_GRAY,
  },
  linkButton: {
    marginTop: 16,
    backgroundColor: Colors.FIRE_ORANGE,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: Typography.FONT_SIZE_14,
    fontWeight: '600',
    color: Colors.WHITE,
  },
});
