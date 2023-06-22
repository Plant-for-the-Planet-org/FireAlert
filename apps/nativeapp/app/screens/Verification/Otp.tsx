import {
  Text,
  View,
  Platform,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import React, {useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useToast} from 'react-native-toast-notifications';

import {trpc} from '../../services/trpc';
import {useCountdown} from '../../hooks';
import {CrossIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';
import {CustomButton, OtpInput} from '../../components';

const Otp = ({navigation, route}) => {
  const {verificationType} = route.params;
  const [code, setCode] = useState<string | undefined>('');

  const toast = useToast();
  const otpInputRef = useRef();
  const queryClient = useQueryClient();
  const [count, setCount] = useCountdown(30);

  const verifyAlertMethod = trpc.alertMethod.verify.useMutation({
    retryDelay: 3000,
    onSuccess: data => {
      if (data?.json?.status === 406) {
        return toast.show(data?.json?.message || 'something went wrong', {
          type: 'warning',
        });
      }
      queryClient.setQueryData(
        [['alertMethod', 'getAlertMethods'], {type: 'query'}],
        oldData =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData?.json,
                  data: oldData?.json?.data?.map(item =>
                    item.id === data?.json?.data?.id ? data?.json?.data : item,
                  ),
                },
              }
            : null,
      );
      navigation.navigate('Settings');
    },
    onError: () => {
      setCode('');
      //  otpInputRef.current.focusField(1);
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const verifyAlertPreference = trpc.alertMethod.sendVerification.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      setCount(30);
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const handleClose = () => navigation.navigate('Settings');

  const handleContinue = () => {
    verifyAlertMethod.mutate({
      json: {
        params: {
          alertMethodId: route?.params?.alertMethod?.id,
        },
        body: {
          token: code,
        },
      },
    });
  };

  const handleGetCode = () => {
    verifyAlertPreference.mutate({
      json: {alertMethodId: route?.params?.alertMethod?.id},
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
          Verify {verificationType === 'Sms' ? 'SMS' : verificationType}
        </Text>
        {verificationType === 'Email' ||
          (verificationType === 'email' && (
            <Text style={[styles.subHeading, styles.commonPadding]}>
              We've sent you a code to verify your email. Please check your
              email and enter the code below.
            </Text>
          ))}
        <View style={styles.subContainer}>
          <OtpInput
            code={code}
            onCodeChanged={setCode}
            otpInputRef={otpInputRef}
          />
          <View style={styles.resendOtpBtn}>
            {count === 0 ? (
              verifyAlertPreference?.isLoading ? (
                <ActivityIndicator size={'small'} />
              ) : (
                <TouchableOpacity onPress={handleGetCode}>
                  <Text style={[styles.resendOtp, styles.link]}>
                    Get a new code
                  </Text>
                </TouchableOpacity>
              )
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
    marginTop: 20,
    fontSize: Typography.FONT_SIZE_24,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  subHeading: {
    marginTop: 5,
    marginBottom: 15,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.GRAY_DEEP,
  },
  commonPadding: {
    paddingHorizontal: 16,
  },
  resendOtpBtn: {
    top: 85,
    right: 0,
    position: 'absolute',
    paddingHorizontal: 16,
  },
  resendOtp: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  crossContainer: {
    width: 25,
    marginTop: 60,
    marginHorizontal: 16,
  },
  link: {
    color: Colors.GRADIENT_PRIMARY,
  },
});
