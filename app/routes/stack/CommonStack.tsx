import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {Home, CreatePolygon} from '../../screens';

const screenOptions = {headerShown: false};
const Stack = createNativeStackNavigator();

const CommonStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="CreatePolygon" component={CreatePolygon} />
    </Stack.Navigator>
  );
};

export default CommonStack;
