import {Dimensions, Platform, StyleSheet} from 'react-native';
import {Colors, Typography} from '../../../styles';

const IS_ANDROID = Platform.OS === 'android';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const sharedStyles = StyleSheet.create({
  map: {
    flex: 1,
  },
  commonPadding: {
    paddingHorizontal: 16,
  },
  lightText: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
  },
  separator: {
    height: 0.4,
    marginVertical: 16,
    backgroundColor: '#BDBDBD',
  },
});
