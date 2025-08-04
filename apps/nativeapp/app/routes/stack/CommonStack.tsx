import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import // Otp,
// Verification,
// SelectLocation,
// CreatePolygon,
// UploadPolygon,
// ProtectedAreas,
'../../screens';
import BottomTab from '../bottomTab/BottomTab';

const screenOptions = {headerShown: false};
const Stack = createNativeStackNavigator();

const CommonStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="BottomTab" component={BottomTab} />
      {/* <Stack.Screen name="CreatePolygon" component={CreatePolygon} /> */}
      {/* <Stack.Screen name="ProtectedAreas" component={ProtectedAreas} /> */}
      {/* <Stack.Screen name="Verification" component={Verification} />
      <Stack.Screen name="Otp" component={Otp} />
      <Stack.Screen name="SelectLocation" component={SelectLocation} /> */}
      {/* <Stack.Screen name="UploadPolygon" component={UploadPolygon} /> */}
    </Stack.Navigator>
  );
};

export default CommonStack;
