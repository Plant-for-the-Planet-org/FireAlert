/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './apps/nativeapp/app/App.tsx';
import { name as appName } from './apps/nativeapp/app.json';

AppRegistry.registerComponent(appName, () => App);
