import React from 'react';
import {View, Text, Modal, StyleSheet, Linking, Platform} from 'react-native';

import CustomButton from '../button/CustomButton';
import {Colors, Typography} from '../../styles';

interface IForceUpdateModalProps {
  visible: boolean;
  message: string;
  downloadUrl?: string;
}

const ForceUpdateModal = ({
  visible,
  message,
  downloadUrl,
}: IForceUpdateModalProps) => {
  const handleUpdatePress = () => {
    if (downloadUrl) {
      Linking.openURL(downloadUrl).catch(err => {
        console.error('Failed to open app store URL:', err);
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Prevent dismissal - no onRequestClose handler
    >
      <View style={styles.container}>
        <View style={styles.subContainer}>
          <Text style={styles.header}>Update Required</Text>
          <Text style={styles.message}>{message}</Text>
          <CustomButton
            onPress={handleUpdatePress}
            title="Update Now"
            style={styles.updateButton}
            titleStyle={styles.updateButtonText}
          />
        </View>
      </View>
    </Modal>
  );
};

export default ForceUpdateModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  subContainer: {
    width: '85%',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  header: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontSize: Typography.FONT_SIZE_22,
    lineHeight: Typography.LINE_HEIGHT_30,
    color: Colors.BLACK,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_16,
    lineHeight: Typography.LINE_HEIGHT_24,
    color: Colors.TEXT_COLOR,
    marginBottom: 24,
    textAlign: 'center',
  },
  updateButton: {
    width: '100%',
    backgroundColor: Colors.PRIMARY,
  },
  updateButtonText: {
    color: Colors.WHITE,
  },
});
