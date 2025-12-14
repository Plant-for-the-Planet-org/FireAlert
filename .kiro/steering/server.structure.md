# Server Application Structure (apps/server)

## Directory Layout

```
apps/server/
├── src/
│   ├── Components/         # React components for web pages
│   ├── Interfaces/         # TypeScript type definitions
│   ├── Services/           # Core business logic (extensible architecture)
│   │   ├── GeoEvent/       # GeoEvent processing logic
│   │   ├── GeoEventProvider/ # Provider implementations (FIRMS, MODIS)
│   │   ├── Notifications/  # Notification processing
│   │   ├── Notifier/       # Alert method implementations
│   │   ├── SiteAlert/      # Site alert processing
│   │   └── core/           # Core service abstractions
│   ├── pages/              # Next.js pages and API routes
│   │   └── api/            # tRPC API endpoints
│   ├── server/             # Server configuration and database
│   ├── styles/             # Global CSS styles
│   └── utils/              # Utility functions
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets
└── seeders/                # Database seeding scripts
```

## Service Layer Architecture

- **Abstract Base Classes**: `GeoEventProvider`, `Notifier` for extensibility
- **Provider Pattern**: Each data source (FIRMS, MODIS) implements `GeoEventProvider`
- **Strategy Pattern**: Different notification methods extend `Notifier`
- **Interface Segregation**: TypeScript interfaces in `src/Interfaces/`

## Database Architecture

- **PostGIS Integration**: Geospatial queries and geometry intersections
- **Prisma Schema**: Type-safe database operations
- **Migration System**: Version-controlled schema changes
- **Seeding**: Automated data population scripts
