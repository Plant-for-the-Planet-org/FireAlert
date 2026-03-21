module.exports = {
  project: {
    ios: {
      scheme: 'firealert',
      bundleId: 'org.firealert.app',
    },
    android: {
      scheme: 'firealert',
      package: 'org.firealert.app',
    },
  },
  assets: ['./app/assets/fonts'],
  dependencies: {
    'react-native-schemes': {
      platforms: {
        ios: {
          scheme: 'firealert',
        },
      },
    },
  },
};
