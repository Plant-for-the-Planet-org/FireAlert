import React from 'react';
import {Text, View, TouchableOpacity, StyleSheet} from 'react-native';
import {WarningIcon} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';
import {WEB_URLS} from '../../../constants';
import handleLink from '../../../utils/browserLinking';

interface WarningSectionsProps {
  onLinkPress?: (url: string) => void;
}

export const WarningSections: React.FC<WarningSectionsProps> = ({
  onLinkPress,
}) => {
  const _handleEcoWeb = (URL: string) => (): void => {
    if (onLinkPress) {
      onLinkPress(URL);
    } else {
      // Default behavior: open URL directly without lat/lng
      handleLink(URL, 0, 0);
    }
  };

  return (
    <View style={styles.alertWarningContainer}>
      <View style={styles.warningHeader}>
        <WarningIcon />
        <Text style={styles.warning}>WARNING!</Text>
      </View>
      <View style={styles.alertWarningSubContainer}>
        <Text style={styles.warningHeading}>Not all fires detected</Text>
        <Text style={styles.warningText}>
          You should not rely on FireAlert exclusively. Many fires will not be
          detected by the system, for instance if is cloudy or the fire is
          relatively small.
        </Text>
        <Text style={styles.warningText}>
          Active fire/thermal anomalies may be from fire, hot smoke,
          agriculture, gas flares, volcanoes or other sources.{' '}
          <Text
            style={[styles.secondaryUnderline, styles.textDecorationUnderline]}
            onPress={_handleEcoWeb(WEB_URLS.FIRMS_FAQ)}>
            FAQs
          </Text>
        </Text>
        <Text style={styles.warningText}>
          Sun glint or bright water can cause false alarms.
        </Text>
        <Text style={styles.warningText}>
          Fires must be relatively large to be detected by the main systems. For
          instance, MODIS usually detects both flaming and smouldering fires
          1000 m2 in size. Under ideal conditions, flaming fires one tenth this
          size can be detected.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  alertWarningContainer: {
    marginTop: 32,
    borderRadius: 12,
    marginHorizontal: 16,
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
  alertWarningSubContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  warningHeader: {
    height: 61,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    backgroundColor: Colors.GRADIENT_PRIMARY,
  },
  warning: {
    marginLeft: 10,
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_25,
    fontFamily: Typography.FONT_FAMILY_OSWALD_BOLD,
  },
  warningHeading: {
    fontSize: Typography.FONT_SIZE_20,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.PLANET_DARK_GRAY,
  },
  warningText: {
    marginTop: 22,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  secondaryUnderline: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: '#EB5757',
  },
  textDecorationUnderline: {
    textDecorationLine: 'underline',
  },
});
