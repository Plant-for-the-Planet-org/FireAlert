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

The application supports multiple database configurations for different environments. Uncomment the appropriate set based on your needs:

#### Production/Development (Supabase)

- **`DATABASE_URL`**: PostgreSQL connection string with connection pooling for general database operations. Points to Supabase pooler for production/staging environments
- **`DATABASE_PRISMA_URL`**: Prisma-specific database connection URL (typically same as DATABASE_URL for pooled connections)
- **`DATABASE_URL_NON_POOLING`**: Direct PostgreSQL connection without pooling, required for Prisma migrations and schema operations. Essential for running `yarn server db:migrate` and `yarn server db:deploy`
- **`DATABASE_URL_NON_POOLING_SHADOW`**: Shadow database URL for Prisma migration testing and validation during development

#### Local Development (Default Database)

Uncomment these variables to connect to a local PostgreSQL instance running on port 54320 with the default `postgres` database:

- **`DATABASE_URL`**: `postgres://postgres:password@localhost:54320/postgres`
- **`DATABASE_PRISMA_URL`**: `postgres://postgres:password@localhost:54320/postgres`
- **`DATABASE_URL_NON_POOLING`**: `postgres://postgres:password@localhost:54320/postgres`
- **`DATABASE_URL_NON_POOLING_SHADOW`**: `postgres://postgres:password@localhost:54320/postgres`

#### Local Development (FireIncident Database)

Uncomment these variables to connect to a local PostgreSQL instance with a dedicated `fire-incidents` database for testing fire incident tracking features:

- **`DATABASE_URL`**: `postgres://postgres:password@localhost:54320/fire-incidents`
- **`DATABASE_PRISMA_URL`**: `postgres://postgres:password@localhost:54320/fire-incidents`
- **`DATABASE_URL_NON_POOLING`**: `postgres://postgres:password@localhost:54320/fire-incidents`
- **`DATABASE_URL_NON_POOLING_SHADOW`**: `postgres://postgres:password@localhost:54320/fire-incidents`

**Note**: Only one set of database configuration variables should be active (uncommented) at a time. The local configurations assume PostgreSQL with PostGIS extension is running locally, typically via Docker or Supabase local development setup.

### Authentication & Authorization

- **`RN_AUTH0_CLIENT_ID`**: Auth0 client ID for React Native mobile app authentication
- **`RN_AUTH0_DOMAIN`**: Auth0 domain for React Native mobile app (e.g., accounts.plant-for-the-planet.org)
- **`NEXT_AUTH0_CLIENT_ID`**: Auth0 client ID for Next.js web application
- **`NEXT_AUTH0_CLIENT_SECRET`**: Auth0 client secret for Next.js server-side authentication
- **`AUTH0_DOMAIN`**: Full Auth0 domain URL (e.g., https://accounts.plant-for-the-planet.org)
- **`AUTH0_ISSUER`**: Auth0 token issuer identifier (e.g., urn:plant-for-the-planet)
- **`NEXTAUTH_SECRET`**: Secret key for NextAuth.js session encryption (generate with `openssl rand -base64 32`)
- **`NEXTAUTH_URL`**: Base URL of the Next.js application for NextAuth callbacks

### Mapping Services

- **`MAPBOXGL_ACCCESS_TOKEN`**: Mapbox access token for map rendering and tile services
- **`MAPBOXGL_DOWNLOAD_TOKEN`**: Mapbox token for downloading map tiles and assets

### Mapping & Geospatial Services

- **`MAPBOXGL_ACCCESS_TOKEN`**: Mapbox access token for map rendering and geocoding services
- **`MAPBOXGL_DOWNLOAD_TOKEN`**: Mapbox token for downloading map tiles and offline map data
- **`FIRMS_MAP_KEY`**: NASA FIRMS API key for accessing fire and thermal anomaly data

### Communication & Notifications

#### Twilio (SMS & WhatsApp)

- **`TWILIO_ACCOUNT_SID`**: Twilio account identifier for SMS and WhatsApp services
- **`TWILIO_AUTH_TOKEN`**: Twilio authentication token for API access
- **`TWILIO_PHONE_NUMBER`**: Twilio phone number for sending SMS notifications
- **`TWILIO_WHATSAPP_NUMBER`**: Twilio WhatsApp-enabled number for WhatsApp notifications

#### OneSignal (Push Notifications)

- **`ONESIGNAL_APP_ID`**: OneSignal application ID for push notification delivery
- **`ONESIGNAL_REST_API_KEY`**: OneSignal REST API key for server-side push notification operations

#### Email (SMTP)

- **`SMTP_URL`**: SMTP server connection URL (format: smtp://username:password@host:port)
- **`EMAIL_FROM`**: Default sender email address and display name for outgoing emails

#### WhatsApp Integration

- **`WHATSAPP_ENDPOINT_URL`**: Custom WhatsApp webhook endpoint for message delivery
- **`WHATSAPP_ENDPOINT_AUTH_TOKEN`**: Authentication token for WhatsApp webhook endpoint

### Monitoring & Logging

- **`PLANET_API_URL`**: Plant-for-the-Planet platform API URL for project and site synchronization
- **`FIRMS_MAP_KEY`**: NASA FIRMS (Fire Information for Resource Management System) API key for fire data access
- **`SLACK_KEY_SITE_NOTIFICATIONS`**: Slack webhook URL for internal site notification alerts

### Monitoring & Debugging

- **`NEXT_PUBLIC_SENTRY_DSN`**: Sentry Data Source Name for error tracking and monitoring
- **`SENTRY_IGNORE_API_RESOLUTION_ERROR`**: Suppress Sentry API resolution errors (true/false). Set to `true` to ignore API resolution errors in development, `false` to log them for debugging Sentry configuration issues
- **`NODE_ENV`**: Node.js environment mode ('development', 'production', or 'test')
- **`PUBLIC_API_CACHING`**: Enable/disable API response caching (true/false)

### Development & Runtime

<<<<<<< HEAD

- **`USE_REFACTORED_PIPELINE`**: Enable new service layer architecture for geo-event processing ('true'/'false')
- **`ENABLE_INCIDENT_NOTIFICATIONS`**: Enable fire incident tracking and notification system ('true'/'false')
- # **`INCIDENT_INACTIVITY_HOURS`**: Hours of inactivity before closing a fire incident (default: 6)
- **`NEXT_PUBLIC_HOST`**: Base URL for the Next.js application, used for generating absolute URLs in client-side code and API responses (e.g., "http://localhost:3000" for development, "https://firealert.plant-for-the-planet.org" for production)
- **`NODE_ENV`**: Node.js environment mode ("development", "test", "production")
- **`SKIP_ENV_VALIDATION`**: Boolean flag to skip environment variable validation during startup
  > > > > > > > develop

## Environment Configuration

- Uses `dotenv -e ../../.env` to load root environment file
- Also uses Next.js default `.env` & `.env.local` fallback for local development
- Requires `DATABASE_URL` and `DATABASE_URL_NON_POOLING` (non-pooling for migrations)
- Prisma generates client automatically on `yarn install`
