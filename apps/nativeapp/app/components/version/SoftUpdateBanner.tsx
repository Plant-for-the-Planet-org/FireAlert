import React from 'react';
import {View, Text, StyleSheet, Linking, TouchableOpacity} from 'react-native';

import CustomButton from '../button/CustomButton';
import {Colors, Typography} from '../../styles';

interface ISoftUpdateBannerProps {
  visible: boolean;
  message: string;
  downloadUrl?: string;
  onDismiss: () => void;
}

const SoftUpdateBanner = ({
  visible,
  message,
  downloadUrl,
  onDismiss,
}: ISoftUpdateBannerProps) => {
  const handleUpdatePress = () => {
    if (downloadUrl) {
      Linking.openURL(downloadUrl).catch(err => {
        console.error('Failed to open app store URL:', err);
      });
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttonContainer}>
          <CustomButton
            onPress={handleUpdatePress}
            title="Update Now"
            style={styles.updateButton}
            titleStyle={styles.updateButtonText}
          />
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SoftUpdateBanner;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.PRIMARY,
    paddingTop: 50, // Account for status bar
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: Colors.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
  },
  message: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_14,
    lineHeight: Typography.LINE_HEIGHT_20,
    color: Colors.WHITE,
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  updateButton: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.WHITE,
    maxWidth: 150,
  },
  updateButtonText: {
    color: Colors.PRIMARY,
    fontSize: Typography.FONT_SIZE_14,
  },
  dismissButton: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 150,
  },
  dismissButtonText: {
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    fontSize: Typography.FONT_SIZE_14,
    color: Colors.WHITE,
  },
});
