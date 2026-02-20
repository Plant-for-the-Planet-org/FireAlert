import {Dimensions, Platform, StyleSheet} from 'react-native';
import {Colors} from '../../../styles';

const IS_ANDROID = Platform.OS === 'android';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const actionStyles = StyleSheet.create({
  myLocationIcon: {
    right: 16,
    borderWidth: 1,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    bottom: IS_ANDROID ? 102 : 101,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_LIGHT,
  },
  layerIcon: {
    right: 16,
    borderWidth: 1,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    top: 138,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_LIGHT,
  },
  avatarContainer: {
    width: 45,
    height: 45,
    top: 80,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 100,
  },
});
