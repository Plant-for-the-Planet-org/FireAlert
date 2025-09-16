# Service Layer Architecture

## Overview

The FireAlert service layer implements a plugin-based architecture with two main extensible systems: **GeoEvent Providers** for data ingestion and **Notifiers** for multi-channel notifications. This document provides comprehensive documentation of the current service architecture and guides for extending these systems.

## Architecture Patterns

### Registry Pattern
Both GeoEvent Providers and Notifiers use the Registry pattern for plugin management:

```mermaid
graph TB
    subgraph "Registry Pattern"
        REGISTRY[Registry]
        PLUGIN1[Plugin 1]
        PLUGIN2[Plugin 2]
        PLUGIN3[Plugin 3]
        
        REGISTRY --> PLUGIN1
        REGISTRY --> PLUGIN2
        REGISTRY --> PLUGIN3
    end
    
    subgraph "Client Code"
        CLIENT[Client]
        CLIENT --> REGISTRY
    end
```

**Benefits:**
- **Extensibility**: Easy to add new providers/notifiers
- **Loose Coupling**: Plugins are independent of each other
- **Runtime Discovery**: Plugins are registered at startup
- **Type Safety**: Registry enforces interface compliance

## GeoEvent Provider System

### Architecture Overview

```mermaid
graph TB
    subgraph "GeoEvent Provider System"
        CRON[Cron Job] --> REGISTRY[GeoEventProviderRegistry]
        REGISTRY --> NASA[NASA Provider]
        REGISTRY --> GOES[GOES-16 Provider]
        REGISTRY --> CUSTOM[Custom Provider]
        
        NASA --> NASA_API[NASA FIRMS API]
        GOES --> EARTH_ENGINE[Google Earth Engine]
        CUSTOM --> CUSTOM_API[Custom Data Source]
        
        NASA --> HANDLER[GeoEvent Handler]
        GOES --> HANDLER
        CUSTOM --> HANDLER
        
        HANDLER --> DB[(Database)]
    end
```

### Core Interface

```typescript
interface GeoEventProviderClass {
  getKey(): string;
  initialize(config?: GeoEventProviderConfigGeneral): void;
  getLatestGeoEvents(
    client: string,
    geoEventProviderId: string,
    slice: string,
    clientApiKey: string,
    lastRun: Date | null
  ): Promise<GeoEvent[]>;
}
```

### Provider Registry Implementation

```typescript
const createGeoEventProviderClassRegistry = function (
  geoEventProviders: Array<GeoEventProviderClass>,
) {
  const registry: {[client: string]: GeoEventProviderClass} = {};

  geoEventProviders.forEach((geoEventProvider: GeoEventProviderClass) => {
    const client = geoEventProvider.getKey();
    if (registry[client]) {
      throw new Error(
        `Provider for client '${client}' has already been registered`,
      );
    }
    registry[client] = geoEventProvider;
  });

  return {
    get: (client: string): GeoEventProviderClass => {
      const provider = registry[client];
      if (!provider) {
        throw new Error(`Provider with key '${client}' not found`);
      }
      return provider;
    },
  };
};
```

### Existing Providers

#### 1. NASA FIRMS Provider

**Purpose**: Fetches fire data from NASA's Fire Information for Resource Management System (FIRMS)

**Key Features:**
- **Data Source**: NASA FIRMS CSV API
- **Satellites Supported**: MODIS, VIIRS, LANDSAT
- **Data Format**: CSV parsing with confidence level mapping
- **Update Frequency**: Configurable via cron jobs

**Implementation Details:**
```typescript
class NasaGeoEventProviderClass implements GeoEventProviderClass {
  getKey(): string {
    return 'FIRMS';
  }

  async getLatestGeoEvents(
    geoEventProviderClientId: string,
    geoEventProviderId: string,
    slice: string,
    clientApiKey: string
  ): Promise<GeoEvent[]> {
    // Fetch CSV data from NASA FIRMS API
    // Parse CSV and normalize to GeoEvent format
    // Apply confidence level mapping
    // Return standardized events
  }
}
```

**Configuration:**
- `apiUrl`: NASA FIRMS API endpoint
- `bbox`: Bounding box for geographic area
- `slice`: Geographic slice identifier
- `client`: Provider client identifier

#### 2. GOES-16 Provider

**Purpose**: Processes geostationary satellite data from GOES-16 via Google Earth Engine

**Key Features:**
- **Data Source**: Google Earth Engine GOES-16 FDCF collection
- **Authentication**: Service account private key
- **Processing**: Temperature-based fire detection
- **Real-time**: Near real-time geostationary data

**Implementation Details:**
```typescript
class GOES16GeoEventProviderClass implements GeoEventProviderClass {
  getKey(): string {
    return 'GOES-16';
  }

  async authenticateEarthEngine(): Promise<void> {
    // Authenticate with Google Earth Engine using private key
  }

  async getLatestGeoEvents(
    geoEventProviderClientId: string,
    geoEventProviderId: string,
    slice: string,
    clientApiKey: string,
    lastRun: Date | null
  ): Promise<GeoEvent[]> {
    // Authenticate with Earth Engine
    // Query GOES-16 FDCF collection
    // Process temperature data for fire detection
    // Convert to GeoEvent format with spatial slicing
  }
}
```

**Configuration:**
- `privateKey`: Google Earth Engine service account key
- `bbox`: Geographic bounding box
- `slice`: Spatial slice configuration
- `client`: Provider identifier

### Data Processing Flow

```mermaid
sequenceDiagram
    participant CRON as Cron Job
    participant REG as Provider Registry
    participant PROV as Provider
    participant API as External API
    participant HANDLER as GeoEvent Handler
    participant DB as Database
    
    CRON->>REG: Get Active Providers
    REG->>PROV: Initialize Provider
    PROV->>API: Fetch Latest Data
    API->>PROV: Raw Data Response
    PROV->>PROV: Transform to GeoEvent Format
    PROV->>HANDLER: Standardized GeoEvents
    HANDLER->>HANDLER: Deduplicate Events
    HANDLER->>DB: Store New Events
```

### Adding New GeoEvent Providers

#### Step 1: Implement the Interface

```typescript
class CustomGeoEventProvider implements GeoEventProviderClass {
  private config: GeoEventProviderConfigGeneral | undefined;

  getKey(): string {
    return 'CUSTOM_PROVIDER';
  }

  initialize(config?: GeoEventProviderConfigGeneral): void {
    this.config = config;
  }

  async getLatestGeoEvents(
    client: string,
    geoEventProviderId: string,
    slice: string,
    clientApiKey: string,
    lastRun: Date | null
  ): Promise<GeoEvent[]> {
    // 1. Fetch data from your external source
    // 2. Transform to GeoEvent format
    // 3. Apply confidence levels
    // 4. Return standardized events
  }

  private getConfig(): CustomProviderConfig {
    // Validate and return typed configuration
  }
}
```

#### Step 2: Register the Provider

```typescript
// In GeoEventProviderRegistry.ts
import CustomGeoEventProvider from './ProviderClass/CustomGeoEventProvider';

const GeoEventProviderClassRegistry = createGeoEventProviderClassRegistry([
  new NasaGeoEventProvider(),
  new GOES16GeoEventProvider(),
  new CustomGeoEventProvider(), // Add your provider here
]);
```

#### Step 3: Database Configuration

Add provider configuration to the `GeoEventProvider` table:

```sql
INSERT INTO "GeoEventProvider" (
  name, description, type, clientId, clientApiKey, 
  fetchFrequency, isActive, config
) VALUES (
  'Custom Provider', 
  'Description of your provider',
  'fire',
  'CUSTOM_CLIENT_ID',
  'your-api-key',
  3600, -- Fetch frequency in seconds
  true,
  '{"apiUrl": "https://api.example.com", "bbox": "bbox-config"}'
);
```

## Notification System Architecture

### Overview

```mermaid
graph TB
    subgraph "Notification System"
        ALERT[Site Alert] --> CREATOR[Notification Creator]
        CREATOR --> QUEUE[Notification Queue]
        QUEUE --> REGISTRY[Notifier Registry]
        
        REGISTRY --> EMAIL[Email Notifier]
        REGISTRY --> SMS[SMS Notifier]
        REGISTRY --> PUSH[Push Notifier]
        REGISTRY --> WEBHOOK[Webhook Notifier]
        REGISTRY --> WHATSAPP[WhatsApp Notifier]
        REGISTRY --> TEST[Test Notifier]
        
        EMAIL --> SMTP[SMTP Server]
        SMS --> TWILIO[Twilio SMS]
        PUSH --> ONESIGNAL[OneSignal]
        WEBHOOK --> HTTP[HTTP Endpoint]
        WHATSAPP --> TWILIO_WA[Twilio WhatsApp]
    end
```

### Core Interface

```typescript
interface Notifier {
  getSupportedMethods(): string[];
  notify(
    destination: string,
    parameters: NotificationParameters,
    options?: AdditionalOptions,
  ): Promise<boolean>;
  handleFailedNotification?: (
    opts: HandleFailedNotificationOptions,
  ) => Promise<void>;
}
```

### Notifier Registry Implementation

```typescript
const createNotifierRegistry = (notifiers: Notifier[]) => {
  const registry: {[method: string]: Notifier} = {};

  notifiers.forEach((notifier: Notifier) => {
    notifier.getSupportedMethods().map((method: string) => {
      if (registry[method]) {
        throw new Error(
          `Notifier for method '${method}' has already been registered`,
        );
      }
      registry[method] = notifier;
    });
  });

  return {
    get: (method: string): Notifier => {
      const notifier = registry[method];
      if (!notifier) {
        throw new Error(`Notifier with key '${method}' not found`);
      }
      return notifier;
    },
  };
};
```

### Existing Notifiers

#### 1. Email Notifier

**Purpose**: Sends HTML email notifications via SMTP

**Features:**
- **Template System**: HTML email templates with placeholders
- **SMTP Support**: Configurable SMTP server (AWS SES compatible)
- **Error Handling**: Comprehensive error logging and retry logic

**Configuration:**
```typescript
// Environment variables
SMTP_URL=smtps://username:password@smtp.example.com:465
EMAIL_FROM=FireAlert <noreply@example.com>
```

**Implementation Highlights:**
```typescript
class EmailNotifier implements Notifier {
  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.EMAIL];
  }

  async notify(
    destination: string,
    parameters: NotificationParameters,
  ): Promise<boolean> {
    // Create nodemailer transporter
    // Generate HTML email from template
    // Send email with error handling
    // Return success/failure status
  }
}
```

#### 2. SMS Notifier

**Purpose**: Sends SMS notifications via Twilio

**Features:**
- **Geographic Restrictions**: Country-based SMS restrictions
- **Status Callbacks**: Twilio delivery status tracking
- **Error Code Handling**: Specific handling for different Twilio error codes
- **Auto-disable**: Disables alert methods for invalid numbers

**Configuration:**
```typescript
// Environment variables
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_STATUS_CALLBACK_URL=https://yourapp.com/api/callback/twilio
```

**Error Handling:**
- **21610, 21612**: Invalid phone numbers → Disable alert method
- **30005, 21408**: Delivery failures → Log and retry
- **21211**: Invalid 'To' number → Disable alert method

#### 3. Push Notifier (Device)

**Purpose**: Sends push notifications via OneSignal

**Features:**
- **Cross-platform**: iOS and Android support
- **Rich Notifications**: Custom data payload support
- **Player ID Targeting**: Direct device targeting
- **Deep Linking**: URL-based app navigation

**Configuration:**
```typescript
// Environment variables
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key
```

**Payload Structure:**
```typescript
const payload = {
  app_id: env.ONESIGNAL_APP_ID,
  include_player_ids: [destination],
  contents: {en: message},
  headings: {en: subject},
  url: url,
  data: alert ? alert : {},
};
```

#### 4. Webhook Notifier

**Purpose**: Sends HTTP POST requests to custom endpoints

**Features:**
- **Custom Endpoints**: User-defined webhook URLs
- **JSON Payload**: Structured alert data
- **Status Code Handling**: Automatic retry and error handling
- **Auto-cleanup**: Removes invalid webhooks

**Payload Structure:**
```typescript
const payload = {
  subject: subject,
  message: message,
  url: url,
  alert: alert ? alert : {},
};
```

**Error Handling:**
- **404, 401, 403**: Disable and unverify webhook
- **Other errors**: Log and retry in next run

#### 5. WhatsApp Notifier

**Purpose**: Sends WhatsApp messages via custom endpoint

**Features:**
- **Custom Integration**: Configurable WhatsApp API endpoint
- **Authentication**: Token-based API authentication
- **Rich Messaging**: Full alert data in WhatsApp format

**Configuration:**
```typescript
// Environment variables
WHATSAPP_ENDPOINT_URL=https://your-whatsapp-api.com/send
WHATSAPP_ENDPOINT_AUTH_TOKEN=your-auth-token
```

#### 6. Test Notifier

**Purpose**: Development and testing notifications

**Features:**
- **Console Output**: Logs notification details to console
- **Always Succeeds**: Returns true for testing purposes
- **Development Only**: Used for testing notification flow

### Notification Flow

```mermaid
sequenceDiagram
    participant SA as Site Alert
    participant NC as Notification Creator
    participant NR as Notifier Registry
    participant NOT as Notifier
    participant EXT as External Service
    participant DB as Database
    
    SA->>NC: New Site Alert
    NC->>NC: Check Rate Limiting
    NC->>NC: Get User Alert Methods
    NC->>DB: Create Notification Records
    NC->>NR: Process Notifications
    NR->>NOT: Get Notifier for Method
    NOT->>EXT: Send Notification
    EXT->>NOT: Delivery Status
    NOT->>DB: Update Notification Status
```

### Rate Limiting Logic

The notification system implements sophisticated rate limiting to prevent spam:

```typescript
// Site is considered "active" if last message was sent > 2 hours ago
const isSiteActive = !lastMessageCreated || 
  new Date(lastMessageCreated) < new Date(Date.now() - 2 * 60 * 60 * 1000);

// Method count limits per site
const notificationMethodCounter = {
  sms: 1,        // One SMS per site per period
  whatsapp: 1,   // One WhatsApp per site per period  
  email: 1,      // One email per site per period
  device: Infinity,  // Unlimited push notifications
  webhook: Infinity, // Unlimited webhook calls
};
```

### Adding New Notifiers

#### Step 1: Implement the Interface

```typescript
class CustomNotifier implements Notifier {
  getSupportedMethods(): string[] {
    return ['custom'];
  }

  async notify(
    destination: string,
    parameters: NotificationParameters,
    options?: AdditionalOptions,
  ): Promise<boolean> {
    try {
      // 1. Validate configuration
      // 2. Prepare notification payload
      // 3. Send to external service
      // 4. Handle response and errors
      // 5. Return success/failure
      
      return true;
    } catch (error) {
      // Handle errors and call failure handler
      await this.handleFailedNotification({
        destination,
        method: 'custom',
      });
      return false;
    }
  }

  handleFailedNotification = genericFailedNotificationHandler;
}
```

#### Step 2: Register the Notifier

```typescript
// In NotifierRegistry.ts
import CustomNotifier from './Notifier/CustomNotifier';

const NotifierRegistry = createNotifierRegistry([
  new WhatsAppNotifier(),
  new DeviceNotifier(),
  new EmailNotifier(),
  new SMSNotifier(),
  new WebhookNotifier(),
  new TestNotifier(),
  new CustomNotifier(), // Add your notifier here
]);
```

#### Step 3: Add Method Constant

```typescript
// In methodConstants.ts
export const NOTIFICATION_METHOD = {
  EMAIL: 'email',
  SMS: 'sms',
  DEVICE: 'device',
  WEBHOOK: 'webhook',
  WHATSAPP: 'whatsapp',
  TEST: 'test',
  CUSTOM: 'custom', // Add your method here
} as const;
```

## Error Handling Patterns

### Generic Failed Notification Handler

```typescript
export const handleFailedNotification = async (
  opts: HandleFailedNotificationOptions,
): Promise<void> => {
  const { destination, method } = opts;
  
  try {
    // Increment fail count for alert method
    await prisma.alertMethod.updateMany({
      where: { destination, method },
      data: { failCount: { increment: 1 } },
    });
    
    logger(`Incremented fail count for ${method} destination: ${destination}`, 'info');
  } catch (error) {
    logger(`Error updating fail count: ${error}`, 'error');
  }
};
```

### Notifier-Specific Error Handling

Each notifier can implement custom error handling:

```typescript
class SMSNotifier implements Notifier {
  async disableAlertMethodsForDestination(destination: string): Promise<void> {
    // Disable alert methods for invalid phone numbers
  }

  async notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
    try {
      // Send SMS via Twilio
    } catch (error: TwilioError) {
      const { code } = error;
      
      // Handle specific Twilio error codes
      if ([21610, 21612, 30005, 21408, 21211].includes(code)) {
        await this.disableAlertMethodsForDestination(destination);
      }
      
      return false;
    }
  }
}
```

## Configuration Management

### Provider Configuration

GeoEvent providers are configured via the database:

```typescript
interface GeoEventProvider {
  id: string;
  name: string;
  description: string;
  type: string; // 'fire'
  clientId: string; // 'LANDSAT_NRT', 'MODIS_NRT', etc.
  clientApiKey: string;
  fetchFrequency: number; // seconds
  isActive: boolean;
  lastRun: Date;
  config: GeoEventProviderConfig; // JSON configuration
}
```

### Notifier Configuration

Notifiers are configured via environment variables:

```bash
# Email Configuration
SMTP_URL=smtps://username:password@smtp.example.com:465
EMAIL_FROM=FireAlert <noreply@example.com>

# SMS Configuration  
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notification Configuration
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key

# WhatsApp Configuration
WHATSAPP_ENDPOINT_URL=https://your-whatsapp-api.com/send
WHATSAPP_ENDPOINT_AUTH_TOKEN=your-auth-token
```

## Performance Considerations

### Batch Processing

Both systems implement batch processing for performance:

**GeoEvent Processing:**
```typescript
// Process events in batches of 1000
const bulkSize = 1000;
for (let i = 0; i < geoEventsToBeCreated.length; i += bulkSize) {
  const chunk = geoEventsToBeCreated.slice(i, i + bulkSize);
  await prisma.geoEvent.createMany({
    data: chunk,
    skipDuplicates: true,
  });
}
```

**Notification Processing:**
```typescript
// Process notifications in chunks of 30 site alerts
const siteAlertsInChunks = createNestedChunksForUnprocessedSiteAlerts(
  unprocessedAlerts, 
  30
);
```

### Database Optimization

- **Spatial Indexing**: PostGIS indexes for geospatial queries
- **Bulk Operations**: `createMany` and `updateMany` for performance
- **Transaction Management**: Atomic operations for data consistency

## Monitoring and Observability

### Logging

All services implement structured logging:

```typescript
import { logger } from '../../../server/logger';

// Success logging
logger(`Successfully processed ${count} events`, 'info');

// Error logging  
logger(`Failed to send notification: ${error}`, 'error');

// Warning logging
logger(`Rate limit exceeded for site ${siteId}`, 'warn');
```

### Metrics Tracking

Key metrics are tracked in the database:

- **GeoEvent Processing**: Events fetched, processed, and stored
- **Notification Delivery**: Success/failure rates by method
- **Error Rates**: Failed notifications by type and reason
- **Performance**: Processing times and batch sizes

This service layer architecture provides a solid foundation for extending FireAlert with new data sources and notification channels while maintaining performance, reliability, and observability.