import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Colors, Typography} from '../../styles';

interface AlertActionsSectionProps {
  onOpenInGoogleMaps: () => void;
}

export const AlertActionsSection: React.FC<AlertActionsSectionProps> = ({
  onOpenInGoogleMaps,
}) => {
  return (
    <>
      <View style={styles.separator} />
      <TouchableOpacity onPress={onOpenInGoogleMaps} style={styles.simpleBtn}>
        <Text style={styles.siteActionText}>Open in Google Maps</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: Colors.GRAY_LIGHT,
    marginVertical: 20,
  },
  simpleBtn: {
    backgroundColor: Colors.GRADIENT_PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  siteActionText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.WHITE,
    marginLeft: 0,
  },
});
