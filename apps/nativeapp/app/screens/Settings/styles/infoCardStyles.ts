import {Dimensions, StyleSheet} from 'react-native';
import {Colors, Typography} from '../../../styles';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const infoCardStyles = StyleSheet.create({
  // Warning card
  alertWarningContainer: {
    marginTop: 32,
    borderRadius: 12,
    marginHorizontal: 16,
    backgroundColor: Colors.GRADIENT_PRIMARY + '12',
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
  warningSubContainer: {
    flexDirection: 'row',
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

  // Info cards (Planet & NASA)
  warningContainer: {
    borderRadius: 12,
    paddingTop: 57,
    paddingBottom: 20,
    marginHorizontal: 16,
    paddingHorizontal: 20,
    backgroundColor: '#2196531A',
  },
  warnLogo: {
    position: 'absolute',
    top: -40,
    backgroundColor: Colors.WHITE,
    padding: 18,
    borderRadius: SCREEN_WIDTH,
    width: 82,
    height: 82,
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
  },
  warningText2: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },

  // Satellite info sections
  geostationaryMainContainer: {
    marginTop: 32,
    marginHorizontal: 16,
    backgroundColor: Colors.WHITE,
    paddingVertical: 20,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  polarOrbitMainContainer: {
    marginTop: 32,
    marginHorizontal: 16,
    backgroundColor: Colors.WHITE,
    paddingVertical: 20,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  geostationaryContainer: {},
  desc: {
    marginTop: 10,
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.PLANET_DARK_GRAY,
  },
  descBold: {
    marginTop: 10,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.PLANET_DARK_GRAY,
  },
  geostationaryInfoContainer: {
    marginTop: 10,
  },
  iconContainer: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  geoDesc: {
    marginLeft: 5,
    color: Colors.PLANET_DARK_GRAY,
  },
});
