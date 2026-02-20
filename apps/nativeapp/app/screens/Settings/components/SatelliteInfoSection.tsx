import React from 'react';
import {Text, View, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {PlanetLogo, NasaLogo} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';
import {WEB_URLS} from '../../../constants';
import handleLink from '../../../utils/browserLinking';

const IS_ANDROID = Platform.OS === 'android';

interface SatelliteInfoSectionProps {
  onLinkPress?: (url: string) => void;
}

export const SatelliteInfoSection: React.FC<SatelliteInfoSectionProps> = ({
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
    <>
      {/* Plant-for-the-Planet Info */}
      <View style={[styles.warningContainer, styles.marginTop73]}>
        <View style={[styles.warnLogo, styles.boxShadow]}>
          <PlanetLogo />
        </View>
        <Text style={styles.warningText2}>
          <Text
            style={styles.primaryUnderline}
            onPress={_handleEcoWeb(WEB_URLS.PP_FIRE_ALERT)}>
            FireAlert
          </Text>{' '}
          is a project of the{' '}
          <Text
            onPress={_handleEcoWeb(WEB_URLS.PP_ORG)}
            style={styles.primaryUnderline}>
            Plant-for-the-Planet Foundation
          </Text>
          , a non-profit organisation dedicated to restoring and conserving the
          world's forests.{'\n\n'}
          <Text>
            By using this app, you agree to our{' '}
            <Text
              style={styles.primaryUnderline}
              onPress={_handleEcoWeb(WEB_URLS.PP_TERMS_CON)}>
              Terms & Conditions
            </Text>
            .
          </Text>
        </Text>
      </View>

      {/* NASA FIRMS Info */}
      <View
        style={[
          styles.warningContainer,
          styles.backgroundColorEB57571A,
          styles.marginTop65,
        ]}>
        <View
          style={[styles.warnLogo, styles.boxShadow, styles.paddingRight14]}>
          <NasaLogo />
        </View>
        <Text style={styles.warningText2}>
          We gratefully acknowledge the use of data and from NASA's{' '}
          <Text
            style={styles.secondaryUnderline}
            onPress={_handleEcoWeb(WEB_URLS.FIRMS)}>
            {' '}
            Information for Resource Management System (FIRMS)
          </Text>
          , part of NASA's Earth Observing System Data and Information System
          (EOSDIS). {'\n\n'}We thank the scientists and engineers who built{' '}
          <Text
            style={styles.secondaryUnderline}
            onPress={_handleEcoWeb(WEB_URLS.MODIS)}>
            MODIS,
          </Text>{' '}
          <Text
            style={styles.secondaryUnderline}
            onPress={_handleEcoWeb(WEB_URLS.VIIRS)}>
            VIIRS
          </Text>{' '}
          and{' '}
          <Text
            style={styles.secondaryUnderline}
            onPress={_handleEcoWeb(WEB_URLS.LANDSAT)}>
            Landsat
          </Text>
          . We appreciate NASA's dedication to sharing data. This project is not
          affiliated with NASA.{' '}
          <Text
            style={styles.secondaryUnderline}
            onPress={_handleEcoWeb(WEB_URLS.FIRMS_DISCLAIMER)}>
            FIRMS Disclaimer
          </Text>
          .
        </Text>
      </View>

      {/* App Version and Footer Links */}
      <View style={styles.appInfoContainer}>
        <Text style={styles.versionText}>
          Version {DeviceInfo.getVersion()} ({DeviceInfo.getBuildNumber()}) •{' '}
          <Text onPress={_handleEcoWeb(WEB_URLS.PP_IMPRINT)}>Imprint</Text> •{' '}
          <Text onPress={_handleEcoWeb(WEB_URLS.PP_PRIVACY_POLICY)}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  warningContainer: {
    borderRadius: 12,
    paddingTop: 57,
    marginHorizontal: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: Colors.WHITE,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
    alignItems: 'center',
  },
  warnLogo: {
    width: 70,
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.WHITE,
    position: 'absolute',
    top: -35,
  },
  boxShadow: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4.62,
    elevation: 5,
  },
  warningText2: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  primaryUnderline: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: '#68B030',
  },
  secondaryUnderline: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: '#EB5757',
  },
  marginTop73: {
    marginTop: 73,
  },
  marginTop65: {
    marginTop: 65,
  },
  backgroundColorEB57571A: {
    backgroundColor: '#EB57571A',
  },
  paddingRight14: {
    paddingRight: 14,
  },
  appInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: IS_ANDROID ? 16 : 0,
  },
  versionText: {
    textAlign: 'center',
    color: Colors.GRAY_LIGHTEST,
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
});
