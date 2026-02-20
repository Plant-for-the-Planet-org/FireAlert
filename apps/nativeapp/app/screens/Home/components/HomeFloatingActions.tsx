/**
 * HomeFloatingActions Component
 *
 * Renders the floating action buttons on the Home screen:
 * - Profile avatar button (top)
 * - Layer selection button (middle)
 * - My location button (bottom)
 *
 * This is a presentational component that receives all data via props
 * and emits events via callback props.
 */

import React from 'react';
import {Image, TouchableOpacity} from 'react-native';
import {LayerIcon, MyLocIcon, UserPlaceholder} from '../../../assets/svgs';
import {actionStyles} from '../styles/actionStyles';
import type {HomeFloatingActionsProps} from '../types';

export const HomeFloatingActions: React.FC<HomeFloatingActionsProps> = ({
  onLayerPress,
  onMyLocationPress,
  onProfilePress,
  userDetails,
}) => {
  return (
    <>
      {/* Profile Avatar Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onProfilePress}
        style={[actionStyles.layerIcon, actionStyles.avatarContainer]}
        accessibilityLabel="profile"
        accessible={true}
        testID="profile_button">
        {userDetails?.data?.image ? (
          <Image
            source={{uri: userDetails.data.image}}
            style={actionStyles.userAvatar}
          />
        ) : (
          <UserPlaceholder width={44} height={44} />
        )}
      </TouchableOpacity>

      {/* Layer Selection Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onLayerPress}
        style={actionStyles.layerIcon}
        accessibilityLabel="layer"
        accessible={true}
        testID="layer_button">
        <LayerIcon width={45} height={45} />
      </TouchableOpacity>

      {/* My Location Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onMyLocationPress}
        style={actionStyles.myLocationIcon}
        accessibilityLabel="my_location"
        accessible={true}
        testID="my_location_button">
        <MyLocIcon width={45} height={45} />
      </TouchableOpacity>
    </>
  );
};
