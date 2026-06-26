import {
  View,
  Text,
  Modal,
  StatusBar,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import React, {useEffect, useState} from 'react';

import {
  getUserDetails,
  updateIsLoggedIn,
  updateAccessToken,
} from '../../redux/slices/login/loginSlice';
import {useAppDispatch} from '../../hooks';
import {CustomButton} from '../../components';
import {Colors, Typography} from '../../styles';
import {VerifyAccAlert} from '../../assets/svgs';
import {storeData} from '../../utils/localStorage';
import {isUnverifiedEmailError} from '../../utils/authErrors';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth0} from 'react-native-auth0';
import {useToast} from 'react-native-toast-notifications';

const launch_screen = require('../../assets/images/launch_screen.png');
const LOG_PREFIX = '[Login]';

const Login = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showVerifyAccModal, setShowVerifyAccModal] = useState<boolean>(false);
  const {authorize, error} = useAuth0();
  const toast = useToast();
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log(`${LOG_PREFIX} Auth0 hook error state changed`, {
      hasError: !!error,
      code: error?.code,
      message: error?.message,
      name: error?.name,
    });

    if (error) {
      if (isUnverifiedEmailError(error)) {
        console.log(
          `${LOG_PREFIX} Auth0 error — email verification required, showing modal`,
        );
        showEmailVerificationModal();
      } else {
        console.warn(
          `${LOG_PREFIX} Auth0 error did not match unverified email; modal not shown`,
          error,
        );
      }
    }
  }, [error]);

  const showEmailVerificationModal = () => {
    setShowVerifyAccModal(true);
    setIsLoading(false);
  };

  const handleLogin = async () => {
    console.log(`${LOG_PREFIX} handleLogin started`);

    try {
      setShowVerifyAccModal(false);
      setIsLoading(true);

      const authorizeParams = {
        scope: 'openid email profile offline_access',
        audience: 'urn:plant-for-the-planet',
      };
      const authorizeOptions = {
        ephemeralSession: false,
        useLegacyCallbackUrl: true,
      };

      console.log(`${LOG_PREFIX} Calling Auth0 authorize`, {
        params: authorizeParams,
        options: authorizeOptions,
      });

      const authCred = await authorize(authorizeParams, authorizeOptions);

      console.log(`${LOG_PREFIX} Auth0 authorize returned`, {
        hasCredentials: !!authCred,
        hasAccessToken: !!authCred?.accessToken,
        hasRefreshToken: !!authCred?.refreshToken,
        hasIdToken: !!authCred?.idToken,
        tokenType: authCred?.tokenType,
        expiresAt: authCred?.expiresAt,
        scope: authCred?.scope,
      });

      if (authCred) {
        console.log(`${LOG_PREFIX} Credentials received — fetching user details`);

        const request = {
          onSuccess: async () => {
            console.log(`${LOG_PREFIX} getUserDetails succeeded — completing login`);
            dispatch(updateIsLoggedIn(true));
            storeData('cred', authCred);
            setIsLoading(false);
            console.log(`${LOG_PREFIX} Login flow completed successfully`);
          },
          onFail: (message?: string) => {
            console.error(`${LOG_PREFIX} getUserDetails failed`, {message});
            setIsLoading(false);
          },
        };
        dispatch(updateAccessToken(authCred?.accessToken));
        dispatch(getUserDetails(request));
      } else {
        console.warn(
          `${LOG_PREFIX} authorize returned no credentials`,
          {error},
        );
        if (isUnverifiedEmailError(error)) {
          console.log(
            `${LOG_PREFIX} No credentials + unverified email error — showing modal`,
          );
          showEmailVerificationModal();
        } else {
          setIsLoading(false);
          setTimeout(() => toast.show('Login Failed'), 0);
        }
      }
    } catch (loginError) {
      console.error(`${LOG_PREFIX} handleLogin caught an error`, {
        message:
          loginError instanceof Error ? loginError.message : String(loginError),
        name: loginError instanceof Error ? loginError.name : undefined,
        code:
          loginError && typeof loginError === 'object' && 'code' in loginError
            ? (loginError as {code?: string}).code
            : undefined,
        error: loginError,
      });
      if (isUnverifiedEmailError(loginError)) {
        console.log(
          `${LOG_PREFIX} Caught error — email verification required, showing modal`,
        );
        showEmailVerificationModal();
      } else {
        setIsLoading(false);
        toast.show('Login Failed');
      }
    }
  };

  return (
    <>
      <StatusBar
        translucent
        backgroundColor={Colors.TRANSPARENT}
        barStyle={showVerifyAccModal ? 'dark-content' : 'light-content'}
      />
      <ImageBackground source={launch_screen} style={styles.image}>
        <View style={styles.btnContainer}>
          <CustomButton
            style={styles.btn}
            isLoading={isLoading}
            onPress={handleLogin}
            title={'Sign in/Sign up'}
            loaderColor={Colors.WHITE}
            titleStyle={styles.titleStyle}
          />
        </View>
      </ImageBackground>
      <Modal animationType={'slide'} visible={showVerifyAccModal}>
        <View style={styles.modalContainer}>
          <VerifyAccAlert width={250} height={200} />
          <Text style={styles.alertHeader}>Please confirm your email.</Text>
          <Text style={styles.alertMessage}>
            To secure your account, we need to verify your email. Please check
            your inbox or spam/junk folder for a confirmation email and then
            continue to login.{'\n\n'}{' '}
            <Text style={{fontFamily: Typography.FONT_FAMILY_ITALIC}}>
              If you didn’t receive an email please try logging in again and
              we’ll send you another email.
            </Text>
          </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={handleLogin}>
            <LinearGradient
              useAngle
              angle={135}
              angleCenter={{x: 0.5, y: 0.5}}
              colors={Colors.GREEN_GRADIENT_ARR}
              style={[styles.addSiteBtn, styles.justifyContentCenter]}>
              <Text style={styles.emptySiteText}>Continue to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

export default Login;

const styles = StyleSheet.create({
  justifyContentCenter: {
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  image: {
    flex: 1,
    justifyContent: 'center',
  },
  btnContainer: {
    bottom: 50,
    alignSelf: 'center',
    position: 'absolute',
  },
  btn: {
    width: 311,
    marginVertical: 10,
    backgroundColor: Colors.GRADIENT_PRIMARY,
  },
  titleStyle: {
    color: Colors.WHITE,
  },
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 22,
    backgroundColor: Colors.WHITE,
  },
  alertHeader: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontSize: Typography.FONT_SIZE_22,
    lineHeight: Typography.LINE_HEIGHT_24,
    color: Colors.BLACK,
    marginVertical: 16,
  },
  alertMessage: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_16,
    lineHeight: Typography.LINE_HEIGHT_24,
    color: Colors.BLACK,
    textAlign: 'center',
  },
  emptySiteCon: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  addSiteBtn: {
    marginVertical: 32,
    borderRadius: 300,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 50,
  },
  emptySiteText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.WHITE,
  },
});
