import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

// import {Login} from '../../screens';
import Login from '../../screens/Login/Login';

const screenOptions = {headerShown: false};
const Stack = createNativeStackNavigator();

const SignInStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={Login} />
    </Stack.Navigator>
  );
};

export default SignInStack;
