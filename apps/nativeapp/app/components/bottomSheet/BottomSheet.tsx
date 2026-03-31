import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Dimensions, StyleSheet} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type SwipeDirection = 'up' | 'down' | 'left' | 'right';

interface IBottomSheetProps {
  style?: any;
  children?: any;
  onModalHide?: () => void;
  isVisible?: boolean;
  onBackdropPress?: () => void;
  onSwipeComplete?: () => void;
  backdropColor?: string;
  swipeDirection?: SwipeDirection | Array<SwipeDirection>;
  maxHeight?: number;
  snapPoints?: Array<string | number>;
  initialSnapIndex?: number;
  enablePanDownToClose?: boolean;
  enableDynamicSizing?: boolean;
  useScrollableContainer?: boolean;
  [key: string]: any;
}

const BottomSheet = ({
  style,
  children,
  isVisible,
  onModalHide,
  onSwipeComplete,
  onBackdropPress,
  swipeDirection,
  backdropColor = 'transparent',
  maxHeight = SCREEN_HEIGHT / 2,
  snapPoints,
  initialSnapIndex = 0,
  enablePanDownToClose = true,
  enableDynamicSizing = false,
  useScrollableContainer = false,
  ...restProps
}: IBottomSheetProps) => {
  const modalRef = useRef<BottomSheetModal>(null);
  const wasVisibleRef = useRef(false);
  const closedByBackdropRef = useRef(false);
  const dismissedByVisibilityRef = useRef(false);
  const warnedLegacySwipeDirectionRef = useRef(false);

  useEffect(() => {
    if (
      __DEV__ &&
      swipeDirection !== undefined &&
      !warnedLegacySwipeDirectionRef.current
    ) {
      console.warn(
        '[BottomSheet] `swipeDirection` is deprecated and ignored in the gorhom adapter.',
      );
      warnedLegacySwipeDirectionRef.current = true;
    }
  }, [swipeDirection]);

  const shouldEnableDynamicSizing = useMemo(
    () =>
      enableDynamicSizing ||
      (!snapPoints?.length && !useScrollableContainer),
    [enableDynamicSizing, snapPoints, useScrollableContainer],
  );

  const resolvedSnapPoints = useMemo(
    () => (snapPoints?.length ? snapPoints : [maxHeight]),
    [maxHeight, snapPoints],
  );

  useEffect(() => {
    if (isVisible && !wasVisibleRef.current) {
      closedByBackdropRef.current = false;
      dismissedByVisibilityRef.current = false;
      modalRef.current?.present();
    } else if (!isVisible && wasVisibleRef.current) {
      dismissedByVisibilityRef.current = true;
      modalRef.current?.dismiss();
    }
    wasVisibleRef.current = !!isVisible;
  }, [isVisible]);

  const handleBackdropPress = useCallback(() => {
    closedByBackdropRef.current = true;
    onBackdropPress?.();
  }, [onBackdropPress]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (
        index !== -1 ||
        closedByBackdropRef.current ||
        dismissedByVisibilityRef.current
      ) {
        return;
      }
      if (onSwipeComplete) {
        onSwipeComplete();
        return;
      }
      onBackdropPress?.();
    },
    [onBackdropPress, onSwipeComplete],
  );

  const handleModalDismiss = useCallback(() => {
    closedByBackdropRef.current = false;
    dismissedByVisibilityRef.current = false;
    onModalHide?.();
  }, [onModalHide]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={1}
        pressBehavior="close"
        onPress={handleBackdropPress}
        style={[props.style, {backgroundColor: backdropColor}]}
      />
    ),
    [backdropColor, handleBackdropPress],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      index={initialSnapIndex}
      snapPoints={resolvedSnapPoints}
      enablePanDownToClose={enablePanDownToClose}
      enableDynamicSizing={shouldEnableDynamicSizing}
      maxDynamicContentSize={maxHeight}
      backdropComponent={renderBackdrop}
      onChange={handleSheetChange}
      onDismiss={handleModalDismiss}
      handleComponent={null}
      backgroundStyle={styles.transparentBackground}
      style={[styles.bottomSheet, style]}
      {...restProps}>
      {useScrollableContainer ? (
        children
      ) : (
        <BottomSheetView style={[styles.content, {maxHeight}]}>
          {children}
        </BottomSheetView>
      )}
    </BottomSheetModal>
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
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
});
