// Mock React Native modules
// Note: NativeAnimatedHelper mock removed as it's not needed for these tests

// Mock @rnmapbox/maps
jest.mock('@rnmapbox/maps', () => ({
  MapView: 'MapView',
  Camera: 'Camera',
  UserLocation: 'UserLocation',
  ShapeSource: 'ShapeSource',
  FillLayer: 'FillLayer',
  LineLayer: 'LineLayer',
  PointAnnotation: 'PointAnnotation',
  Images: 'Images',
  StyleURL: {
    Street: 'mapbox://styles/mapbox/streets-v11',
    Satellite: 'mapbox://styles/mapbox/satellite-v9',
  },
}));

// Mock react-native-geolocation-service
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
}));

// Mock moment-timezone
jest.mock('moment-timezone', () => {
  const moment = jest.requireActual('moment-timezone');
  return moment;
});

// Mock tRPC
jest.mock('./app/services/trpc', () => ({
  trpc: {
    useContext: jest.fn(),
  },
}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
