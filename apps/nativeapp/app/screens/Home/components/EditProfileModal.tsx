/**
 * EditProfileModal Component
 * Modal for editing user profile name
 * Validates profile name and handles save operation
 */

import React, {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {CrossIcon} from '../../../assets/svgs';
import {CustomButton, FloatingInput} from '../../../components';
import {Colors} from '../../../styles';
import {modalStyles} from '../styles/modalStyles';
import type {EditProfileModalProps} from '../types';

/**
 * EditProfileModal - Modal for editing user profile name
 *
 * @param props.visible - Whether the modal is visible
 * @param props.onClose - Callback to close the modal
 * @param props.userName - Current user name
 * @param props.onSave - Callback to save changes with new name
 * @param props.isLoading - Whether save operation is in progress
 */
export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  userName,
  onSave,
  isLoading,
}) => {
  const [localUserName, setLocalUserName] = useState<string>('');

  // Initialize local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalUserName(userName);
    }
  }, [visible, userName]);

  const handleSave = async () => {
    // Call onSave with trimmed name
    await onSave(localUserName.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
        style={modalStyles.siteModalStyle}>
        {/* Close Button */}
        <TouchableOpacity onPress={onClose} style={modalStyles.crossContainer}>
          <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
        </TouchableOpacity>

        {/* Heading */}
        <Text style={[modalStyles.heading, {paddingHorizontal: 16}]}>
          Edit Your Name
        </Text>

        {/* Content Container */}
        <View
          style={[
            modalStyles.siteModalStyle,
            {justifyContent: 'space-between'},
          ]}>
          {/* Profile Name Input */}
          <FloatingInput
            autoFocus
            isFloat={false}
            value={localUserName}
            onChangeText={setLocalUserName}
          />

          {/* Continue Button */}
          <CustomButton
            title="Continue"
            isLoading={isLoading}
            titleStyle={modalStyles.title}
            onPress={handleSave}
            style={modalStyles.btnContinueSiteModal}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
