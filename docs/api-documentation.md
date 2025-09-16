# FireAlert API Documentation

## Overview

FireAlert uses tRPC for type-safe API communication between client and server. The API provides endpoints for user management, site monitoring, alert handling, and notification configuration.

## Base URL and Authentication

**Base URL:** `/api/trpc`

**Authentication:** All protected endpoints require a valid JWT token from Auth0 in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## API Response Format

All API responses follow a consistent format:

```typescript
interface APIResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}
```

## Error Handling

tRPC errors include specific error codes and messages:

```typescript
interface TRPCError {
  code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 
        'METHOD_NOT_SUPPORTED' | 'CONFLICT' | 'INTERNAL_SERVER_ERROR';
  message: string;
}
```

## API Endpoints

### User Management

#### Get User Profile
Retrieves the current user's profile information.

**Endpoint:** `user.profile`  
**Method:** Query  
**Authentication:** Required

**Response:**
```typescript
{
  status: 'success',
  data: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    detectionMethods: ('MODIS' | 'VIIRS' | 'LANDSAT' | 'GEOSTATIONARY')[];
    isPlanetRO: boolean;
    image: string;
    isVerified: boolean;
    lastLogin: Date;
    signupDate: Date;
    roles: 'ROLE_CLIENT' | 'ROLE_ADMIN' | 'ROLE_SUPPORT';
    plan: string;
  }
}
```

**Usage Example:**
```typescript
const profile = await trpc.user.profile.query();
```

#### Update User Profile
Updates the current user's profile information.

**Endpoint:** `user.updateUser`  
**Method:** Mutation  
**Authentication:** Required

**Input:**
```typescript
{
  body: {
    name?: string; // 5-100 characters, sanitized
    avatar?: string;
    detectionMethods?: ('MODIS' | 'VIIRS' | 'LANDSAT' | 'GEOSTATIONARY')[];
  }
}
```

**Response:**
```typescript
{
  status: 'success',
  data: User
}
```

**Usage Example:**
```typescript
const updatedUser = await trpc.user.updateUser.mutate({
  body: {
    name: 'John Doe',
    detectionMethods: ['MODIS', 'VIIRS']
  }
});
```

#### Get All Users (Admin Only)
Retrieves all users in the system.

**Endpoint:** `user.getAllUsers`  
**Method:** Query  
**Authentication:** Required (Admin only)

**Response:**
```typescript
{
  status: 'success',
  data: User[]
}
```

#### Soft Delete User
Marks the current user for deletion (soft delete).

**Endpoint:** `user.softDeleteUser`  
**Method:** Mutation  
**Authentication:** Required

**Response:**
```typescript
{
  status: 'success',
  message: string;
  data: null
}
```

### Site Management

#### Create Site
Creates a new monitoring site.

**Endpoint:** `site.createSite`  
**Method:** Mutation  
**Authentication:** Required

**Input:**
```typescript
{
  type: 'Point' | 'Polygon' | 'MultiPolygon';
  name?: string; // 5-100 characters
  geometry: {
    type: 'Point' | 'Polygon' | 'MultiPolygon';
    coordinates: number[] | number[][] | number[][][];
  };
  radius?: number; // Default: 0, for Point: default 1000m
  isMonitored?: boolean;
}
```

**Response:**
```typescript
{
  status: 'success',
  data: {
    id: string;
    name: string;
    type: 'Point' | 'Polygon' | 'MultiPolygon';
    geometry: GeoJSON;
    radius: number;
    isMonitored: boolean;
    detectionArea: number;
    // ... other site fields
  }
}
```

**Usage Example:**
```typescript
// Create a point site
const site = await trpc.site.createSite.mutate({
  type: 'Point',
  name: 'Forest Monitoring Site',
  geometry: {
    type: 'Point',
    coordinates: [-122.4194, 37.7749] // [longitude, latitude]
  },
  radius: 5000, // 5km radius
  isMonitored: true
});

// Create a polygon site
const polygonSite = await trpc.site.createSite.mutate({
  type: 'Polygon',
  name: 'Protected Area',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-122.5, 37.7],
      [-122.4, 37.7],
      [-122.4, 37.8],
      [-122.5, 37.8],
      [-122.5, 37.7]
    ]]
  }
});
```

#### Get Sites
Retrieves all sites for the current user.

**Endpoint:** `site.getSites`  
**Method:** Query  
**Authentication:** Required

**Response:**
```typescript
{
  status: 'success',
  data: Site[]
}
```

#### Get Single Site
Retrieves a specific site by ID.

**Endpoint:** `site.getSite`  
**Method:** Query  
**Authentication:** Required

**Input:**
```typescript
{
  siteId: string; // CUID
}
```

**Response:**
```typescript
{
  status: 'success',
  data: Site
}
```

#### Update Site
Updates an existing site.

**Endpoint:** `site.updateSite`  
**Method:** Mutation  
**Authentication:** Required

**Input:**
```typescript
{
  params: {
    siteId: string;
  };
  body: {
    type?: 'Point' | 'Polygon' | 'MultiPolygon';
    name?: string;
    geometry?: GeoJSON;
    radius?: number;
    isMonitored?: boolean;
  }
}
```

#### Delete Site
Soft deletes a site.

**Endpoint:** `site.deleteSite`  
**Method:** Mutation  
**Authentication:** Required

**Input:**
```typescript
{
  siteId: string;
}
```

#### Pause Site Alerts
Temporarily pauses alerts for a site.

**Endpoint:** `site.pauseAlert`  
**Method:** Mutation  
**Authentication:** Required

**Input:**
```typescript
{
  siteId: string;
  duration: number; // Must be >= 1
  unit: 'minutes' | 'hours' | 'days';
}
```

**Usage Example:**
```typescript
// Pause alerts for 24 hours
await trpc.site.pauseAlert.mutate({
  siteId: 'site-id',
  duration: 24,
  unit: 'hours'
});
```

#### Trigger Test Alert
Sends a test alert for a site.

**Endpoint:** `site.triggerTestAlert`  
**Method:** Mutation  
**Authentication:** Required

**Input:**
```typescript
{
  siteId: string;
}
```

### Alert Management

#### Get Alerts
Retrieves alerts for the current user (last 30 days, max 300 alerts).

**Endpoint:** `alert.getAlerts`  
**Method:** Query  
**Authentication:** Required

**Response:**
```typescript
{
  status: 'success',
  data: {
    id: string;
    site: {
      id: string;
      name: string;
      project?: {
        id: string;
        name: string;
      };
    };
    eventDate: Date;
    localEventDate: Date;
    localTimeZone: string;
    type: string;
    latitude: number;
    longitude: number;
    detectedBy: string;
    confidence: 'high' | 'medium' | 'low';
    distance: number;
    data: any;
  }[]
}
```

#### Get Single Alert
Retrieves a specific alert by ID (public endpoint).

**Endpoint:** `alert.getAlert`  
**Method:** Query  
**Authentication:** Not required

**Input:**
```typescript
{
  id: string; // Sanitized string, 1-100 characters
}
```

**Response:**
```typescript
{
  status: 'success',
  data: {
    id: string;
    site: {
      id: string;
      name: string;
      geometry: GeoJSON;
      project?: {
        id: string;
        name: string;
      };
    };
    eventDate: Date;
    localEventDate: Date;
    localTimeZone: string;
    type: string;
    latitude: number;
    longitude: number;
    detectedBy: string;
    confidence: 'high' | 'medium' | 'low';
    distance: number;
    data: any;
  }
}
```

#### Get Alerts for Site
Retrieves alerts for a specific site within a time range.

**Endpoint:** `alert.getAlertsForSite`  
**Method:** Query  
**Authentication:** Required

**Input:**
```typescript
{
  siteId: string;
  durationInDays?: number; // Default: 1
}
```

**Response:**
```typescript
{
  status: 'success',
  data: Alert[]
}
```

### Alert Method Management

#### Create Alert Method
Creates a new notification method for the user.

**Endpoint:** `alertMethod.createAlertMethod`  
**Method:** Mutation  
**Authentication:** Required

**Input:**
```typescript
{
  method: 'email' | 'sms' | 'device' | 'whatsapp' | 'webhook';
  destination: string; // Email, phone number, device ID, or webhook URL
  deviceName?: string; // For device notifications
  deviceId?: string; // For device notifications
}
```

**Validation Rules:**
- **Email**: Must be valid email format
- **SMS**: Must be valid E.164 phone number format
- **WhatsApp**: Must be valid E.164 phone number format
- **Device**: Requires deviceName and deviceId
- **Webhook**: Must be valid URL

**Response:**
```typescript
{
  status: 'success',
  message: string;
  data: {
    id: string;
    method: string;
    destination: string;
    isVerified: boolean;
    isEnabled: boolean;
    deviceName?: string;
    deviceId?: string;
  }
}
```

**Usage Examples:**
```typescript
// Email notification
await trpc.alertMethod.createAlertMethod.mutate({
  method: 'email',
  destination: 'user@example.com'
});

// SMS notification
await trpc.alertMethod.createAlertMethod.mutate({
  method: 'sms',
  destination: '+1234567890'
});

// Push notification
await trpc.alertMethod.createAlertMethod.mutate({
  method: 'device',
  destination: 'onesignal-player-id',
  deviceName: 'iPhone 12',
  deviceId: 'device-uuid'
});

// Webhook notification
await trpc.alertMethod.createAlertMethod.mutate({
  method: 'webhook',
  destination: 'https://api.example.com/webhook'
});
```

#### Get Alert Methods
Retrieves all alert methods for the current user.

**Endpoint:** `alertMethod.getAlertMethods`  
**Method:** Query  
**Authentication:** Required

**Response:**
```typescript
{
  status: 'success',
  data: {
    id: string;
    method: string;
    destination: string;
    isEnabled: boolean;
    isVerified: boolean;
    lastTokenSentDate?: Date;
    deviceName?: string;
    deviceId?: string;
  }[]
}
```

#### Get Single Alert Method
Retrieves a specific alert method by ID.

**Endpoint:** `alertMethod.getAlertMethod`  
**Method:** Query  
**Authentication:** Required

**Input:**
```typescript
{
  alertMethodId: string; // CUID
}
```

#### Update Alert Method
Updates an alert method (enable/disable).

**Endpoint:** `alertMethod.updateAlertMethod`  
**Method:** Mutation  
**Authentication:** Required

**Input:**
```typescript
{
  params: {
    alertMethodId: string;
  };
  body: {
    isEnabled: boolean;
  }
}
```

**Note:** Alert method must be verified before it can be enabled.

#### Delete Alert Method
Soft deletes an alert method.

**Endpoint:** `alertMethod.deleteAlertMethod`  
**Method:** Mutation  
**Authentication:** Required

**Input:**
```typescript
{
  alertMethodId: string;
}
```

#### Send Verification
Sends a verification token to an alert method.

**Endpoint:** `alertMethod.sendVerification`  
**Method:** Mutation  
**Authentication:** Required

**Input:**
```typescript
{
  alertMethodId: string;
}
```

#### Verify Alert Method
Verifies an alert method using a token.

**Endpoint:** `alertMethod.verify`  
**Method:** Mutation  
**Authentication:** Not required (public)

**Input:**
```typescript
{
  params: {
    alertMethodId: string;
  };
  body: {
    token: string; // 5-character OTP
  }
}
```

**Response:**
```typescript
{
  status: 'success',
  message: 'Validation Successful',
  data: AlertMethod
}
```

### Project Management

#### Get Projects
Retrieves all projects for the current user (Planet RO users only).

**Endpoint:** `project.getProjects`  
**Method:** Query  
**Authentication:** Required

**Response:**
```typescript
{
  status: 'success',
  data: {
    id: string;
    name: string;
    slug: string;
    lastUpdated: Date;
    userId: string;
  }[]
}
```

**Note:** Only available for users with `isPlanetRO: true`.

### GeoEvent Provider Management (Admin Only)

All GeoEvent Provider endpoints require admin privileges.

#### Create GeoEvent Provider
Creates a new GeoEvent provider configuration.

**Endpoint:** `geoEventProvider.createGeoEventProvider`  
**Method:** Mutation  
**Authentication:** Required (Admin only)

**Input:**
```typescript
{
  type: 'fire';
  isActive: boolean;
  providerKey: 'FIRMS';
  config: {
    apiUrl: string;
    mapKey: string;
    sourceKey: string;
  };
}
```

#### Get GeoEvent Providers
Retrieves all GeoEvent providers.

**Endpoint:** `geoEventProvider.getGeoEventProviders`  
**Method:** Query  
**Authentication:** Required (Admin only)

#### Get Single GeoEvent Provider
Retrieves a specific GeoEvent provider.

**Endpoint:** `geoEventProvider.getGeoEventProvider`  
**Method:** Query  
**Authentication:** Required (Admin only)

**Input:**
```typescript
{
  id: string; // CUID
}
```

#### Update GeoEvent Provider
Updates a GeoEvent provider configuration.

**Endpoint:** `geoEventProvider.updateGeoEventProvider`  
**Method:** Mutation  
**Authentication:** Required (Admin only)

**Input:**
```typescript
{
  params: {
    id: string;
  };
  body: {
    type?: 'fire';
    isActive?: boolean;
    providerKey?: 'FIRMS';
    config?: {
      apiUrl?: string;
      mapKey?: string;
      sourceKey?: string;
    };
  }
}
```

#### Delete GeoEvent Provider
Deletes a GeoEvent provider.

**Endpoint:** `geoEventProvider.deleteGeoEventProvider`  
**Method:** Mutation  
**Authentication:** Required (Admin only)

**Input:**
```typescript
{
  id: string;
}
```

## Client Usage Examples

### React/Next.js Client Setup

```typescript
import { createTRPCNext } from '@trpc/next';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/api/root';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers() {
            const token = localStorage.getItem('auth_token');
            return token ? { authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    };
  },
});
```

### React Native Client Setup

```typescript
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/api/root';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'https://your-app.com/api/trpc',
      headers: async () => {
        const token = await AsyncStorage.getItem('auth_token');
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
```

### Common Usage Patterns

#### Creating a Site with Error Handling

```typescript
const createSite = async (siteData: CreateSiteInput) => {
  try {
    const result = await trpc.site.createSite.mutate(siteData);
    console.log('Site created:', result.data);
    return result.data;
  } catch (error) {
    if (error.data?.code === 'BAD_REQUEST') {
      console.error('Invalid site data:', error.message);
    } else if (error.data?.code === 'UNAUTHORIZED') {
      console.error('Authentication required');
      // Redirect to login
    } else {
      console.error('Unexpected error:', error.message);
    }
    throw error;
  }
};
```

#### Setting Up Notifications

```typescript
const setupNotifications = async () => {
  try {
    // Create email notification
    const emailMethod = await trpc.alertMethod.createAlertMethod.mutate({
      method: 'email',
      destination: 'user@example.com'
    });

    // Create SMS notification
    const smsMethod = await trpc.alertMethod.createAlertMethod.mutate({
      method: 'sms',
      destination: '+1234567890'
    });

    console.log('Notification methods created');
    
    // Note: Methods need to be verified before they're active
    // Users will receive verification tokens via email/SMS
    
  } catch (error) {
    console.error('Failed to setup notifications:', error);
  }
};
```

#### Fetching and Displaying Alerts

```typescript
const AlertsList = () => {
  const { data: alerts, isLoading, error } = trpc.alert.getAlerts.useQuery();

  if (isLoading) return <div>Loading alerts...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {alerts?.data.map(alert => (
        <div key={alert.id}>
          <h3>{alert.site.name}</h3>
          <p>Detected: {alert.localEventDate.toLocaleString()}</p>
          <p>Confidence: {alert.confidence}</p>
          <p>Distance: {alert.distance}m</p>
        </div>
      ))}
    </div>
  );
};
```

## Rate Limiting and Best Practices

### Rate Limiting
- API calls are subject to rate limiting
- Batch operations are preferred for bulk data
- Use React Query's built-in caching to minimize requests

### Best Practices

1. **Error Handling**: Always handle tRPC errors appropriately
2. **Type Safety**: Leverage TypeScript types from the router
3. **Caching**: Use React Query's caching for better performance
4. **Batch Requests**: tRPC automatically batches requests when possible
5. **Authentication**: Always include valid JWT tokens for protected routes
6. **Input Validation**: Client-side validation should match server schemas

### Performance Tips

1. **Use Queries for Data Fetching**: Leverage React Query's caching
2. **Optimize Re-renders**: Use React Query's select option to transform data
3. **Prefetch Data**: Use prefetchQuery for better UX
4. **Infinite Queries**: For large datasets, consider implementing infinite queries

This API documentation provides comprehensive coverage of all FireAlert endpoints with practical examples and best practices for client implementation.