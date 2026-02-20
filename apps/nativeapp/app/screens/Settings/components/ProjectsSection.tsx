/**
 * ProjectsSection Component
 *
 * Renders list of Plant-for-the-Planet projects with their associated sites.
 * This is a presentational component that receives all data and handlers via props.
 *
 * @module Settings/components/ProjectsSection
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
import {DropdownArrow} from '../../../assets/svgs';
import type {ProjectsSectionProps} from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * ProjectsSection Component
 *
 * Displays grouped Plant-for-the-Planet projects with their associated sites.
 * Each project shows its name and site count, with individual site rows
 * that support monitoring toggle and radius selection.
 *
 * @param {ProjectsSectionProps} props - Component props
 * @returns {JSX.Element | null} Rendered component or null if no projects
 *
 * @example
 * ```tsx
 * <ProjectsSection
 *   projects={groupedProjects}
 *   onSitePress={(site) => handleSitePress(site)}
 *   onToggleMonitoring={(siteId, enabled) => handleToggle(siteId, enabled)}
 *   isLoading={false}
 * />
 * ```
 */
export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  projects,
  onSitePress,
  onToggleMonitoring,
  isLoading,
}) => {
  // Don't render if no projects
  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.mainHeading}>My Projects</Text>
      {projects.map((project, projectIndex) => (
        <View
          key={`project_${project.projectId}_${projectIndex}`}
          style={styles.projectCard}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectName} numberOfLines={2}>
              {project.projectName}
            </Text>
          </View>

          {project.sites && project.sites.length > 0 && (
            <View style={styles.sitesContainer}>
              {project.sites.map((site, siteIndex) => (
                <View key={`site_${site.id}_${siteIndex}`}>
                  <TouchableOpacity
                    disabled={isLoading}
                    onPress={() => onSitePress(site)}
                    style={styles.siteRow}>
                    <Text style={styles.siteName} numberOfLines={2}>
                      {site.name}
                    </Text>
                    <View style={styles.siteActions}>
                      <View style={styles.radiusContainer}>
                        <Text style={styles.radiusText}>
                          {site.radius ? `within ${site.radius} km` : 'inside'}
                        </Text>
                        <DropdownArrow />
                      </View>
                      {isLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={Colors.PRIMARY}
                        />
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
                  {siteIndex < project.sites.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  mainHeading: {
    fontSize: Typography.FONT_SIZE_20,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    marginBottom: 8,
  },
  projectCard: {
    marginTop: 24,
    borderRadius: 12,
    paddingTop: 20,
    paddingHorizontal: 16,
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
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectName: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
    width: SCREEN_WIDTH / 1.3,
  },
  sitesContainer: {
    marginTop: 16,
  },
  siteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  siteName: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
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
    marginRight: 5,
  },
  radiusText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.GRADIENT_PRIMARY,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.GRAY_LIGHT,
    marginVertical: 8,
  },
});
