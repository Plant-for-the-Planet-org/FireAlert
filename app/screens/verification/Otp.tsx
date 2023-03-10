import {
  Text,
  View,
  Platform,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import React from 'react';

import {useCountdown} from '../../hooks';
import {CrossIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';
import {CustomButton, OtpInput} from '../../components';

const Otp = ({navigation, route}) => {
  const {verificationType} = route.params;
  const count = useCountdown(30);
  const handleClose = () => navigation.goBack();
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
        style={styles.container}>
        <TouchableOpacity onPress={handleClose} style={styles.crossContainer}>
          <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.heading, styles.commonPadding]}>
          Verify {verificationType}
        </Text>
        <View style={styles.subContainer}>
          <OtpInput />
          <TouchableOpacity style={styles.resendOtpBtn}>
            {count === 0 ? (
              <Text style={[styles.resendOtp, styles.link]}>Resend Otp</Text>
            ) : (
              <Text style={styles.resendOtp}>
                Otp will expires in <Text style={styles.link}>{count}</Text>
              </Text>
            )}
          </TouchableOpacity>
          <CustomButton
            title="Continue"
            style={styles.btnContinue}
            titleStyle={styles.title}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Otp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
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
  resendOtpBtn: {
    top: 85,
    right: 0,
    position: 'absolute',
    paddingHorizontal: 40,
  },
  resendOtp: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  crossContainer: {
    width: 25,
    marginTop: 20,
    marginHorizontal: 40,
  },
  link: {
    color: Colors.GRADIENT_PRIMARY,
  },
});
