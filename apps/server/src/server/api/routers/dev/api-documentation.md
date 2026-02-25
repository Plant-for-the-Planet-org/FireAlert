# Development APIs

Base path: `/api/trpc/dev`

## Environment Check

- `isDevMode` - Check if development APIs are available

## GeoEvent APIs

Path: `/api/trpc/dev/geoEvent`

### Create GeoEvent

- `create` - Create test GeoEvent
- Request: `{ latitude: number, longitude: number, eventDate?: string, geoEventProviderId?: string }`
- Response: `{ status: 'success', data: GeoEvent }`

### Get Providers

- `getProviders` - Get available GeoEvent providers
- Request: `{}`
- Response: `{ status: 'success', data: Provider[] }`

## SiteAlert APIs

Path: `/api/trpc/dev/siteAlert`

### Create SiteAlert

- `create` - Create test SiteAlert
- Request: `{ siteId: string, latitude: number, longitude: number, eventDate?: string, geoEventProviderId?: string }`
- Response: `{ status: 'success', data: SiteAlert }`

### Create Bulk SiteAlerts

- `createBulk` - Create multiple SiteAlerts in area
- Request: `{ siteId: string, latitude: number, longitude: number, count?: number, radiusKm?: number, eventDate?: string, geoEventProviderId?: string }`
- Response: `{ status: 'success', data: { created: number, events: SiteAlert[] } }`

### Get User Sites

- `getUserSites` - Get user's sites for testing
- Request: `{}`
- Response: `{ status: 'success', data: Site[] }`

**Note: All APIs only work in development mode (NODE_ENV=development)**
