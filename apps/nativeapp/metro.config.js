const {getMetroTools} = require('react-native-monorepo-tools');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const monorepoMetroTools = getMetroTools();

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  watchFolders: [
    // Include monorepo root and node_modules
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '../../node_modules'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
    extraNodeModules: {
      ...monorepoMetroTools.extraNodeModules,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);