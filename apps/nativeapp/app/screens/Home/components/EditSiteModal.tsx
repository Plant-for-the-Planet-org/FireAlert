/**
 * EditSiteModal Component
 * Modal for editing site name and radius
 * Validates site name (min 5 characters) and allows radius selection
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-notifications';
import {CrossIcon} from '../../../assets/svgs';
import {CustomButton, DropDown, FloatingInput} from '../../../components';
import {POINT_RADIUS_ARR, RADIUS_ARR} from '../../../constants';
import {Colors} from '../../../styles';
import {modalStyles} from '../styles/modalStyles';
import {sharedStyles} from '../styles/sharedStyles';
import type {EditSiteModalProps} from '../types';

/**
 * EditSiteModal - Modal for editing site name and radius
 *
 * @param props.visible - Whether the modal is visible
 * @param props.onClose - Callback to close the modal
 * @param props.siteId - ID of the site being edited
 * @param props.siteName - Current site name
 * @param props.siteRadius - Current site radius value
 * @param props.siteGeometry - Site geometry type (Point, Polygon, MultiPolygon)
 * @param props.isPlanetROSite - Whether site is from Planet RO (name editing disabled)
 * @param props.onSave - Callback to save changes with name and radius
 * @param props.isLoading - Whether save operation is in progress
 */
export const EditSiteModal: React.FC<EditSiteModalProps> = ({
  visible,
  onClose,
  siteId,
  siteName,
  siteRadius,
  siteGeometry,
  isPlanetROSite,
  onSave,
  isLoading,
}) => {
  const [localSiteName, setLocalSiteName] = useState<string>('');
  const [localSiteRadius, setLocalSiteRadius] = useState<{
    label: string;
    value: number;
  } | null>(null);
  const toastRef = useRef<any>(null);

  // Initialize local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalSiteName(siteName);
      // Find the radius object from the appropriate array
      const radiusArray =
        siteGeometry === 'Point' ? POINT_RADIUS_ARR : RADIUS_ARR;
      const radiusObj = radiusArray.find(el => el.value === siteRadius);
      setLocalSiteRadius(radiusObj || radiusArray[4]); // Default to index 4 if not found
    }
  }, [visible, siteName, siteRadius, siteGeometry]);

  const handleSave = async () => {
    // Validate site name length
    if (localSiteName.length < 5) {
      toastRef.current?.show('Site name must be at least 5 characters long.', {
        type: 'warning',
      });
      return;
    }

    // Call onSave with validated values
    if (localSiteRadius) {
      await onSave(localSiteName, localSiteRadius.value);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
        style={modalStyles.siteModalStyle}>
        <Toast ref={toastRef} offsetBottom={100} duration={2000} />

        {/* Close Button */}
        <TouchableOpacity onPress={onClose} style={modalStyles.crossContainer}>
          <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
        </TouchableOpacity>

        {/* Heading */}
        <Text style={[modalStyles.heading, {paddingHorizontal: 16}]}>
          Enter Site Name
        </Text>

        {/* Content Container */}
        <View
          style={[
            modalStyles.siteModalStyle,
            {justifyContent: 'space-between'},
          ]}>
          <View>
            {/* Site Name Input */}
            <FloatingInput
              autoFocus
              isFloat={false}
              value={localSiteName}
              editable={!isPlanetROSite}
              onChangeText={setLocalSiteName}
            />

            {/* Radius Dropdown */}
            <View style={sharedStyles.commonPadding}>
              <DropDown
                expandHeight={10}
                items={siteGeometry === 'Point' ? POINT_RADIUS_ARR : RADIUS_ARR}
                value={localSiteRadius?.value}
                onSelectItem={setLocalSiteRadius}
                defaultValue={localSiteRadius?.value}
                label="Notify me if fires occur..."
              />
            </View>
          </View>

          {/* Continue Button */}
          <CustomButton
            title="Continue"
            titleStyle={modalStyles.title}
            onPress={handleSave}
            isLoading={isLoading}
            style={modalStyles.btnContinueSiteModal}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
