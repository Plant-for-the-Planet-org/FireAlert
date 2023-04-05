#!/bin/sh

echo "Xcode version:"
xcodebuild -version
echo "Brew version:"
brew --version
echo "PATH:"
echo $PATH

# Install CocoaPods and npm using Homebrew.
echo "Install CocoaPods"
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods
echo "Install npm"
brew install npm

echo "Pod version:"
pod --version
echo "Node version:"
node --version
echo "NPM version:"
npm --version
echo "PATH:"
echo $PATH

# Setting Environment Variables
cd ../..
echo "no env yet"
echo "MAPBOXGL_ACCCESS_TOKEN=$MAPBOXGL_ACCCESS_TOKEN" >> .env
echo "BUGSNAP_CLIENT_KEY=$BUGSNAP_CLIENT_KEY" >> .env
echo "API_URL=$API_URL" >> .env
echo "AUTH0_CLIENT_ID=$AUTH0_CLIENT_ID" >> .env
echo "AUTH0_DOMAIN=$AUTH0_DOMAIN" >> .env
cp .env $ENV_FILENAME
echo "ENV_FILENAME is $ENV_FILENAME"
cat $ENV_FILENAME

# Create .netrc file for Mapbox SDK download
touch ~/.netrc
chmod 600 ~/.netrc
echo "machine api.mapbox.com" >> ~/.netrc
echo "  login mapbox" >> ~/.netrc
echo "  password $MAPBOXGL_DOWNLOAD_TOKEN" >> ~/.netrc

# Install dependencies
echo "Running npm install"
npm install
echo "Running pod install"
cd ios
pod install
