import React from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import {
  GreenMapOutline,
  LogoutIcon,
  PencilRoundIcon,
  TrashSolidIcon,
  UserPlaceholder,
} from '../../../assets/svgs';
import {BottomSheet} from '../../../components';
import {WEB_URLS} from '../../../constants';
import handleLink from '../../../utils/browserLinking';
import type {ProfileSheetProps} from '../types';
import {actionStyles} from '../styles/actionStyles';
import {modalStyles} from '../styles/modalStyles';
import {sharedStyles} from '../styles/sharedStyles';

/**
 * ProfileSheet component
 * Displays user profile information in a bottom sheet with action buttons
 * for editing profile, opening platform, logging out, and deleting account
 */
export const ProfileSheet: React.FC<ProfileSheetProps> = ({
  visible,
  onClose,
  userDetails,
  onEditProfile,
  onLogout,
  onDeleteAccount,
}) => {
  const handleOpenPlatform = () => handleLink(WEB_URLS.PP_ECO, 0, 0);

  return (
    <BottomSheet isVisible={visible} onBackdropPress={onClose}>
      <View style={[modalStyles.modalContainer, sharedStyles.commonPadding]}>
        <View style={modalStyles.modalHeader} />
        <View style={modalStyles.siteTitleCon}>
          <View style={modalStyles.profileHeader}>
            {userDetails?.data?.image ? (
              <Image
                source={{
                  uri: userDetails?.data?.image,
                }}
                style={[actionStyles.userAvatar, {width: 82, height: 82}]}
              />
            ) : (
              <UserPlaceholder width={82} height={82} />
            )}
            <View style={modalStyles.profileInfo}>
              <Text style={sharedStyles.lightText}>Name</Text>
              <Text style={modalStyles.pfName}>
                {userDetails?.data?.name || 'Anonymous Firefighter'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onEditProfile}>
            <PencilRoundIcon />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={handleOpenPlatform}
          style={modalStyles.platFormBtn}>
          <GreenMapOutline />
          <Text style={modalStyles.siteActionPfText}>Open Platform</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout} style={modalStyles.btn}>
          <LogoutIcon />
          <Text style={modalStyles.siteActionPfText}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDeleteAccount}
          style={[modalStyles.btn, {marginBottom: 16}]}>
          <TrashSolidIcon width={20} height={20} />
          <Text style={modalStyles.siteActionPfText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};
