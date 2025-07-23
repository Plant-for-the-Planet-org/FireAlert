import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

// import {
//   Otp,
//   Verification,
//   SelectLocation,
//   CreatePolygon,
//   UploadPolygon,
//   ProtectedAreas,
// } from '../../screens';
import CreatePolygon from '../../screens/CreatePolygon/CreatePolygon';
import ProtectedAreas from '../../screens/ProtectedAreas/ProtectedAreas';
import Verification from '../../screens/Verification/Verification';
import Otp from '../../screens/Verification/Otp';
import SelectLocation from '../../screens/selectLocation/SelectLocation';
import UploadPolygon from '../../screens/uploadPolygon/UploadPolygon';
import BottomTab from '../bottomTab/BottomTab';
// import Config from 'react-native-config';
// import MapboxGL from '@rnmapbox/maps';

const screenOptions = {headerShown: false};
const Stack = createNativeStackNavigator();

// MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN!);

const CommonStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="BottomTab" component={BottomTab} />
      <Stack.Screen name="CreatePolygon" component={CreatePolygon} />
      <Stack.Screen name="ProtectedAreas" component={ProtectedAreas} />
      <Stack.Screen name="Verification" component={Verification} />
      <Stack.Screen name="Otp" component={Otp} />
      <Stack.Screen name="SelectLocation" component={SelectLocation} />
      <Stack.Screen name="UploadPolygon" component={UploadPolygon} />
    </Stack.Navigator>
  );
};

export default CommonStack;
