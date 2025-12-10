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
- **`RN_AUTH0_DOMAIN`**: Auth0 domain for mobile app (e.g., `accounts.plant-for-the-planet.org`)
- **`NEXT_AUTH0_CLIENT_ID`**: Auth0 client ID for Next.js web application
- **`NEXT_AUTH0_CLIENT_SECRET`**: Auth0 client secret for server-side authentication flows
- **`AUTH0_DOMAIN`**: Full Auth0 domain URL (e.g., `https://accounts.plant-for-the-planet.org`)
- **`AUTH0_ISSUER`**: Auth0 issuer identifier (e.g., `urn:plant-for-the-planet`)
- **`NEXTAUTH_SECRET`**: Secret key for NextAuth.js session encryption and JWT signing
- **`NEXTAUTH_URL`**: Base URL for NextAuth callbacks (e.g., `http://localhost:3000` for local dev)

### Database Configuration

**Current Configuration**: The application uses `DATABASE_PRISMA_URL` as the primary connection. `DATABASE_URL` and `DATABASE_URL_NON_POOLING` are commented out but available for alternative configurations.

- **`DATABASE_URL`**: (Optional) Primary PostgreSQL connection string with connection pooling

  - Format: `postgres://user:password@host:port/database`
  - Uses pooled connections for optimal performance
  - Currently commented out in favor of `DATABASE_PRISMA_URL`
  - Example: `postgres://postgres:password@localhost:54320/postgres`

- **`DATABASE_PRISMA_URL`**: **[ACTIVE]** Prisma-specific database URL for all database operations

  - Used by Prisma Client for query execution and application queries
  - Currently set to: `postgres://postgres:password@localhost:54320/postgres`
  - This is the primary active database connection when `DATABASE_URL` is not set
  - Prisma will use this for both queries and migrations when other URLs are unavailable

- **`DATABASE_URL_NON_POOLING`**: (Optional) Direct PostgreSQL connection without pooling

  - Required for Prisma migrations and schema operations in production environments
  - Migrations need direct database access to modify schema
  - Currently commented out; Prisma falls back to `DATABASE_PRISMA_URL` for migrations
  - Recommended to uncomment for production deployments with connection pooling

- **`DATABASE_URL_NON_POOLING_SHADOW`**: **[ACTIVE]** Shadow database URL for Prisma migration validation
  - Used to detect schema drift and validate migrations before applying them
  - Currently set to: `postgres://postgres:password@localhost:54320/postgres`
  - Should point to same database or a dedicated shadow database
  - Required for `prisma migrate dev` command to work properly

**Database Name Options**: The database name can be either `postgres` (default) or `fire-incidents` (custom). Switch between them by commenting/uncommenting the respective lines in `.env`.

**Local Development Setup**: For local development, only `DATABASE_PRISMA_URL` and `DATABASE_URL_NON_POOLING_SHADOW` need to be active. The simplified configuration reduces complexity while maintaining full functionality.

### Mapping Services

- **`MAPBOXGL_ACCCESS_TOKEN`**: Mapbox API access token for map rendering and tile services
  - Used for interactive maps in web application
  - Format: Secret key starting with `sk.`
- **`MAPBOXGL_DOWNLOAD_TOKEN`**: Mapbox token for downloading map tiles and assets
  - May be same as access token or separate with download permissions

### SMS & Messaging (Twilio)

- **`TWILIO_ACCOUNT_SID`**: Twilio account identifier for SMS and WhatsApp services
  - Format: Starts with `AC` followed by alphanumeric string
- **`TWILIO_AUTH_TOKEN`**: Twilio authentication token for API requests
  - Keep secure - grants full access to Twilio account
- **`TWILIO_PHONE_NUMBER`**: Twilio phone number for sending SMS notifications
  - Format: E.164 format (e.g., `+12293215210`)
- **`TWILIO_WHATSAPP_NUMBER`**: Twilio WhatsApp-enabled number for WhatsApp notifications
  - Often same as SMS number if WhatsApp is enabled on it

### Email Configuration

- **`SMTP_URL`**: SMTP server connection string for email delivery
  - Format: `smtp://username:password@host:port`
  - Example: `smtp://4f40bc8f628e37:e3c413acbacc0b@sandbox.smtp.mailtrap.io:2525`
- **`EMAIL_FROM`**: Default sender address and name for outgoing emails
  - Format: `Name <email@domain.com>`
  - Example: `FireAlert by Plant-for-the-Planet <firealert@plant-for-the-planet.org>`

### Push Notifications (OneSignal)

- **`ONESIGNAL_APP_ID`**: OneSignal application identifier for push notifications
  - Used to target the correct app for mobile push notifications
- **`ONESIGNAL_REST_API_KEY`**: OneSignal REST API key for server-side notification sending
  - Format: Starts with `os_v2_app_` followed by long alphanumeric string
  - Required for triggering push notifications from server

### WhatsApp Integration

- **`WHATSAPP_ENDPOINT_URL`**: Custom webhook endpoint for WhatsApp message delivery
  - Points to automation service for WhatsApp notifications
  - Example: `https://automate.plant-for-the-planet.org/webhook/firealert/notify/whatsapp`
- **`WHATSAPP_ENDPOINT_AUTH_TOKEN`**: Authentication token for WhatsApp webhook endpoint
  - UUID format for securing webhook requests

### External Integrations

- **`PLANET_API_URL`**: Plant-for-the-Planet platform API base URL
  - Used for project synchronization and SSO integration
  - Example: `https://app.plant-for-the-planet.org`
- **`FIRMS_MAP_KEY`**: NASA FIRMS (Fire Information for Resource Management System) API key
  - Required for fetching satellite fire detection data
  - Obtain from: https://firms.modaps.eosdis.nasa.gov/api/

### Monitoring & Logging

- **`NEXT_PUBLIC_SENTRY_DSN`**: Sentry Data Source Name for error tracking
  - Public key safe to expose in client-side code
  - Format: `https://<key>@<org>.ingest.sentry.io/<project>`
- **`SENTRY_IGNORE_API_RESOLUTION_ERROR`**: Flag to suppress specific Sentry errors
  - Set to `true` to ignore API resolution warnings
- **`SLACK_KEY_SITE_NOTIFICATIONS`**: Slack webhook URL for site notification alerts
  - Used for internal team notifications about system events
  - Format: `https://hooks.slack.com/services/...`

### Feature Flags & Configuration

- **`NODE_ENV`**: Node.js environment mode
  - Values: `development`, `production`, `test`
  - Affects logging, error handling, and optimization
- **`USE_REFACTORED_PIPELINE`**: Toggle for new service layer architecture
  - Values: `'true'` or `'false'` (string)
  - Set to `'true'` to use refactored GeoEvent processing pipeline
- **`PUBLIC_API_CACHING`**: Enable/disable API response caching
  - Values: `true` or `false` (boolean)
  - Set to `false` for development to always fetch fresh data
- **`INCIDENT_INACTIVITY_HOURS`**: Hours of inactivity before marking fire incident as resolved
  - Default: `6` hours
  - Used in incident tracking and status updates
- **`ENABLE_INCIDENT_NOTIFICATIONS`**: Toggle for fire incident notification system
  - Values: `true` or `false` (boolean)
  - Set to `false` to disable incident-based notifications during development

## Environment Configuration

- Uses `dotenv -e ../../.env` to load root environment file (located at project root)
- Also uses Next.js default `.env` & `.env.local` fallback for local development
- **Database Requirements**:
  - Minimum: `DATABASE_PRISMA_URL` for all operations
  - Recommended: `DATABASE_PRISMA_URL` + `DATABASE_URL_NON_POOLING_SHADOW` for migration validation
  - Production: All four database URLs for optimal connection pooling and migration safety
- Prisma generates client automatically on `yarn install`
- Environment variables are loaded in this order: `.env.local` → `apps/server/.env` → root `.env`
