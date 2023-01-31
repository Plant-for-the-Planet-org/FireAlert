import React from 'react';
import RadialGradient from 'react-native-radial-gradient';
import {StatusBar, StyleSheet, TouchableOpacity, View} from 'react-native';

import {Colors} from '../../styles';
import {CustomButton} from '../../components';
import {CrossIcon, Logo} from '../../assets/svgs';

const RADIUS = 200;
const CENTER_ARR = [187.5, 270.6];
const GRADIENT_ARR = [Colors.PRIMARY_DARK, Colors.GRADIENT_PRIMARY];

const Login = () => {
  return (
    <>
      <StatusBar translucent backgroundColor={Colors.TRANSPARENT} />
      <RadialGradient
        radius={RADIUS}
        center={CENTER_ARR}
        style={styles.container}
        colors={GRADIENT_ARR}>
        <TouchableOpacity style={styles.crossContainer}>
          <CrossIcon fill={Colors.WHITE} />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Logo />
        </View>
        <View style={styles.btnContainer}>
          <CustomButton
            title="Sign Up"
            style={styles.btn}
            titleStyle={styles.titleStyle}
          />
          <CustomButton
            title="Log In"
            style={styles.btn}
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
  crossContainer: {
    position: 'absolute',
    top: 40,
    left: 32,
  },
  logoContainer: {
    position: 'absolute',
    top: 198,
    left: 102,
  },
  btnContainer: {
    top: 551,
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
