module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./app/assets/fonts'],
  reactNativePath: '../../node_modules/react-native',
  // Disable TurboModules for Mapbox (React Native ≥ 0.72, which defaults to TurboModules/Codegen & Mapbox ≤ 10.1.27, which wasn't designed for TurboModules)
  dependencies: {
    '@rnmapbox/maps': {
      platforms: {
        ios: null, // optional if you want to skip linking iOS entirely
      },
    },
  },
};
