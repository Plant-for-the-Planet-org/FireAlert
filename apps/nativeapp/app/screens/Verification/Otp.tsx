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
import {useToast} from 'react-native-toast-notifications';

import {trpc} from '../../services/trpc';
import {useCountdown} from '../../hooks';
import {CrossIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';
import {CustomButton, OtpInput} from '../../components';

const Otp = ({navigation, route}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const {verificationType, phoneInput, newEmail} = route.params;

  const toast = useToast();
  const count = useCountdown(30);

  const handleClose = () => navigation.goBack();

  const createAlertPreference = trpc.alertMethod.createAlertMethod.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      setLoading(false);
      navigation.navigate('Settings');
    },
    onError: () => {
      setLoading(false);
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const handleContinue = () => {
    setLoading(true);
    const payload = {
      method: String(verificationType).toLowerCase(),
      destination: verificationType === 'Sms' ? phoneInput : newEmail,
      isVerified: false,
      isEnabled: false,
    };
    createAlertPreference.mutate({json: payload});
  };

  return (
    <View style={styles.container}>
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
          <View style={styles.resendOtpBtn}>
            {count === 0 ? (
              <TouchableOpacity>
                <Text style={[styles.resendOtp, styles.link]}>Resend Otp</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendOtp}>
                Verification Code will expires in{' '}
                <Text style={styles.link}>{count}</Text>
              </Text>
            )}
          </View>
          <CustomButton
            title="Continue"
            isLoading={loading}
            style={styles.btnContinue}
            titleStyle={styles.title}
            onPress={handleContinue}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
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
    marginTop: 60,
    marginHorizontal: 40,
  },
  link: {
    color: Colors.GRADIENT_PRIMARY,
  },
});
