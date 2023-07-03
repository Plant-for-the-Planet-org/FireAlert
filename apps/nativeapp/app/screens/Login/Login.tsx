import {
  View,
  Text,
  Modal,
  StatusBar,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import React, {useState} from 'react';
import Auth0 from 'react-native-auth0';
import Config from 'react-native-config';

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
import LinearGradient from 'react-native-linear-gradient';

const launch_screen = require('../../assets/images/launch_screen.png');

const Login = ({navigation}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showVerifyAccModal, setShowVerifyAccModal] = useState<boolean>(false);

  const dispatch = useAppDispatch();

  const handleLogin = async () => {
    setShowVerifyAccModal(false);
    setIsLoading(true);
    const auth0 = new Auth0({
      domain: Config.AUTH0_DOMAIN,
      clientId: Config.AUTH0_CLIENT_ID,
    });
    auth0.webAuth
      .authorize(
        {
          scope: 'openid email profile offline_access',
          federated: true,
          prompt: 'login',
          audience: 'urn:plant-for-the-planet',
        },
        {ephemeralSession: false},
      )
      .then(cred => {
        const request = {
          onSuccess: async message => {
            dispatch(updateIsLoggedIn(true));
            storeData('cred', cred);
            setIsLoading(false);
          },
          onFail: message => {
            setIsLoading(false);
          },
        };
        dispatch(updateAccessToken(cred?.accessToken));
        dispatch(getUserDetails(request));
      })
      .catch(err => {
        setIsLoading(false);
        if (err?.name === 'unauthorized') {
          setShowVerifyAccModal(true);
        }
      });
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
      <Modal transparent animationType={'slide'} visible={showVerifyAccModal}>
        <View style={styles.modalContainer}>
          <VerifyAccAlert width={250} height={200} />
          <Text style={styles.alertHeader}>Please confirm your email.</Text>
          <Text style={styles.alertMessage}>
            To secure your account, we need to verify your email. Please check
            your inbox or spam/junk folder for a confirmation email and then
            continue to login.{`\n\n`}{' '}
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
              style={[styles.addSiteBtn, {justifyContent: 'center'}]}>
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
