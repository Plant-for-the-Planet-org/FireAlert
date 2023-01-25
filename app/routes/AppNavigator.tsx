import * as React from 'react';
import {NavigationContainer} from '@react-navigation/native';

import {CommonStack} from './stack';

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <CommonStack />
    </NavigationContainer>
  );
}
