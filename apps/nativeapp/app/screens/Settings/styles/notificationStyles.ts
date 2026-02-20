import {Dimensions, StyleSheet} from 'react-native';
import {Colors, Typography} from '../../../styles';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const notificationStyles = StyleSheet.create({
  // Notifications section
  myNotifications: {
    marginTop: 32,
  },

  // Notification card container
  mySiteNameMainContainer: {
    marginTop: 24,
    borderRadius: 12,
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
  mySiteNameSubContainer: {
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  notificationContainer: {
    padding: 16,
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

  // Method type header
  mobileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Method rows
  emailContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emailSubContainer: {
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

  // Device-specific styles
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceTagCon: {
    backgroundColor: Colors.ORANGE,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  deviceTag: {
    textTransform: 'uppercase',
    fontSize: Typography.FONT_SIZE_10,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.WHITE,
  },

  // Verification styles
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

  // Action icons
  trashIcon: {
    marginLeft: 5,
    paddingVertical: 15,
    paddingLeft: 10,
  },

  // Coming soon badge container
  comingSoonCon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comingSoon: {
    width: 93,
    marginLeft: 10,
  },
});
