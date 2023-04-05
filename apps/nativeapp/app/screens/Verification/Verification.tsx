import {
  Text,
  View,
  Platform,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import React, {useState} from 'react';

import {CrossIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';
import {CustomButton, FloatingInput, PhoneInput} from '../../components';
import {validateEmail} from '../../utils/emailVerifier';

const Verification = ({navigation, route}) => {
  const {verificationType} = route.params;
  const [newEmail, setNewEmail] = useState('');
  const [verifyingLoader, setVerifyingLoader] = useState(false);
  const [verified, setVerified] = useState(false);
  const [phoneInput, setPhoneInput] = useState(null);

  const handleClose = () => navigation.goBack();

  const handleVerify = () => {
    if (verificationType === 'Whatsapp' || verificationType === 'Sms') {
      navigation.navigate('Otp', {verificationType, phoneInput});
    } else {
      navigation.navigate('Otp', {verificationType, newEmail});
    }
  };

  const handleEmail = emailText => {
    setVerifyingLoader(true);
    if (emailText === '') {
      setVerifyingLoader(false);
    } else {
      setVerifyingLoader(true);
    }
    if (validateEmail(emailText)) {
      setVerified(true);
    } else {
      setVerified(false);
    }
    setNewEmail(emailText);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
        style={styles.container}>
        <TouchableOpacity onPress={handleClose} style={styles.crossContainer}>
          <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.heading, styles.commonPadding]}>
          Add New {verificationType}
        </Text>
        <View style={styles.subContainer}>
          {verificationType === 'Whatsapp' || verificationType === 'Sms' ? (
            <PhoneInput
              inputValue={setPhoneInput}
              containerStyle={styles.containerStyle}
            />
          ) : (
            <FloatingInput
              verified={verified}
              verifier={verifyingLoader}
              label={`${verificationType}`}
              onChangeText={txt => handleEmail(txt)}
            />
          )}
          <CustomButton
            title="Continue"
            onPress={handleVerify}
            style={styles.btnContinue}
            titleStyle={styles.title}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Verification;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  subContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  btnContinue: {
    position: 'absolute',
    bottom: 40,
  },
  title: {
    color: Colors.WHITE,
  },
  heading: {
    marginVertical: 20,
    fontSize: Typography.FONT_SIZE_24,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  commonPadding: {
    paddingHorizontal: 40,
  },
  crossContainer: {
    width: 25,
    marginTop: 20,
    marginHorizontal: 40,
    // alignSelf: 'flex-end',
  },
  containerStyle: {
    position: 'absolute',
  },
});
