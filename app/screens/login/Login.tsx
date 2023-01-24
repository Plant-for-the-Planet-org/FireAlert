import React from 'react';
import {StyleSheet, View} from 'react-native';
import RadialGradient from 'react-native-radial-gradient';

import {Colors} from '../../styles';
import {Logo} from '../../assets/svgs';
import {CustomButton} from '../../components';

const Login = () => {
  return (
    <RadialGradient
      style={styles.container}
      colors={[Colors.PRIMARY_DARK, '#E86F56']}
      // stops={[0, 187.5]}
      center={[187.5, 270.6]}
      radius={200}>
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
