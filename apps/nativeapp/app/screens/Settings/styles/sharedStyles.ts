import {Dimensions, Platform, StatusBar, StyleSheet} from 'react-native';
import {Colors, Typography} from '../../../styles';

const IS_ANDROID = Platform.OS === 'android';
const SCREEN_WIDTH = Dimensions.get('window').width;

export const sharedStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
    paddingTop: IS_ANDROID ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  commonPadding: {
    paddingHorizontal: 16,
  },

  // Section header styles
  mainHeading: {
    fontSize: Typography.FONT_SIZE_20,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  subHeading: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  smallHeading: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.PLANET_DARK_GRAY,
    paddingVertical: 5,
    marginLeft: 12,
  },

  // Divider styles
  separator: {
    height: 0.5,
    backgroundColor: '#e0e0e0',
  },

  // Shadow styles
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
  boxShadowPH: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },

  // Utility styles
  marginVertical12: {
    marginVertical: 12,
  },
  marginHorizontal16: {
    marginHorizontal: 16,
  },
  paddingVertical20: {
    paddingVertical: 20,
  },
  paddingVertical20OverflowHidden: {
    paddingVertical: 20,
    overflow: 'hidden',
  },
  paddingHorizonatal16: {
    paddingHorizontal: 16,
  },
  justifyContentSpaceBetween: {
    justifyContent: 'space-between',
  },
  justifyContentCenter: {
    justifyContent: 'center',
  },

  // Link styles
  ppLink: {
    color: Colors.PRIMARY,
  },
  underLine: {
    textDecorationLine: 'underline',
  },
  textDecorationLineUnderline: {
    textDecorationLine: 'underline',
  },
  primaryUnderline: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: '#68B030',
  },
  secondaryUnderline: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: '#EB5757',
  },

  // Color utilities
  colorWhite: {
    color: Colors.WHITE,
  },
  colorGrayLightest: {
    color: Colors.GRAY_LIGHTEST,
  },
  colorDisable: {
    color: Colors.DISABLE,
  },
  borderColorGrayLightest: {
    borderColor: Colors.GRAY_LIGHTEST,
  },
  fontFamilyBoldColorGradientPrimary: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.GRADIENT_PRIMARY,
  },

  // Spacing utilities
  marginRight5: {
    marginRight: 5,
  },
  marginLeft20: {
    marginLeft: 20,
  },
  marginTop65: {
    marginTop: 65,
  },
  marginTop73: {
    marginTop: 73,
  },
  paddingRight14: {
    paddingRight: 14,
  },
  backgroundColorEB57571A: {
    backgroundColor: '#EB57571A',
  },

  // App info
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
