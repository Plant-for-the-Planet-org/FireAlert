import {Dimensions, StyleSheet} from 'react-native';
import {Colors, Typography} from '../../../styles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const modalStyles = StyleSheet.create({
  // Bottom sheet modal
  modalContainer: {
    bottom: 0,
    borderRadius: 15,
    width: SCREEN_WIDTH,
    position: 'absolute',
    paddingBottom: 40,
    backgroundColor: Colors.WHITE,
  },
  modalLayer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    width: 46,
    height: 8,
    marginTop: 13,
    borderRadius: 5,
    alignSelf: 'center',
    backgroundColor: Colors.GRAY_MEDIUM,
  },

  // Site info sheet
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
  btn: {
    height: 56,
    marginTop: 22,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.GRADIENT_PRIMARY,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  siteActionText: {
    marginLeft: 30,
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  projectSyncInfo: {
    fontSize: 12,
    marginTop: 16,
    color: Colors.TEXT_COLOR,
    fontFamily: Typography.FONT_FAMILY_ITALIC,
    paddingHorizontal: 10,
  },

  // Edit site modal
  siteModalStyle: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.WHITE,
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
  btnContinueSiteModal: {
    position: 'absolute',
    bottom: 40,
  },
  title: {
    color: Colors.WHITE,
  },

  // Radius dropdown overlay
  overlay: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    position: 'absolute',
  },
  dropDownModal: {
    right: 70,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 12,
    position: 'absolute',
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_MEDIUM,
  },
  subDropDownCon: {
    width: 150,
  },
  siteRadiusCon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  siteRadiusText: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    paddingVertical: 8,
  },
});
