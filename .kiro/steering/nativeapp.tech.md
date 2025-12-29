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

## Build System

- **Metro**: React Native bundler with custom configuration
- **Babel**: Configured via `babel.config.js`
- **TypeScript**: Strict mode with shared tsconfig packages
