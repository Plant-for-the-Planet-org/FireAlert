/**
 * SiteDetailsSheet Component
 * Displays site information in a bottom sheet modal with management actions
 * Shows site name, project info, and provides monitoring toggle, edit, and delete buttons
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import {
  DisabledTrashOutlineIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  TrashOutlineIcon,
} from '../../../assets/svgs';
import {BottomSheet} from '../../../components';
import {Colors, Typography} from '../../../styles';
import type {SiteDetailsSheetProps} from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * SiteDetailsSheet Component
 * Renders a bottom sheet with site details and management actions
 *
 * @param props - Component props
 * @param props.visible - Whether the sheet is visible
 * @param props.onClose - Callback when sheet is closed
 * @param props.siteData - Site data to display (contains site object with nested properties)
 * @param props.onToggleMonitoring - Callback to toggle site monitoring
 * @param props.onEditSite - Callback to edit site
 * @param props.onDeleteSite - Callback to delete site
 * @param props.isDeleting - Whether delete operation is in progress
 * @param props.isUpdating - Whether update operation is in progress
 * @returns JSX element
 */
export function SiteDetailsSheet(
  props: SiteDetailsSheetProps & {isUpdating?: boolean},
): React.ReactElement | null {
  const {
    visible,
    onClose,
    siteData,
    onToggleMonitoring,
    onEditSite,
    onDeleteSite,
    isDeleting,
    isUpdating,
  } = props;

  // Don't render if no site data
  if (!siteData) {
    return null;
  }

  // Extract site properties - handle both direct properties and nested site object
  const site = (siteData as any)?.site || siteData;
  const hasProject = !!site?.project?.id;
  const isSiteRelation = !!site?.siteRelationId;
  const isMonitored = isSiteRelation ? site?.isActive : site?.isMonitored;
  const isPlanetRO = hasProject; // Planet RO sites have project IDs

  // Determine if delete button should be disabled
  const deleteSiteButtonIsDisabled = isPlanetRO || isDeleting;

  return (
    <BottomSheet
      isVisible={visible}
      onBackdropPress={onClose}
      backdropColor="transparent">
      <View style={[styles.modalContainer, styles.commonPadding]}>
        <View style={styles.modalHeader} />

        {/* Site Title and Edit Button */}
        <View style={styles.siteTitleCon}>
          <View>
            {/* Project Name (if exists) */}
            {hasProject && (
              <Text style={styles.projectsName}>
                {site.project.name || site.project.id}
              </Text>
            )}
            {/* Site Name */}
            <Text style={styles.siteTitle}>{site.name || site.id}</Text>
          </View>

          {/* Edit Button - hidden for site relations (protected sites) */}
          {!isSiteRelation && (
            <TouchableOpacity onPress={onEditSite}>
              <PencilIcon />
            </TouchableOpacity>
          )}
        </View>

        {/* Toggle Monitoring Button */}
        <TouchableOpacity
          disabled={isUpdating}
          onPress={() => onToggleMonitoring(!isMonitored)}
          style={styles.simpleBtn}>
          {isUpdating ? (
            <ActivityIndicator color={Colors.PRIMARY} />
          ) : (
            <>
              {isMonitored ? <EyeOffIcon /> : <EyeIcon />}
              <Text style={styles.siteActionText}>
                {isMonitored ? 'Disable Monitoring' : 'Enable Monitoring'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete Site Button */}
        <TouchableOpacity
          disabled={deleteSiteButtonIsDisabled}
          onPress={onDeleteSite}
          style={[
            styles.simpleBtn,
            deleteSiteButtonIsDisabled && styles.simpleBtnDisabled,
            isPlanetRO && {borderColor: Colors.GRAY_LIGHTEST},
          ]}>
          {isDeleting ? (
            <ActivityIndicator color={Colors.PRIMARY} />
          ) : (
            <>
              {isPlanetRO ? <DisabledTrashOutlineIcon /> : <TrashOutlineIcon />}
              <Text
                style={[
                  styles.siteActionText,
                  isPlanetRO && {color: Colors.GRAY_LIGHTEST},
                ]}>
                Delete Site
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Planet RO Site Info Message */}
        {isPlanetRO && (
          <Text style={styles.projectSyncInfo}>
            This site is synced from pp.eco. To make changes, please visit the
            Plant-for-the-Planet Platform.
          </Text>
        )}
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
  siteTitleCon: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  siteTitle: {
    fontSize: Typography.FONT_SIZE_24,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    width: SCREEN_WIDTH / 1.3,
  },
  projectsName: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
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
  simpleBtnDisabled: {
    opacity: 0.5,
  },
  siteActionText: {
    marginLeft: 30,
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  projectSyncInfo: {
    fontSize: 12,
    marginTop: 16,
    color: Colors.TEXT_COLOR,
    fontFamily: Typography.FONT_FAMILY_ITALIC,
    paddingHorizontal: 10,
  },
});
