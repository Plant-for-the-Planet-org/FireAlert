/**
 * @format
 */
console.log('INDEX.JS IS BEING Loaded.');

import {AppRegistry} from 'react-native';
import App from './app/App.tsx';
import {name as appName} from './app.json';

console.log('INDEX.JS IS BEING Executed');

AppRegistry.registerComponent(appName, () => App);

// ------------------------------------------------------------

// /**
//  * @format
//  */
// console.log('INDEX.JS IS BEING Loaded.');

// import {AppRegistry} from 'react-native';
// console.log('React Native imported successfully');

// import App from './app/App';
// console.log('App component loaded successfully');

// import {name as appName} from './app.json';
// console.log('App name:', appName);

// console.log('INDEX.JS IS BEING Executed');

// AppRegistry.registerComponent(appName, () => App);
// console.log('Component registered successfully');
