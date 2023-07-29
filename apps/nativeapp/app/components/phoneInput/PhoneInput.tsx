import {StyleSheet, Platform} from 'react-native';
import React, {useEffect, useRef, useState, useCallback} from 'react';
import PhoneNoInput from 'react-native-phone-number-input';

import {Colors, Typography} from '../../styles';

const IS_ANDROID = Platform.OS === 'android';

const PhoneInput = ({containerStyle, inputValue, valid, defaultCode}) => {
  const [value, setValue] = useState('');
  const [formattedValue, setFormattedValue] = useState('');
  // const [showMessage, setShowMessage] = useState(false);
  const [_, setShowMessage] = useState(false); // changed showMessage to _
  const phoneInput = useRef<PhoneInput>(null);

  const isValidPhone = useCallback(() => {
    const checkValid = phoneInput.current?.isValidNumber(value);
    setShowMessage(true);
    valid(checkValid ? checkValid : false);
    inputValue(formattedValue);
  }, [value, formattedValue, valid, inputValue]);
  
  useEffect(() => {
    isValidPhone();
  }, [formattedValue, isValidPhone]);

  return (
    <>
      <PhoneNoInput
        ref={phoneInput}
        defaultValue={value}
        defaultCode={defaultCode || 'DE'}
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
        textInputProps={{keyboardType: 'number-pad'}}
        containerStyle={[containerStyle, styles.containerStyle]}
        textInputStyle={styles.textInputStyle}
        textContainerStyle={styles.textContainerStyle}
        flagButtonStyle={styles.flagButtonStyle}
        countryPickerButtonStyle={{}}
        codeTextStyle={{}}
        countryPickerProps={{
          // react-native-country-picker-modal props works here
          flatListProps: {
            style: styles.countryPickerModalList,
            showsVerticalScrollIndicator: false,
          },
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
    height: 55.5,
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
    height: 55,
  },
  countryPickerModalList: {
    paddingHorizontal: 15,
  },
  closeButtonImageStyle: {
    width: IS_ANDROID ? 20 : 40,
    height: IS_ANDROID ? 20 : 40,
    marginLeft: 4,
  },
});
