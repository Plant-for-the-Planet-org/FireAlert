# Native App Technology Stack (apps/nativeapp)

## Framework & Core

- **Framework**: React Native 0.71+ with TypeScript
- **Navigation**: React Navigation v6
- **Runtime**: Node.js 22.x

## State Management & Data

- **State Management**: Redux Toolkit + React Query (TanStack Query)
- **Data Fetching**: React Query for caching and synchronization
- **API Integration**: tRPC client for type-safe server communication

## UI & Maps

- **Maps**: Mapbox (@rnmapbox/maps)
- **Styling**: React Native StyleSheet with theme system

## Authentication & Notifications

- **Authentication**: Auth0 React Native SDK
- **Push Notifications**: OneSignal React Native

## Date & Time

- **Date Handling**: Moment.js with timezone support

## Development Commands

```bash
# Start development server
yarn nativeapp start

# Platform specific builds
yarn nativeapp android
yarn nativeapp ios
```

## Environment Configuration

- **Environment Variables**: `react-native-config` for environment management
- **Local Config**: `.env` file in nativeapp directory
- **Code Quality**: ESLint and Prettier configured (`.prettierrc.js`)

## Environment Variables

### API Configuration

- **`API_URL`**: Primary tRPC API endpoint for server communication (e.g., "https://firealert.plant-for-the-planet.org/api/trpc")
- **`NEXT_API_URL`**: Alternative API endpoint URL, typically same as API_URL for consistency

### Authentication

- **`AUTH0_CLIENT_ID`**: Auth0 client ID for React Native application authentication
- **`AUTH0_DOMAIN`**: Auth0 domain URL for authentication services (e.g., "https://accounts.plant-for-the-planet.org")

### Push Notifications

- **`ONESIGNAL_APP_ID`**: OneSignal application ID for push notification services in mobile app

### Mapping Services

- **`MAPBOXGL_ACCCESS_TOKEN`**: Mapbox access token for map rendering and geocoding in React Native
- **`MAPBOXGL_DOWNLOAD_TOKEN`**: Mapbox token for downloading map tiles and offline map functionality

### Monitoring & Error Tracking

- **`SENTRY_DSN`**: Sentry Data Source Name for mobile app error tracking and crash reporting

### Development Configuration

Different API endpoints can be configured for various environments:

- **Production**: Points to live FireAlert server
- **Staging**: Points to staging/preview deployments
- **Local Development**: Points to localhost server (use `10.0.2.2` for Android emulator, `localhost` for iOS simulator)

## Build System

- **Metro**: React Native bundler with custom configuration
- **Babel**: Configured via `babel.config.js`
- **TypeScript**: Strict mode with shared tsconfig packages
