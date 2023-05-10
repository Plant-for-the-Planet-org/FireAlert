import React from 'react';
import {StyleSheet} from 'react-native';
import OTPInputView from '@twotalltotems/react-native-otp-input';

import {Colors, Typography} from '../../styles';

interface IOtpInputProps {
  onCodeFilled?: (code: string) => void;
}

const OtpInput = ({onCodeFilled}: IOtpInputProps) => {
  return (
    <OTPInputView
      pinCount={5}
      autoFocusOnLoad
      style={styles.otpInput}
      onCodeFilled={onCodeFilled}
      codeInputFieldStyle={styles.underlineStyleBase}
      codeInputHighlightStyle={styles.underlineStyleHighLighted}
      // onCodeChanged = {code => { this.setState({code})}}
      // code={this.state.code} //You can supply this prop or not. The component will be used as a controlled / uncontrolled component respectively.
    />
  );
};

export default OtpInput;

const styles = StyleSheet.create({
  otpInput: {
    height: 80,
    width: '80%',
    alignSelf: 'center',
  },

  borderStyleBase: {
    width: 30,
    height: 45,
  },

  borderStyleHighLighted: {
    borderColor: Colors.GRADIENT_PRIMARY,
  },

  underlineStyleBase: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderRadius: 10,
    color: Colors.TEXT_COLOR + '80',
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_BOLD,
  },

  underlineStyleHighLighted: {
    borderColor: Colors.GRADIENT_PRIMARY,
  },
});
