/**
 * MySitesSection Component
 *
 * Renders list of user-created sites (not associated with projects) with add site button.
 * This is a presentational component that receives all data and handlers via props.
 *
 * @module Settings/components/MySitesSection
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {Switch} from '../../../components';
import {Colors, Typography} from '../../../styles';
import {DropdownArrow, AddIcon, LocationWave} from '../../../assets/svgs';
import {RADIUS_ARR} from '../../../constants';
import type {MySitesSectionProps} from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * MySitesSection Component
 *
 * Displays user-created sites (not associated with projects) with add site button.
 * Shows empty state with call-to-action when no sites exist.
 * Each site row supports monitoring toggle and radius selection.
 *
 * @param {MySitesSectionProps} props - Component props
 * @returns {JSX.Element} Rendered component
 *
 * @example
 * ```tsx
 * <MySitesSection
 *   sites={mySites}
 *   onSitePress={(site) => handleSitePress(site)}
 *   onAddSite={() => handleAddSite()}
 *   onToggleMonitoring={(siteId, enabled) => handleToggle(siteId, enabled)}
 *   onEditSite={(site) => handleEdit(site)}
 *   onDeleteSite={(siteId) => handleDelete(siteId)}
 *   isLoading={false}
 * />
 * ```
 */
export const MySitesSection: React.FC<MySitesSectionProps> = ({
  sites,
  onSitePress,
  onAddSite,
  onToggleMonitoring,
  isLoading,
}) => {
  // Filter sites that are not associated with projects
  const mySites = sites.filter(site => site.project === null);

  /**
   * Get display text for site radius
   * Matches the format from RADIUS_ARR constant
   */
  const getRadiusDisplayText = (radius: number): string => {
    const radiusOption = RADIUS_ARR.find(option => option.value === radius);
    return radiusOption?.name || `${radius} km`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainHeading}>My Sites</Text>
      </View>

      {mySites.length > 0 ? (
        <>
          {mySites.map((site, index) => (
            <TouchableOpacity
              key={`mySite_${site.id}_${index}`}
              disabled={isLoading}
              onPress={() => onSitePress(site)}
              style={styles.siteCard}>
              <Text style={styles.siteName} numberOfLines={2}>
                {site.name || site.id}
              </Text>
              <View style={styles.siteActions}>
                <View style={styles.radiusContainer}>
                  <Text style={styles.radiusText}>
                    {getRadiusDisplayText(site.radius)}
                  </Text>
                  <DropdownArrow />
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.PRIMARY} />
                ) : (
                  <Switch
                    value={!site.stopAlerts}
                    onValueChange={async (val: boolean) => {
                      await onToggleMonitoring(site.id, val);
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <View style={[styles.siteCard, styles.emptyStateCard]}>
          <View>
            <Text style={styles.emptyStateText}>
              Create Your Own{'\n'}Fire Alert Site{'\n'}
              <Text style={styles.emptyStateSubtext}>
                and Receive Notifications
              </Text>
            </Text>
            <TouchableOpacity
              onPress={onAddSite}
              activeOpacity={0.7}
              style={styles.addSiteButton}>
              <AddIcon width={11} height={11} color={Colors.WHITE} />
              <Text style={[styles.emptyStateText, styles.buttonText]}>
                Add Site
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.illustrationContainer}>
            <LocationWave />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainHeading: {
    fontSize: Typography.FONT_SIZE_20,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  siteCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  siteName: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.PLANET_DARK_GRAY,
    paddingVertical: 5,
    width: SCREEN_WIDTH / 2.5,
  },
  siteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.GRADIENT_PRIMARY,
  },
  emptyStateCard: {
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 12,
    color: Colors.PLANET_DARK_GRAY,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    paddingHorizontal: 10,
  },
  emptyStateSubtext: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  addSiteButton: {
    backgroundColor: Colors.GRADIENT_PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: 92,
    borderRadius: 8,
    marginTop: 12,
    marginLeft: 10,
  },
  buttonText: {
    color: Colors.WHITE,
  },
  illustrationContainer: {
    position: 'absolute',
    right: 5,
  },
});
