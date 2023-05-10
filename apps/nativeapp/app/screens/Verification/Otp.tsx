import {
  Text,
  View,
  Platform,
  StyleSheet,
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
  const [code, setCode] = useState<string | null>(null);
  const {verificationType} = route.params;

  const toast = useToast();
  const count = useCountdown(30);

  const verifyAlertMethod = trpc.alertMethod.verify.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      navigation.navigate('Settings');
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const handleClose = () => navigation.goBack();

  const handleContinue = () => {
    verifyAlertMethod.mutate({
      json: {
        alertMethodId: route?.params?.alertMethod?.id,
        notificationToken: code,
      },
    });
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
          <OtpInput onCodeFilled={setCode} />
          <View style={styles.resendOtpBtn}>
            {count === 0 ? (
              <TouchableOpacity>
                <Text style={[styles.resendOtp, styles.link]}>
                  Get a new code
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendOtp}>
                You can request a new code in{' '}
                <Text style={styles.link}>{count} </Text>
                seconds
              </Text>
            )}
          </View>
          <CustomButton
            title="Continue"
            onPress={handleContinue}
            titleStyle={styles.title}
            style={styles.btnContinue}
            isLoading={verifyAlertMethod.isLoading}
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
