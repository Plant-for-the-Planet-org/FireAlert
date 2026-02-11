import React from 'react';
import {StyleSheet, Dimensions, View} from 'react-native';
import Modal, {Direction} from 'react-native-modal';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface IBottomSheetProps {
  style?: any;
  children?: any;
  onModalHide?: any;
  isVisible?: boolean;
  onBackdropPress?: any;
  onSwipeComplete?: any;
  backdropColor?: string;
  swipeDirection?: Direction | Array<Direction>;
  maxHeight?: number;
}

const BottomSheet = ({
  style,
  children,
  isVisible,
  onModalHide,
  onSwipeComplete,
  onBackdropPress,
  swipeDirection = 'down',
  backdropColor = 'transparent',
  maxHeight = SCREEN_HEIGHT / 2,
  ...restProps
}: IBottomSheetProps) => {
  return (
    <Modal
      {...restProps}
      avoidKeyboard
      isVisible={isVisible}
      onModalHide={onModalHide}
      backdropColor={backdropColor}
      swipeDirection={swipeDirection}
      onBackdropPress={onBackdropPress}
      style={[styles.bottomSheet, style]}
      onSwipeComplete={onSwipeComplete || onBackdropPress}>
      <View style={[styles.content, {minHeight: maxHeight}]}>{children}</View>
    </Modal>
  );
};

export default BottomSheet;

const styles = StyleSheet.create({
  bottomSheet: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    minHeight: SCREEN_HEIGHT / 2,
  },
});
