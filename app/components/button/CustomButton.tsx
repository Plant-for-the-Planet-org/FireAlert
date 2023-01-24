import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';

import {Colors, Typography} from '../../styles';

const CustomButton = ({style, titleStyle, title = 'Click'}) => {
  return (
    <TouchableOpacity style={[styles.btn, style]}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

export default CustomButton;

const styles = StyleSheet.create({
  btn: {
    width: 311,
    height: 56,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.PRIMARY,
  },
  title: {
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    fontSize: Typography.FONT_SIZE_18,
  },
});
