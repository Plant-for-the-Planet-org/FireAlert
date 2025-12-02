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

- **Database**: `DATABASE_URL`, `DATABASE_PRISMA_URL`, `DATABASE_URL_NON_POOLING` for PostgreSQL connections with pooling and migration support
- **Auth0**: `AUTH0_DOMAIN`, `AUTH0_ISSUER`, `NEXT_AUTH0_CLIENT_ID`, `NEXT_AUTH0_CLIENT_SECRET` for authentication integration
- **NextAuth**: `NEXTAUTH_SECRET`, `NEXTAUTH_URL` for session management
- **Mapbox**: `MAPBOXGL_ACCCESS_TOKEN`, `MAPBOXGL_DOWNLOAD_TOKEN` for map services and tile downloads
- **Twilio**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER` for SMS and WhatsApp notifications
- **OneSignal**: `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` for push notifications
- **Email**: `SMTP_URL`, `EMAIL_FROM` for email notifications via Nodemailer
- **Monitoring**: `NEXT_PUBLIC_SENTRY_DSN` for error tracking
- **FIRMS**: `FIRMS_MAP_KEY`, `ENABLE_FIRMS_MAP_KEY` for NASA fire data access
- **WhatsApp**: `WHATSAPP_ENDPOINT_URL`, `WHATSAPP_ENDPOINT_AUTH_TOKEN` for WhatsApp integration
- **Features**: `ENABLE_INCIDENT_NOTIFICATIONS`, `ENABLE_ENHANCED_STATUS_TRACKING`, `NOTIFICATION_MODE` for feature flags

## Environment Configuration

- Uses `dotenv -e ../../.env` to load root environment file
- Also uses Next.js default `.env` & `.env.local` fallback for local development
- Requires `DATABASE_URL` and `DATABASE_URL_NON_POOLING` (non-pooling for migrations)
- Prisma generates client automatically on `yarn install`
