import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {Home} from '../../screens';

const screenOptions = {headerShown: false};
const Stack = createNativeStackNavigator();

const CommonStack = () => {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={Home} />
    </Stack.Navigator>
  );
};

export default CommonStack;
