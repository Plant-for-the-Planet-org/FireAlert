import {
  Text,
  View,
  Platform,
  StatusBar,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import React, {useState} from 'react';
import {useToast} from 'react-native-toast-notifications';

import {CrossIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';
import {validateEmail} from '../../utils/emailVerifier';
import {CustomButton, FloatingInput, PhoneInput} from '../../components';

const IS_ANDROID = Platform.OS === 'android';

const Verification = ({navigation, route}) => {
  const {verificationType} = route.params;
  const [newEmail, setNewEmail] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(false);
  const [isValidNum, setIsValidNum] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const [verifyingLoader, setVerifyingLoader] = useState<boolean>(false);

  const toast = useToast();

  const handleClose = () => navigation.goBack();

  const handleVerify = () => {
    if (verificationType === 'Sms') {
      if (!isValidNum) {
        return toast.show('Incorrect Number', {type: 'warning'});
      }
      navigation.navigate('Otp', {verificationType, phoneInput});
    } else {
      navigation.navigate('Otp', {verificationType, newEmail});
    }
  };

  console.log(verificationType);

  const handleEmail = (emailText: string) => {
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
    <View style={styles.container}>
      <StatusBar barStyle={'dark-content'} backgroundColor={Colors.WHITE} />
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
              valid={setIsValidNum}
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
            disabled={verificationType === 'Email' && !verified}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Verification;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
    marginTop: IS_ANDROID ? StatusBar.currentHeight - 15 : 0,
  },
  subContainer: {
    flex: 1,
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
    marginTop: 60,
    marginHorizontal: 40,
    // alignSelf: 'flex-end',
  },
  containerStyle: {
    position: 'absolute',
  },
});
