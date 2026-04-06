module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@rnmapbox|@react-navigation|@tanstack|@trpc|@turf|kdbush|supercluster|geokdbush|tinyqueue)/)',
  ],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/index.{ts,tsx}',
    '!app/assets/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
  },
  testEnvironment: 'node',
};
