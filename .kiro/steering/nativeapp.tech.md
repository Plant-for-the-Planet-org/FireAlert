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
- **Push Notifications**: Firebase Cloud Messaging (`@react-native-firebase/messaging` 25.x) with Notifee for permission, Android channel and foreground banners

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

- **`API_URL`**: Primary tRPC API endpoint for server communication. Used for all API calls from the mobile app. Currently configured to point to the feature branch deployment.

  - **Local Development**: `http://localhost:3000/api/trpc` (for iOS simulator) or `http://10.0.2.2:3000/api/trpc` (for Android emulator)
  - **Feature Branch**: `https://fire-alert-git-feature-upgrade-rn-planetapp.vercel.app/api/trpc` (current active)
  - **Develop Branch**: `https://fire-alert-git-develop-planetapp.vercel.app/api/trpc`
  - **Production**: `https://firealert.plant-for-the-planet.org/api/trpc`

- **`NEXT_API_URL`**: Alternative API endpoint URL. Typically mirrors `API_URL` for consistency. Used as fallback or in specific contexts where a different endpoint is needed.

### Authentication

- **`AUTH0_CLIENT_ID`**: Auth0 client ID for React Native application authentication. Enables users to authenticate via Auth0 and Plant-for-the-Planet SSO integration.

  - **Current Value**: `Y7sMIeKHYT0P9rS3d4ICJZVzZWGyN7Zq`

- **`AUTH0_DOMAIN`**: Auth0 domain URL for authentication services. Specifies the Auth0 tenant endpoint for token validation and user authentication.
  - **Current Value**: `https://accounts.plant-for-the-planet.org`

### Push Notifications

- No `.env` value is needed. Firebase config comes from native files:
  - Android: `android/app/google-services.json`
  - iOS: `ios/FireAlert/GoogleService-Info.plist`
- The app registers its FCM token as a `device` alert method with `pushProvider: FCM`.
- `ONESIGNAL_APP_ID` was removed. Older app versions still use OneSignal until users update.

### Mapping Services

- **`MAPBOXGL_ACCCESS_TOKEN`**: Mapbox access token for map rendering and geocoding in React Native. Enables interactive map display and tile rendering.

  - **Current Value**: `sk.eyJ1IjoibWF5YW5rNHBsYW50LWZvci10aGUtcGxhbmV0IiwiYSI6ImNsZnFsYjc0eDAwZzIzdG8xNzY1Y3R5N28ifQ.rCuy0XY72xLiEQcpSWf5wA`

- **`MAPBOXGL_DOWNLOAD_TOKEN`**: Mapbox token for downloading map tiles and offline map functionality. Allows users to cache map data for offline access.
  - **Current Value**: `sk.eyJ1IjoibWF5YW5rNHBsYW50LWZvci10aGUtcGxhbmV0IiwiYSI6ImNsZnFsYjc0eDAwZzIzdG8xNzY1Y3R5N28ifQ.rCuy0XY72xLiEQcpSWf5wA`

### Monitoring & Error Tracking

- **`SENTRY_DSN`**: Sentry Data Source Name for mobile app error tracking and crash reporting. Captures and reports runtime errors and exceptions to Sentry for monitoring and debugging.
  - **Current Value**: `https://c85480b06dd2420da626df3bc480ae01@o78291.ingest.sentry.io/4505130964615168`

### Environment-Specific Configuration

The `.env` file supports multiple deployment environments. Uncomment the desired API endpoint configuration based on your development or deployment target:

- **Local Development**: Use `http://localhost:3000/api/trpc` for iOS simulator or `http://10.0.2.2:3000/api/trpc` for Android emulator when running the server locally
- **Feature Branch Testing**: Use `https://fire-alert-git-feature-upgrade-rn-planetapp.vercel.app/api/trpc` for testing new features on Vercel preview deployments
- **Develop Branch**: Use `https://fire-alert-git-develop-planetapp.vercel.app/api/trpc` for testing against the develop branch deployment
- **Production**: Use `https://firealert.plant-for-the-planet.org/api/trpc` for production environment

## Build System

- **Metro**: React Native bundler with custom configuration
- **Babel**: Configured via `babel.config.js`
- **TypeScript**: Strict mode with shared tsconfig packages
