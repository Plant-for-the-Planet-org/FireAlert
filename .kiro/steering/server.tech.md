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

### Authentication & Authorization

- **`RN_AUTH0_CLIENT_ID`**: Auth0 client ID for React Native mobile app authentication
- **`RN_AUTH0_DOMAIN`**: Auth0 domain for mobile app authentication (e.g., `accounts.plant-for-the-planet.org`)
- **`NEXT_AUTH0_CLIENT_ID`**: Auth0 client ID for Next.js web application authentication
- **`NEXT_AUTH0_CLIENT_SECRET`**: Auth0 client secret for server-side authentication flows
- **`AUTH0_DOMAIN`**: Full Auth0 domain URL for web application (e.g., `https://accounts.plant-for-the-planet.org`)
- **`AUTH0_ISSUER`**: Auth0 issuer identifier for token validation (e.g., `urn:plant-for-the-planet`)
- **`NEXTAUTH_SECRET`**: Secret key for NextAuth.js session encryption and JWT signing
- **`NEXTAUTH_URL`**: Base URL for NextAuth.js callbacks and redirects (e.g., `http://localhost:3000`)

### Database Configuration

- **`DATABASE_URL`**: Primary PostgreSQL connection string with connection pooling for application queries
- **`DATABASE_PRISMA_URL`**: Prisma-specific database connection string (typically same as DATABASE_URL)
- **`DATABASE_URL_NON_POOLING`**: Direct PostgreSQL connection without pooling, required for Prisma migrations
- **`DATABASE_URL_NON_POOLING_SHADOW`**: Shadow database connection for Prisma migration validation and testing

### Mapping & Geospatial

- **`MAPBOXGL_ACCCESS_TOKEN`**: Mapbox API access token for map rendering and tile services
- **`MAPBOXGL_DOWNLOAD_TOKEN`**: Mapbox token for downloading map tiles and assets

### Notification Services

#### SMS & Voice (Twilio)

- **`TWILIO_ACCOUNT_SID`**: Twilio account identifier for SMS and voice services
- **`TWILIO_AUTH_TOKEN`**: Twilio authentication token for API requests
- **`TWILIO_PHONE_NUMBER`**: Twilio phone number for sending SMS notifications
- **`TWILIO_WHATSAPP_NUMBER`**: Twilio WhatsApp-enabled number for WhatsApp messages

#### Email (SMTP)

- **`SMTP_URL`**: SMTP server connection URL for email delivery (format: `smtp://username:password@host:port`)
- **`EMAIL_FROM`**: Default sender email address and display name for outgoing emails

#### Push Notifications (OneSignal)

- **`ONESIGNAL_APP_ID`**: OneSignal application ID for push notification delivery
- **`ONESIGNAL_REST_API_KEY`**: OneSignal REST API key for server-side push notification operations

#### WhatsApp Integration

- **`WHATSAPP_ENDPOINT_URL`**: Webhook endpoint URL for WhatsApp message delivery
- **`WHATSAPP_ENDPOINT_AUTH_TOKEN`**: Authentication token for WhatsApp webhook requests

### External Integrations

- **`PLANET_API_URL`**: Plant-for-the-Planet platform API base URL for project synchronization
- **`FIRMS_MAP_KEY`**: NASA FIRMS (Fire Information for Resource Management System) API key for accessing fire/heat anomaly data
- **`SLACK_KEY_SITE_NOTIFICATIONS`**: Slack webhook URL for internal site notification alerts

### Monitoring & Error Tracking

- **`NEXT_PUBLIC_SENTRY_DSN`**: Sentry Data Source Name for error tracking and monitoring (public, exposed to client)

### Application Configuration

- **`NODE_ENV`**: Node.js environment mode (`development`, `production`, `test`)
- **`PUBLIC_API_CACHING`**: Enable/disable API response caching (`true`/`false`)

### Feature Flags

- **`ENABLE_INCIDENT_NOTIFICATIONS`**: Enable/disable incident-based notification system (`true`/`false`)
- **`ENABLE_ENHANCED_STATUS_TRACKING`**: Enable enhanced status tracking for notifications with detailed delivery states (`true`/`false`)
- **`NOTIFICATION_MODE`**: Controls notification behavior mode:
  - `INCIDENT_ONLY`: Only send notifications for new incidents
  - Other modes may include per-event or aggregated notifications
- **`USE_REFACTORED_PIPELINE`**: Toggle between legacy and refactored geo-event-fetcher implementations
  - `'true'`: Use new service layer architecture with dependency injection
  - `'false'`: Use legacy inline implementation
  - Enables safe rollout and rollback capability for the refactored pipeline
  - Note: Values must be strings (`'true'` or `'false'`), not booleans

## Environment Configuration

- Uses `dotenv -e ../../.env` to load root environment file
- Also uses Next.js default `.env` & `.env.local` fallback for local development
- Requires `DATABASE_URL` and `DATABASE_URL_NON_POOLING` (non-pooling for migrations)
- Prisma generates client automatically on `yarn install`
