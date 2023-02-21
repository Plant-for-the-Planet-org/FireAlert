import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {Home, CreatePolygon, Settings, Verification, Otp} from '../../screens';

const screenOptions = {headerShown: false};
const Stack = createNativeStackNavigator();

const CommonStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="CreatePolygon" component={CreatePolygon} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="Verification" component={Verification} />
      <Stack.Screen name="Otp" component={Otp} />
    </Stack.Navigator>
  );
};

export default CommonStack;
