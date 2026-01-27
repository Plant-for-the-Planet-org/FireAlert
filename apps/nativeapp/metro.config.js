const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(__dirname, '../..'); // turborepo root

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {experimentalImportSupport: false, inlineRequires: true},
    }),
  },
  watchFolders: [repoRoot, path.resolve(repoRoot, 'node_modules')],
  resolver: {
    unstable_enablePackageExports: true,
    // prefer single copies in repo root node_modules
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(repoRoot, 'node_modules'),
    ],
    extraNodeModules: new Proxy(
      {},
      {
        get: (_, name) => path.resolve(repoRoot, 'node_modules', name),
      },
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);

/* 
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(__dirname, '../..');

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {experimentalImportSupport: false, inlineRequires: true},
    }),
  },
  watchFolders: [repoRoot],
  resolver: {
    unstable_enablePackageExports: true,
    // App-local first, then root
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(repoRoot, 'node_modules'),
    ],
    // Remove extraNodeModules proxy - it forces root resolution
    resolveRequest: (context, moduleName, platform) => {
      // Force app-local resolution for critical packages
      if (
        moduleName.startsWith('@tanstack/') ||
        moduleName.startsWith('@trpc/')
      ) {
        const localPath = path.resolve(projectRoot, 'node_modules', moduleName);
        try {
          require.resolve(localPath);
          return context.resolveRequest(context, localPath, platform);
        } catch {}
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
 */

/* 
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
 */
