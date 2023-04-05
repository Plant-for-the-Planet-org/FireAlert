import React from 'react';
import {StyleSheet} from 'react-native';
import Modal, {Direction} from 'react-native-modal';

interface IBottomSheetProps {
  style?: any;
  children?: any;
  onModalHide?: any;
  isVisible?: boolean;
  onBackdropPress?: any;
  onSwipeComplete?: any;
  backdropColor?: string;
  swipeDirection?: Direction | Array<Direction>;
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
      {children}
    </Modal>
  );
};

export default BottomSheet;

const styles = StyleSheet.create({
  bottomSheet: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
