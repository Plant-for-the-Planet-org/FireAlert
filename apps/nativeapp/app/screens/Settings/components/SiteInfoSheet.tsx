import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {BottomSheet} from '../../../components';
import {
  PencilIcon,
  MapOutlineIcon,
  TrashOutlineIcon,
  DisabledTrashOutlineIcon,
} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SiteInfo {
  id: string;
  name: string;
  project?: {
    id: string;
    name: string;
  } | null;
}

interface SiteInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  siteInfo: SiteInfo | null;
  onEditSite: () => void;
  onDeleteSite: () => void;
  onViewOnMap: () => void;
  isDeleting?: boolean;
}

export const SiteInfoSheet: React.FC<SiteInfoSheetProps> = ({
  visible,
  onClose,
  siteInfo,
  onEditSite,
  onDeleteSite,
  onViewOnMap,
  isDeleting = false,
}) => {
  if (!siteInfo) return null;

  const isProjectSite = !!siteInfo.project?.id;
  const deleteButtonDisabled = isDeleting || isProjectSite;

  return (
    <BottomSheet
      isVisible={visible}
      backdropColor={Colors.BLACK + '80'}
      onBackdropPress={onClose}>
      <View style={[styles.modalContainer, styles.commonPadding]}>
        <View style={styles.modalHeader} />
        <View style={styles.siteTitleCon}>
          <View>
            {siteInfo.project && (
              <Text style={styles.projectsName}>
                {siteInfo.project.name || siteInfo.project.id}
              </Text>
            )}
            <Text style={styles.siteTitle}>{siteInfo.name || siteInfo.id}</Text>
          </View>
          {!isProjectSite && (
            <TouchableOpacity onPress={onEditSite}>
              <PencilIcon />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={onViewOnMap} style={styles.btn}>
          <MapOutlineIcon />
          <Text style={styles.siteActionText}>View on Map</Text>
        </TouchableOpacity>
        {!isProjectSite && (
          <TouchableOpacity
            disabled={deleteButtonDisabled}
            onPress={onDeleteSite}
            style={[
              styles.btn,
              deleteButtonDisabled && styles.btnDisabled,
              isProjectSite && styles.borderColorGrayLightest,
            ]}>
            {isDeleting ? (
              <ActivityIndicator color={Colors.PRIMARY} />
            ) : (
              <>
                {isProjectSite ? (
                  <DisabledTrashOutlineIcon />
                ) : (
                  <TrashOutlineIcon />
                )}
                <Text
                  style={[
                    styles.siteActionText,
                    isProjectSite && styles.colorGrayLightest,
                  ]}>
                  Delete Site
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {isProjectSite && (
          <Text style={styles.projectSyncInfo}>
            This site is synced from pp.eco. To make changes, please visit the
            Plant-for-the-Planet Platform.
          </Text>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    bottom: 0,
    borderRadius: 15,
    width: SCREEN_WIDTH,
    position: 'absolute',
    paddingBottom: 40,
    backgroundColor: Colors.WHITE,
  },
  modalHeader: {
    width: 46,
    height: 8,
    marginTop: 13,
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
  projectsName: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.PLANET_DARK_GRAY,
    marginBottom: 4,
  },
  siteTitle: {
    fontSize: Typography.FONT_SIZE_24,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    width: SCREEN_WIDTH / 1.3,
  },
  btn: {
    height: 56,
    marginTop: 22,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.GRADIENT_PRIMARY,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  siteActionText: {
    marginLeft: 30,
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  borderColorGrayLightest: {
    borderColor: Colors.GRAY_LIGHTEST,
  },
  colorGrayLightest: {
    color: Colors.GRAY_LIGHTEST,
  },
  projectSyncInfo: {
    fontSize: 12,
    marginTop: 16,
    color: Colors.TEXT_COLOR,
    fontFamily: Typography.FONT_FAMILY_ITALIC,
    paddingHorizontal: 10,
  },
});
