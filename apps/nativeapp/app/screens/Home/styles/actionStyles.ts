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
  debugOverlay: {
    position: 'absolute',
    top: 60,
    right: 10,
    backgroundColor: 'rgba(232, 111, 86, 0.9)',
    padding: 8,
    borderRadius: 6,
    zIndex: 100,
  },
  debugTitle: {
    fontSize: 10,
    color: '#fff',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 9,
    color: '#fff',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});
