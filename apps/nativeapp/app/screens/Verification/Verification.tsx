import {
  Text,
  View,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import React, {useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useToast} from 'react-native-toast-notifications';

import {trpc} from '../../services/trpc';
import {useAppSelector} from '../../hooks';
import {CrossIcon} from '../../assets/svgs';
import {Colors, Typography} from '../../styles';
import {validateEmail} from '../../utils/emailVerifier';
import {CustomButton, FloatingInput, PhoneInput} from '../../components';

const IS_ANDROID = Platform.OS === 'android';

const Verification = ({navigation, route}) => {
  const {verificationType} = route.params;
  const [newEmail, setNewEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [verified, setVerified] = useState<boolean>(false);
  const [isValidNum, setIsValidNum] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [verifyingLoader, setVerifyingLoader] = useState<boolean>(false);

  const {configData} = useAppSelector(state => state.loginSlice);

  const toast = useToast();
  const queryClient = useQueryClient();

  const createAlertPreference = trpc.alertMethod.createAlertMethod.useMutation({
    retryDelay: 3000,
    onSuccess: data => {
      if ([405, 403].includes(data?.json?.status)) {
        setLoading(false);
        return toast.show(data?.json?.message || 'something went wrong', {
          type: 'warning',
        });
      }
      const result = data?.json?.data;
      queryClient.setQueryData(
        [['alertMethod', 'getAlertMethods'], {type: 'query'}],
        oldData =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData.json,
                  data: [...oldData.json.data, result],
                },
              }
            : null,
      );
      setLoading(false);
      navigation.navigate('Otp', {
        verificationType,
        alertMethod: result,
      });
    },
    onError: () => {
      setLoading(false);
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const handleClose = () => navigation.goBack();

  const handleVerify = () => {
    if (
      (verificationType === 'Sms' && !isValidNum) ||
      (verificationType === 'Whatsapp' && !isValidNum)
    ) {
      return toast.show('Incorrect Number', {type: 'warning'});
    }
    setLoading(true);
    const payload = {
      method: String(verificationType).toLowerCase(),
      destination:
        verificationType === 'Sms' || verificationType === 'Whatsapp'
          ? phoneInput
          : verificationType === 'Webhook'
          ? webhookUrl
          : newEmail,
    };
    createAlertPreference.mutate({json: payload});
  };

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
              defaultCode={configData?.loc?.countryCode}
            />
          ) : verificationType === 'Webhook' ? (
            <FloatingInput
              multiline={true}
              numberOfLines={4}
              inputMode={'url'}
              autoCapitalize={'none'}
              label={`${verificationType} URL`}
              inputStyle={styles.webhookInput}
              containerStyle={styles.webhookInputCon}
              onChangeText={setWebhookUrl}
            />
          ) : (
            <FloatingInput
              verified={verified}
              inputMode={'email'}
              autoCapitalize={'none'}
              verifier={verifyingLoader}
              label={`${verificationType}`}
              onChangeText={handleEmail}
            />
          )}
          <CustomButton
            title="Continue"
            isLoading={loading}
            onPress={handleVerify}
            titleStyle={styles.title}
            style={styles.btnContinue}
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
    marginTop: 20,
    marginBottom: 10,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  commonPadding: {
    paddingHorizontal: 16,
  },
  crossContainer: {
    width: 25,
    marginTop: 60,
    marginHorizontal: 16,
  },
  containerStyle: {
    position: 'absolute',
    width: 360,
  },
  webhookInput: {
    height: 150,
  },
  webhookInputCon: {
    paddingVertical: 10,
  },
});
