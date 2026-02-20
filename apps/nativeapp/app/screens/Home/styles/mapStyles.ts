import {Dimensions, Platform, StyleSheet} from 'react-native';
import {Colors, Typography} from '../../../styles';

const IS_ANDROID = Platform.OS === 'android';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const mapStyles = StyleSheet.create({
  alertSpot: {
    width: 150,
    zIndex: 20,
    height: 150,
    position: 'absolute',
    bottom: IS_ANDROID ? SCREEN_HEIGHT / 1.64 : SCREEN_HEIGHT / 1.95,
    alignSelf: 'center',
  },
  satelliteInfoCon: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.GRADIENT_PRIMARY + '10',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 12,
  },
  alertLocInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertRadiusInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  satelliteInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  satelliteInfo: {
    marginLeft: 10,
  },
  satelliteIcon: {},
  satelliteText: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_10,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  satelliteLocText: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_8,
    fontFamily: Typography.FONT_FAMILY_BOLD,
  },
  eventFromNow: {
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  eventDate: {
    marginVertical: 5,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  alertLocText: {
    marginVertical: 2,
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  confidence: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  confidenceVal: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    textTransform: 'capitalize',
  },
});
