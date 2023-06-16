import React, {useState} from 'react';
import Auth0 from 'react-native-auth0';
import Config from 'react-native-config';
import {View, StatusBar, StyleSheet, ImageBackground} from 'react-native';

import {Colors} from '../../styles';
import {useAppDispatch} from '../../hooks';
import {
  getUserDetails,
  updateIsLoggedIn,
  updateAccessToken,
} from '../../redux/slices/login/loginSlice';
import {CustomButton} from '../../components';
import {storeData} from '../../utils/localStorage';

const launch_screen = require('../../assets/images/launch_screen.png');

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
});
