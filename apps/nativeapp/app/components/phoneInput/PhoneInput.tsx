import {StyleSheet, Platform} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import PhoneNoInput from 'react-native-phone-number-input';
import {CountryCode} from 'react-native-country-picker-modal';

import {Colors, Typography} from '../../styles';
import {DISABLE_SMS_COUNTRY_CODE , DISABLE_WHATSAPP_COUNTRY_CODE} from '../../constants';

const IS_ANDROID = Platform.OS === 'android';

interface IPhoneInput {
  containerStyle?: any;
  defaultCode: CountryCode;
  excludeCountries: string[];
  valid: (checkValid: boolean) => any;
  inputValue: (formattedValue: string) => any;
  verificationType: string;
  destinationFlag: (param: boolean) => any;
}

const PhoneInput = ({
  containerStyle,
  inputValue,
  valid,
  defaultCode,
  verificationType,
  destinationFlag,
}: IPhoneInput) => {
  const [value, setValue] = useState<string>('');
  const [formattedValue, setFormattedValue] = useState<string>('');
  const [showMessage, setShowMessage] = useState<boolean>(false);

  const phoneInput = useRef<PhoneInput>(null);

  const isValidPhone = () => {
    const checkValid = phoneInput.current?.isValidNumber(value);
    const countryCode = phoneInput.current?.getCountryCode(value);
    valid(checkValid ? checkValid : false);
    inputValue(formattedValue);
    if ((
        verificationType === 'Sms' &&
        DISABLE_SMS_COUNTRY_CODE.includes(countryCode)
        ) || (
        verificationType === 'Whatsapp' && 
        DISABLE_WHATSAPP_COUNTRY_CODE.includes(countryCode)
      )) {
      destinationFlag(true);
      return;
    } else {
      destinationFlag(false);
    }
    setShowMessage(true);
  };

  useEffect(() => {
    isValidPhone();
  }, [formattedValue]);

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
