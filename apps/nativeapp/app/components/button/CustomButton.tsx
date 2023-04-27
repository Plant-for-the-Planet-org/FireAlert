import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import React from 'react';

import {Colors, Typography} from '../../styles';

interface ICustomButtonProps {
  style?: any;
  onPress?: any;
  title?: string;
  isLoading?: boolean;
  titleStyle?: any;
  disabled?: boolean;
  loaderColor?: string;
}

const CustomButton = ({
  style,
  onPress,
  disabled,
  isLoading,
  titleStyle,
  title = 'Click',
  loaderColor = Colors.WHITE,
  ...restProps
}: ICustomButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.btn, style]}
      disabled={disabled || isLoading}
      {...restProps}>
      {!isLoading ? (
        <Text style={[styles.title, titleStyle]}>{title}</Text>
      ) : (
        <ActivityIndicator color={loaderColor} />
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;

const styles = StyleSheet.create({
  btn: {
    width: 311,
    height: 56,
    borderRadius: 14,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.PRIMARY,
  },
  title: {
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
});
