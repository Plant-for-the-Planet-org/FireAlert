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
import {CustomButton, ErrorBoundary, OtpInput} from '../../components';
import {
  DEFAULT_PIN_COUNT,
  type OtpInputHandle,
} from '../../components/otpInput/OtpInput';
import {createLogger, redactAlertMethod} from '../../utils/logger';
import {upsertAlertMethodInCache} from '../../hooks/alertMethod/useAlertMethodCache';

const log = createLogger('Otp');

const Otp = ({navigation, route}) => {
  const {verificationType} = route.params;
  const [code, setCode] = useState<string | undefined>('');

  const toast = useToast();
  const otpInputRef = useRef<OtpInputHandle>(null);
  const queryClient = useQueryClient();
  const [count, setCount] = useCountdown(30);

  const goToSettings = () =>
    navigation.navigate('BottomTab', {screen: 'Settings'});

  const verifyAlertMethod = trpc.alertMethod.verify.useMutation({
    retryDelay: 3000,
    onSuccess: data => {
      log.info('verify onSuccess', {
        status: data?.json?.status,
        alertMethod: redactAlertMethod(data?.json?.data),
      });
      if (data?.json?.status === 406) {
        return toast.show(data?.json?.message || 'something went wrong', {
          type: 'warning',
        });
      }
      upsertAlertMethodInCache(queryClient, data?.json?.data);
      goToSettings();
    },
    onError: error => {
      log.error('verify onError', {message: error?.message});
      setCode('');
      otpInputRef.current?.focusField(0);
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const verifyAlertPreference = trpc.alertMethod.sendVerification.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      log.info('sendVerification (resend code) onSuccess');
      setCount(30);
    },
    onError: error => {
      log.error('sendVerification (resend code) onError', {
        message: error?.message,
      });
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const handleClose = () => goToSettings();

  const handleContinue = () => {
    const alertMethodId = route?.params?.alertMethod?.id;
    if (!alertMethodId) {
      log.error('handleContinue called with no alertMethod.id in route params', {
        verificationType,
        hasAlertMethod: !!route?.params?.alertMethod,
      });
      return toast.show('something went wrong', {type: 'danger'});
    }
    // Slots can be left with a gap, which serializes to a short code. Catch
    // it here so an incomplete token is not sent as a failed verification.
    if (code?.length !== DEFAULT_PIN_COUNT) {
      log.warn('handleContinue called with an incomplete code', {
        length: code?.length ?? 0,
        expected: DEFAULT_PIN_COUNT,
      });
      return toast.show('Please enter the complete code', {type: 'warning'});
    }
    log.info('verify mutate', {alertMethodId});
    verifyAlertMethod.mutate({
      json: {
        params: {
          alertMethodId,
        },
        body: {
          token: code,
        },
      },
    });
  };

  const handleGetCode = () => {
    const alertMethodId = route?.params?.alertMethod?.id;
    if (!alertMethodId) {
      log.error('handleGetCode called with no alertMethod.id in route params');
      return toast.show('something went wrong', {type: 'danger'});
    }
    log.info('sendVerification (resend code) mutate', {alertMethodId});
    verifyAlertPreference.mutate({
      json: {alertMethodId},
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
          <ErrorBoundary
            label="OtpInput"
            fallbackMessage="Couldn't load the code input. Please close this screen and try again.">
            <OtpInput code={code} onCodeChanged={setCode} ref={otpInputRef} />
          </ErrorBoundary>
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
