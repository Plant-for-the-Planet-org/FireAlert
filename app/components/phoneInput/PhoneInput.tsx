import {StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import PhoneNoInput from 'react-native-phone-number-input';

import {Colors, Typography} from '../../styles';

const PhoneInput = ({containerStyle, inputValue}) => {
  const [value, setValue] = useState('');
  const [formattedValue, setFormattedValue] = useState('');
  const [valid, setValid] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const phoneInput = useRef<PhoneInput>(null);

  const isValidPhone = () => {
    const checkValid = phoneInput.current?.isValidNumber(value);
    setShowMessage(true);
    setValid(checkValid ? checkValid : false);
    inputValue(formattedValue);
  };

  useEffect(() => {
    isValidPhone();
  }, [formattedValue]);

  return (
    <>
      <PhoneNoInput
        ref={phoneInput}
        defaultValue={value}
        defaultCode="DM"
        layout="first"
        onChangeText={text => {
          setValue(text);
        }}
        disableArrowIcon
        onChangeFormattedText={text => {
          setFormattedValue(text);
        }}
        withShadow
        autoFocus
        containerStyle={[containerStyle, styles.containerStyle]}
        textInputStyle={styles.textInputStyle}
        textContainerStyle={styles.textContainerStyle}
        flagButtonStyle={styles.flagButtonStyle}
        countryPickerButtonStyle={{}}
        codeTextStyle={styles.textInputStyle}
        countryPickerProps={{
          // react-native-country-picker-modal props works here
          flatListProps: {style: styles.countryPickerModalList},
          closeButtonImageStyle: styles.closeButtonImageStyle,
          withAlphaFilter: true,
        }}
      />
    </>
  );
};

export default PhoneInput;

const styles = StyleSheet.create({
  containerStyle: {
    alignSelf: 'center',
    borderRadius: 15,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 0,

    elevation: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  flagButtonStyle: {
    backgroundColor: Colors.GRAY_LIGHT,
    borderRadius: 10,
    marginRight: 10,
  },
  textContainerStyle: {
    backgroundColor: Colors.GRAY_LIGHT,
    borderRadius: 10,
  },
  textInputStyle: {
    color: Colors.BLACK,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  countryPickerModalList: {
    paddingHorizontal: 15,
  },
  closeButtonImageStyle: {
    width: 40,
    height: 40,
    marginLeft: 4,
  },
});
