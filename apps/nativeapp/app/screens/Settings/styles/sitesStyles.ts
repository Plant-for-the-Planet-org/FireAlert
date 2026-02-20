import {Dimensions, StyleSheet} from 'react-native';
import {Colors, Typography} from '../../../styles';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const sitesStyles = StyleSheet.create({
  // Section containers
  myProjects: {
    marginTop: 20,
  },
  mySites: {
    marginTop: 32,
  },
  mySitesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Project styles
  projectsInfo: {
    marginTop: 24,
    borderRadius: 12,
    paddingTop: 20,
    paddingHorizontal: 16,
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
  projectsNameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectsName: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
    width: SCREEN_WIDTH / 1.3,
  },
  sitesViewStyle: {
    marginTop: 16,
  },

  // Site row styles
  sitesInProjects: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sitesName: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
    width: SCREEN_WIDTH / 2.5,
    paddingVertical: 5,
  },
  rightConPro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteRadius: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.GRADIENT_PRIMARY,
  },
  dropDownRadius: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropDownRadiusMarginRight5PaddingVeritcal16: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
    paddingVertical: 16,
  },

  // My sites container
  mySiteNameContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  mySiteName: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.PLANET_DARK_GRAY,
    paddingVertical: 5,
    width: SCREEN_WIDTH / 2.5,
  },

  // Empty state styles
  emptySiteCon: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptySiteText: {
    fontSize: 12,
    color: Colors.PLANET_DARK_GRAY,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    paddingHorizontal: 10,
  },
  receiveNotifications: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  addSiteBtn: {
    backgroundColor: Colors.GRADIENT_PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: 92,
    borderRadius: 8,
    marginTop: 12,
    marginLeft: 10,
  },
  locWaveCon: {
    position: 'absolute',
    right: 5,
  },

  // Empty pp.eco state
  emptyPpInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  emptyPpInfo: {
    width: SCREEN_WIDTH / 1.8,
  },
  visitPPecoBtn: {
    width: 92,
    borderRadius: 8,
    marginTop: 12,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitPPecoBtnText: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.WHITE,
  },
  planetLogo: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    backgroundColor: Colors.WHITE,
    shadowColor: '#D9EAE0',
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.WHITE,
  },
  natureBgCon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  paddingHorizontal0ColorWhite: {
    fontSize: 12,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    paddingHorizontal: 0,
    color: Colors.WHITE,
  },
});
