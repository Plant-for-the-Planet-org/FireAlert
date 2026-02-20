import {Dimensions, Platform, StyleSheet} from 'react-native';
import {Colors, Typography} from '../../../styles';

const IS_ANDROID = Platform.OS === 'android';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const modalStyles = StyleSheet.create({
  modalContainer: {
    bottom: 0,
    borderRadius: 15,
    paddingBottom: 30,
    width: SCREEN_WIDTH,
    backgroundColor: Colors.WHITE,
  },
  modalHeader: {
    width: 46,
    height: 8,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 5,
    alignSelf: 'center',
    backgroundColor: Colors.GRAY_MEDIUM,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  pfName: {
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    width: SCREEN_WIDTH / 2,
  },
  profileInfo: {
    marginLeft: 16,
  },
  siteTitleCon: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  siteTitle: {
    fontSize: Typography.FONT_SIZE_24,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    width: SCREEN_WIDTH / 1.3,
  },
  platFormBtn: {
    height: 61,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    backgroundColor: Colors.PLANET_DARK_GREEN + '10',
    borderColor: Colors.PLANET_DARK_GREEN + '20',
  },
  btn: {
    height: 61,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    backgroundColor: Colors.GRADIENT_PRIMARY + '10',
    borderColor: Colors.GRADIENT_PRIMARY + '20',
  },
  simpleBtn: {
    height: 56,
    marginTop: 22,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.GRADIENT_PRIMARY,
  },
  simpleBtnDisabled: {
    opacity: 0.5,
  },
  siteActionText: {
    marginLeft: 30,
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  siteActionPfText: {
    marginLeft: 15,
    color: Colors.PLANET_DARK_GRAY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  crossContainer: {
    width: 25,
    marginTop: 60,
    marginHorizontal: 16,
  },
  heading: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  siteModalStyle: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.WHITE,
  },
  btnContinueSiteModal: {
    position: 'absolute',
    bottom: 40,
  },
  title: {
    color: Colors.WHITE,
  },
  projectsName: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  projectSyncInfo: {
    fontSize: 12,
    marginTop: 16,
    color: Colors.TEXT_COLOR,
    fontFamily: Typography.FONT_FAMILY_ITALIC,
    paddingHorizontal: 10,
  },
});
