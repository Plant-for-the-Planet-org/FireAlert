import {Dimensions, StyleSheet} from 'react-native';

import {Colors, Typography} from '../../styles';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const alertMethodStyles = StyleSheet.create({
  mySiteNameMainContainer: {
    marginTop: 24,
    borderRadius: 12,
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
    // shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  mySiteNameSubContainer: {
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  mobileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallHeading: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.PLANET_DARK_GRAY,
    paddingVertical: 5,
    marginLeft: 12,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  emailContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emailSubContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  justifyContentSpaceBetween: {
    justifyContent: 'space-between',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myEmailName: {
    paddingVertical: 5,
    maxWidth: SCREEN_WIDTH / 2,
    color: Colors.PLANET_DARK_GRAY,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    paddingRight: 10,
  },
  verifiedChipsCon: {
    height: 45,
    justifyContent: 'center',
  },
  verifiedChips: {
    backgroundColor: '#F2994A20',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedTxt: {
    marginLeft: 2,
    fontSize: 8,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  trashIcon: {
    marginLeft: 5,
    paddingVertical: 15,
    paddingLeft: 10,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#e0e0e0',
  },
  marginVertical12: {
    marginVertical: 12,
  },
  deviceTagCon: {
    backgroundColor: Colors.ORANGE,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  comingSoonCon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceTag: {
    textTransform: 'uppercase',
    fontSize: Typography.FONT_SIZE_10,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.WHITE,
  },
  comingSoon: {
    width: 93,
    marginLeft: 10,
  },
  commonPadding: {
    paddingHorizontal: 16,
  },
  desc: {
    marginTop: 10,
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.PLANET_DARK_GRAY,
  },
});
