import React, {useState} from 'react';
import Auth0 from 'react-native-auth0';
import Config from 'react-native-config';
import RadialGradient from 'react-native-radial-gradient';
import {Dimensions, StatusBar, StyleSheet, View} from 'react-native';

import {Colors} from '../../styles';
import {Logo} from '../../assets/svgs';
import {useAppDispatch} from '../../hooks';
import {
  getUserDetails,
  updateIsLoggedIn,
  updateAccessToken,
} from '../../redux/slices/login/loginSlice';
import {CustomButton} from '../../components';
import {storeData} from '../../utils/localStorage';

const SCREEN_WIDTH = Dimensions.get('window').width;

const RADIUS = 200;
const CENTER_ARR = [SCREEN_WIDTH / 2, 270.6];
const GRADIENT_ARR = [Colors.PRIMARY_DARK, Colors.GRADIENT_PRIMARY];

const Login = ({navigation}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dispatch = useAppDispatch();

  const handleLogin = async () => {
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
        console.log(err);
      });
  };

  return (
    <>
      <StatusBar translucent backgroundColor={Colors.TRANSPARENT} />
      <RadialGradient
        radius={RADIUS}
        center={CENTER_ARR}
        style={styles.container}
        colors={GRADIENT_ARR}>
        <View style={styles.logoContainer}>
          <Logo />
        </View>
        <View style={styles.btnContainer}>
          <CustomButton
            title="Log In"
            style={styles.btn}
            isLoading={isLoading}
            onPress={handleLogin}
            loaderColor={Colors.PRIMARY}
            titleStyle={styles.titleStyle}
          />
        </View>
      </RadialGradient>
    </>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoContainer: {
    position: 'absolute',
    top: 198,
    width: SCREEN_WIDTH,
    alignItems: 'center',
  },
  btnContainer: {
    bottom: 50,
    alignSelf: 'center',
    position: 'absolute',
  },
  btn: {
    backgroundColor: Colors.WHITE,
    marginVertical: 10,
  },
  titleStyle: {
    color: Colors.DEEP_PRIMARY,
  },
});
