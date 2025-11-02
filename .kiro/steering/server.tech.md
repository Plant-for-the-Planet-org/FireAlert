# Server Technology Stack (apps/server)

## Framework & Core

- **Framework**: Next.js 13+ with TypeScript
- **API Layer**: tRPC for type-safe APIs with React Query integration
- **Runtime**: Node.js 22.x
- **React Query**: Integrated via tRPC for client-side data fetching, caching, and synchronization. Provides `useQuery` and `useMutation` hooks for server state management
- **MapLibre GL**: Used via `react-map-gl/maplibre` for interactive maps with custom styling, markers, and polygon rendering. Replaces Mapbox GL for open-source mapping
- **Zod**: Schema validation library for type-safe API inputs/outputs, form validation, and runtime type checking. Integrated with tRPC for automatic request validation

## Database & ORM

- **Database**: PostgreSQL with PostGIS extensions
- **ORM**: Prisma with custom migrations for PostGIS
- **Geospatial**: PostGIS for geometry operations and intersections

## Authentication & Security

- **Authentication**: Auth0 integration
- **Monitoring**: Sentry error tracking

## Notifications & Communication

- **SMS**: Twilio integration
- **Email**: Nodemailer
- **Push Notifications**: OneSignal

## Database Commands

```bash
# Deploy migrations to database
yarn server db:deploy

# Reset database (destructive)
yarn server db:reset

# Generate Prisma client
yarn server db:generate

# Open Prisma Studio
yarn server db:studio

# Create new migration
yarn server db:migrate

# Push schema changes without migration
yarn server db:push
```

## Environment Variables

### Database Configuration

- **`DATABASE_URL`**: Primary PostgreSQL connection string with connection pooling for application queries
- **`DATABASE_PRISMA_URL`**: Prisma-specific database URL, typically same as DATABASE_URL for connection pooling
- **`DATABASE_URL_NON_POOLING`**: Direct PostgreSQL connection without pooling, required for Prisma migrations and schema operations

### Authentication & Security

- **`RN_AUTH0_CLIENT_ID`**: Auth0 client ID for React Native mobile app authentication
- **`RN_AUTH0_DOMAIN`**: Auth0 domain for React Native authentication (accounts.plant-for-the-planet.org)
- **`NEXT_AUTH0_CLIENT_ID`**: Auth0 client ID for Next.js web application authentication
- **`NEXT_AUTH0_CLIENT_SECRET`**: Auth0 client secret for server-side authentication flows
- **`AUTH0_DOMAIN`**: Auth0 domain URL for web application authentication
- **`AUTH0_ISSUER`**: Auth0 issuer identifier for JWT token validation (urn:plant-for-the-planet)
- **`NEXTAUTH_SECRET`**: Secret key for NextAuth.js session encryption and JWT signing
- **`NEXTAUTH_URL`**: Base URL for NextAuth.js callbacks and redirects (http://localhost:3000)

### Mapping & Geospatial Services

- **`MAPBOXGL_ACCCESS_TOKEN`**: Mapbox access token for map rendering and geocoding services
- **`MAPBOXGL_DOWNLOAD_TOKEN`**: Mapbox token for downloading map tiles and offline map data

### NASA FIRMS Integration

- **`FIRMS_MAP_KEY`**: NASA FIRMS API key for accessing fire/heat anomaly satellite data from MODIS, VIIRS, and other sensors

### Communication & Notifications

#### SMS & Voice (Twilio)

- **`TWILIO_ACCOUNT_SID`**: Twilio account identifier for SMS and voice services
- **`TWILIO_AUTH_TOKEN`**: Twilio authentication token for API access
- **`TWILIO_PHONE_NUMBER`**: Twilio phone number for sending SMS notifications (+12293215210)
- **`TWILIO_WHATSAPP_NUMBER`**: Twilio WhatsApp Business number for WhatsApp notifications (+12293215210)

#### Email (SMTP)

- **`SMTP_URL`**: SMTP server connection string for email delivery (Mailtrap sandbox for development)
- **`EMAIL_FROM`**: Default sender email address and display name for outgoing emails

#### Push Notifications (OneSignal)

- **`ONESIGNAL_APP_ID`**: OneSignal application ID for mobile push notifications
- **`ONESIGNAL_REST_API_KEY`**: OneSignal REST API key for sending push notifications programmatically

#### WhatsApp Integration

- **`WHATSAPP_ENDPOINT_URL`**: External webhook URL for WhatsApp message delivery via automation platform
- **`WHATSAPP_ENDPOINT_AUTH_TOKEN`**: Authentication token for WhatsApp webhook endpoint

### External Platform Integration

- **`PLANET_API_URL`**: Plant-for-the-Planet platform API URL for project and site synchronization (https://app.plant-for-the-planet.org)
- **`SLACK_KEY_SITE_NOTIFICATIONS`**: Slack webhook URL for internal site notification alerts to development team

### Monitoring & Error Tracking

- **`NEXT_PUBLIC_SENTRY_DSN`**: Sentry Data Source Name for error tracking and performance monitoring (client-side accessible)

### Application Configuration

- **`NODE_ENV`**: Node.js environment mode (development/production) affecting logging, caching, and error handling
- **`PUBLIC_API_CACHING`**: Boolean flag to enable/disable API response caching (false for development)

### Feature Flags

- **`ENABLE_INCIDENT_NOTIFICATIONS`**: Boolean flag to enable incident-based notification system
- **`ENABLE_ENHANCED_STATUS_TRACKING`**: Boolean flag to enable enhanced notification delivery status tracking
- **`NOTIFICATION_MODE`**: Notification delivery mode configuration (INCIDENT_ONLY for incident-based alerts only)

## Environment Configuration

- Uses `dotenv -e ../../.env` to load root environment file
- Also uses Next.js default `.env` & `.env.local` fallback for local development
- Requires `DATABASE_URL` and `DATABASE_URL_NON_POOLING` (non-pooling for migrations)
- Prisma generates client automatically on `yarn install`
