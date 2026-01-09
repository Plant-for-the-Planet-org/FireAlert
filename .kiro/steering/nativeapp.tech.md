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

### Push Notifications

- **`ONESIGNAL_APP_ID`**: OneSignal application ID for push notification delivery. This must match the server-side OneSignal configuration to ensure proper device registration and notification delivery. The app ID identifies the specific OneSignal project and enables device subscription management.

### Authentication

- **`AUTH0_CLIENT_ID`**: Auth0 client ID for React Native mobile app authentication. Used for user login, token validation, and secure API access.
- **`AUTH0_DOMAIN`**: Auth0 domain URL for authentication services (e.g., `https://accounts.plant-for-the-planet.org`). Handles user authentication flows and token management.

### Mapping & Geospatial

- **`MAPBOXGL_ACCCESS_TOKEN`**: Mapbox API access token for map rendering and tile services in the mobile application. Enables interactive maps, satellite imagery, and geospatial visualizations.
- **`MAPBOXGL_DOWNLOAD_TOKEN`**: Mapbox token for downloading map tiles and offline map assets. Used for caching map data and offline functionality.

### API Configuration

- **`NEXT_API_URL`**: Primary API endpoint URL for tRPC client communication with the server application. Points to the Next.js server's tRPC API routes.
- **`API_URL`**: Alternative API endpoint URL, typically used as fallback or for specific API operations. Should match `NEXT_API_URL` in most configurations.

### Monitoring & Error Tracking

- **`SENTRY_DSN`**: Sentry Data Source Name for mobile app error tracking and crash reporting. Enables automatic error collection and performance monitoring for the React Native application.

### Development Configuration

The environment file supports multiple configurations:

- **Production**: Uses live OneSignal app ID and production API endpoints
- **Local Development**: Commented configurations for local server (`localhost:3000` or `10.0.2.2:3000` for Android emulator)
- **Staging**: Commented configurations for Vercel deployment branches
- **Environment Switching**: Easy switching between development, staging, and production environments

## Build System

- **Metro**: React Native bundler with custom configuration
- **Babel**: Configured via `babel.config.js`
- **TypeScript**: Strict mode with shared tsconfig packages
