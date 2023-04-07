const path = require('path');

module.exports = (async () => {
  return {
    watchFolders: [path.resolve(__dirname, '../../')],
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: false,
        },
      }),
    },
  };
})();
