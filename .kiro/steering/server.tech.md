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
- **`DATABASE_PRISMA_URL`**: Prisma-specific database URL, typically same as DATABASE_URL but may use pooled connections on Vercel
- **`DATABASE_URL_NON_POOLING`**: Direct PostgreSQL connection without pooling, required for migrations and schema operations
- **`DATABASE_LOG_SLOWQUERY`**: Boolean flag to enable slow query logging for database performance monitoring (default: false)

### Authentication & Security

- **`AUTH0_DOMAIN`**: Auth0 domain URL for authentication services (e.g., "https://accounts.plant-for-the-planet.org")
- **`AUTH0_ISSUER`**: Auth0 issuer identifier for token validation (e.g., "urn:plant-for-the-planet")
- **`NEXT_AUTH0_CLIENT_ID`**: Auth0 client ID for Next.js application authentication
- **`NEXT_AUTH0_CLIENT_SECRET`**: Auth0 client secret for secure authentication flows
- **`RN_AUTH0_CLIENT_ID`**: Auth0 client ID specifically for React Native mobile application
- **`RN_AUTH0_DOMAIN`**: Auth0 domain for React Native mobile application authentication
- **`NEXTAUTH_SECRET`**: Secret key for NextAuth.js session encryption and JWT signing
- **`NEXTAUTH_URL`**: Base URL for NextAuth.js callbacks and redirects (e.g., "http://localhost:3000")
- **`CRON_KEY`**: Security key for authenticating CRON job endpoints to prevent unauthorized access

### Mapping & Geospatial Services

- **`MAPBOXGL_ACCCESS_TOKEN`**: Mapbox access token for map rendering and geocoding services
- **`MAPBOXGL_DOWNLOAD_TOKEN`**: Mapbox token for downloading map tiles and offline map data
- **`FIRMS_MAP_KEY`**: NASA FIRMS API key for accessing fire and thermal anomaly data

### Communication & Notifications

#### SMS & Voice (Twilio)

- **`TWILIO_ACCOUNT_SID`**: Twilio account identifier for SMS and voice services
- **`TWILIO_AUTH_TOKEN`**: Twilio authentication token for API access
- **`TWILIO_PHONE_NUMBER`**: Twilio phone number for sending SMS notifications (e.g., "+12293215210")
- **`TWILIO_WHATSAPP_NUMBER`**: Twilio WhatsApp Business number for WhatsApp notifications

#### Email (SMTP)

- **`SMTP_URL`**: SMTP server connection string for email delivery (e.g., "smtp://user:pass@server:port")
- **`EMAIL_FROM`**: Default sender address for outgoing emails (e.g., "FireAlert <firealert@plant-for-the-planet.org>")

#### Push Notifications (OneSignal)

- **`ONESIGNAL_APP_ID`**: OneSignal application ID for push notification services
- **`ONESIGNAL_REST_API_KEY`**: OneSignal REST API key for sending push notifications

#### WhatsApp Integration

- **`WHATSAPP_ENDPOINT_URL`**: Custom WhatsApp webhook endpoint for message delivery
- **`WHATSAPP_ENDPOINT_AUTH_TOKEN`**: Authentication token for WhatsApp webhook endpoint

### Monitoring & Logging

- **`NEXT_PUBLIC_SENTRY_DSN`**: Sentry Data Source Name for error tracking and performance monitoring
- **`SENTRY_IGNORE_API_RESOLUTION_ERROR`**: Boolean flag to ignore API resolution errors in Sentry reporting
- **`NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN`**: Logtail token for centralized logging (optional)
- **`SLACK_KEY_SITE_NOTIFICATIONS`**: Slack webhook URL for site notification alerts

### Feature Flags & Configuration

- **`ALERT_SMS_DISABLED`**: Boolean flag to disable SMS notifications system-wide (default: true)
- **`ALERT_WHATSAPP_DISABLED`**: Boolean flag to disable WhatsApp notifications system-wide (default: true)
- **`PUBLIC_API_CACHING`**: Boolean flag to enable/disable API response caching (auto-enabled in production)
- **`NOTIFICATION_BATCH_SIZE`**: Number of notifications to process in each batch (default: "10")
- **`USE_REFACTORED_PIPELINE`**: Boolean flag for CRON refactor - set to 'true' to use new service layer architecture, 'false' for legacy implementation. Controls whether the system uses the modernized service-based pipeline or the original implementation for processing fire detection data and notifications
- **`ENABLE_INCIDENT_NOTIFICATIONS`**: Boolean flag to enable fire incident tracking notifications
- **`INCIDENT_INACTIVITY_HOURS`**: Hours of inactivity before marking fire incident as resolved (default: 6)

### External Platform Integration

- **`PLANET_API_URL`**: Plant-for-the-Planet platform API URL for project synchronization (default: "https://app.plant-for-the-planet.org")

### Development & Runtime

- **`NEXT_PUBLIC_HOST`**: Base URL for the Next.js application, used for generating absolute URLs in client-side code and API responses (e.g., "http://localhost:3000" for development, "https://firealert.plant-for-the-planet.org" for production)
- **`NODE_ENV`**: Node.js environment mode ("development", "test", "production")
- **`SKIP_ENV_VALIDATION`**: Boolean flag to skip environment variable validation during startup

## Environment Configuration

- Uses `dotenv -e ../../.env` to load root environment file
- Also uses Next.js default `.env` & `.env.local` fallback for local development
- Requires `DATABASE_URL` and `DATABASE_URL_NON_POOLING` (non-pooling for migrations)
- Prisma generates client automatically on `yarn install`
