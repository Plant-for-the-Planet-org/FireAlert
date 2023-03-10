# FireAlert App
FireAlert is open source application based on react-native licensed under terms of GPL v3. It is managed by [Plant-for-the-Planet Foundation](https://www.plant-for-the-planet.org/) and open source contributors.

For contributions please read our [contribution guide](https://github.com/Plant-for-the-Planet-org/FireAlert/blob/develop/CONTRIBUTING.md) as well as our [code of conduct](https://github.com/Plant-for-the-Planet-org/FireAlert/blob/develop/CODE_OF_CONDUCT.md) and the following information:

## Directory Structure

`ios` houses the iOS project files and `android` contains Android project files. The `app` contains the react code base for all platform.

`index.js` is the entry point of both iOS and android platform build process.

## Configuration

Copy `.env.sample` to `.env` and add the necessary API keys for your development environment.
Install nvm following instructions from https://github.com/nvm-sh/nvm#install--update-script
Run `nvm install && nvm use` to install and use required version of node.

## Configure your secret token for Mapbox

Your secret token enables you to download the SDK directly from Mapbox. To use your secret token, you will need to store it in a `.netrc` file in your home directory (not your project folder).
```
machine api.mapbox.com
login mapbox
password YOUR_SECRET_MAPBOX_ACCESS_TOKEN
```

## iOS Setup

* Install latest Xcode.
* Run following commands
```
npm install
cd ios && pod install
```

### Running into iOS simulator

Build and run the app in development mode deployed from Metro Bundler in an iOS simulator (starts Metro Bundler automatically if not already running, also starts iOS simulator):

```
bash
npm run ios
```

If you have problems with a cached version of the bundle, you can stop the Metro Bundler and manually start it with the reset cache option:

```
react-native start --reset-cache
```

## Android Setup

Steps for setting up Dev Env for android on MAC is as follows:

* Install Latest Android Studio with latest SDK and build tools
* Run following commands

```
bash
npm install
```

### Running into Android emulator

Build and run the app in development mode deployed from Metro Bundler (starts Metro Bundler automatically if not already running) on an emulator or device. You need to start an Android emulator or attach a device manually before:

```
bash
npm run android
```

If you have problems with a cached version of the bundle, you can stop the Metro Bundler and manually start it with the reset cache option:

```
react-native start --reset-cache
```

## Development process

This project uses GitFlow (https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow) with Main-Branch `main` and Development-Branch `develop`.

## Versioning

*App Versioning Guide*

eg: Version M.F.B
V 1.1.10

M = Major Changes
F = Feature Addition
B = Critical Bug Fixes and Additions

Release candidate can have the target version number
V 1.1.`11` RC `1`

Beta and Alpha builds can also have target version number
V 1.1.`11` B `12`
V 1.1.`11` A `12` [increment per release]


## Supporters
The deployment and production of this app is also possible due to support from open-source software contributors.
<a href="https://www.browserstack.com">
<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTPH0TU07S98aX7O5PbjVtOwLz5Q-8IAnaRWn6tv_qkxKaAedd9" height="24"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
<a href="https://www.bugsnag.com">
<img src="https://global-uploads.webflow.com/5c741219fd0819540590e785/5c741219fd0819856890e790_asset%2039.svg" height="24"></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
<a href="https://lingohub.com">
<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQqJ0vVrXzxzszvleoGhXuxpMFlGueY5UfBEP-HPtTVTH2j29hv" height="30"></a>
