# Extending Providers and Notifiers

## Quick Start Guide

This guide provides step-by-step instructions for extending FireAlert with new GeoEvent providers and notification methods.

## Adding a New GeoEvent Provider

### Overview

GeoEvent providers fetch environmental data from external sources and transform it into standardized `GeoEvent` objects. The system supports any data source that can provide geospatial event data.

### Step-by-Step Implementation

#### 1. Create Provider Class

Create a new file: `apps/server/src/Services/GeoEventProvider/ProviderClass/YourProviderClass.ts`

```typescript
import {
  type GeoEventProviderConfig,
  type GeoEventProviderClientId,
  type GeoEventProviderConfigGeneral,
  type GeoEventProviderClass
} from '../../../Interfaces/GeoEventProvider';
import { type geoEventInterface as GeoEvent } from '../../../Interfaces/GeoEvent';
import { Confidence } from '../../../Interfaces/GeoEvent';
import { logger } from '../../../server/logger';

// Define your provider-specific configuration
interface YourProviderConfig extends GeoEventProviderConfig {
  apiUrl: string;
  apiKey: string;
  // Add any other configuration properties
}

class YourGeoEventProvider implements GeoEventProviderClass {
  private config: GeoEventProviderConfigGeneral | undefined;

  constructor() {
    this.getLatestGeoEvents = this.getLatestGeoEvents.bind(this);
  }

  getKey(): string {
    return 'YOUR_PROVIDER_KEY'; // Unique identifier for your provider
  }

  initialize(config?: GeoEventProviderConfigGeneral): void {
    this.config = config;
  }

  async getLatestGeoEvents(
    geoEventProviderClientId: string,
    geoEventProviderId: string,
    slice: string,
    clientApiKey: string,
    lastRun: Date | null
  ): Promise<GeoEvent[]> {
    try {
      // 1. Determine time range for data fetching
      const currentTime = new Date();
      const fromTime = lastRun || new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

      // 2. Fetch data from your external API
      const rawData = await this.fetchDataFromAPI(fromTime, currentTime, clientApiKey);

      // 3. Transform raw data to GeoEvent format
      const geoEvents = this.transformToGeoEvents(
        rawData,
        geoEventProviderClientId,
        geoEventProviderId,
        slice
      );

      logger(`Fetched ${geoEvents.length} events from ${this.getKey()}`, 'info');
      return geoEvents;

    } catch (error) {
      logger(`Error fetching data from ${this.getKey()}: ${error}`, 'error');
      throw error;
    }
  }

  private async fetchDataFromAPI(
    fromTime: Date,
    toTime: Date,
    apiKey: string
  ): Promise<any[]> {
    const { apiUrl } = this.getConfig();
    
    // Build your API request
    const url = `${apiUrl}/events?from=${fromTime.toISOString()}&to=${toTime.toISOString()}&key=${apiKey}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private transformToGeoEvents(
    rawData: any[],
    geoEventProviderClientId: string,
    geoEventProviderId: string,
    slice: string
  ): GeoEvent[] {
    return rawData.map(item => ({
      type: 'fire', // or other event type
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      eventDate: new Date(item.timestamp),
      confidence: this.mapConfidence(item.confidence),
      geoEventProviderClientId: geoEventProviderClientId as GeoEventProviderClientId,
      geoEventProviderId: geoEventProviderId,
      slice: slice,
      data: item // Store original data for reference
    }));
  }

  private mapConfidence(rawConfidence: any): Confidence {
    // Map your provider's confidence values to FireAlert's confidence levels
    if (rawConfidence >= 0.8) return Confidence.High;
    if (rawConfidence >= 0.5) return Confidence.Medium;
    return Confidence.Low;
  }

  private getConfig(): YourProviderConfig {
    if (!this.config) {
      throw new Error('Provider not initialized with configuration');
    }

    // Validate required configuration properties
    const requiredFields = ['apiUrl', 'bbox', 'slice', 'client'];
    for (const field of requiredFields) {
      if (!this.config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }

    return this.config as YourProviderConfig;
  }
}

export default YourGeoEventProvider;
```

#### 2. Register the Provider

Update `apps/server/src/Services/GeoEventProvider/GeoEventProviderRegistry.ts`:

```typescript
import YourGeoEventProvider from './ProviderClass/YourGeoEventProvider';

const GeoEventProviderClassRegistry = createGeoEventProviderClassRegistry([
  new NasaGeoEventProvider(),
  new GOES16GeoEventProvider(),
  new YourGeoEventProvider(), // Add your provider here
]);
```

#### 3. Add Provider Configuration

Add your provider to the database via SQL or admin interface:

```sql
INSERT INTO "GeoEventProvider" (
  id,
  name,
  description,
  type,
  clientId,
  clientApiKey,
  fetchFrequency,
  isActive,
  config
) VALUES (
  gen_random_uuid(),
  'Your Provider Name',
  'Description of what your provider does',
  'fire', -- or other event type
  'YOUR_CLIENT_ID', -- Unique client identifier
  'your-api-key-here',
  3600, -- Fetch frequency in seconds (1 hour)
  true, -- Set to true to activate
  '{
    "apiUrl": "https://api.yourprovider.com",
    "bbox": "your-bounding-box-config",
    "slice": "your-slice-config",
    "client": "YOUR_PROVIDER_KEY"
  }'::jsonb
);
```

#### 4. Test Your Provider

Create a test script to verify your provider works:

```typescript
// test-your-provider.ts
import YourGeoEventProvider from './YourGeoEventProvider';

async function testProvider() {
  const provider = new YourGeoEventProvider();
  
  provider.initialize({
    apiUrl: 'https://api.yourprovider.com',
    bbox: 'test-bbox',
    slice: 'test-slice',
    client: 'YOUR_PROVIDER_KEY'
  });

  try {
    const events = await provider.getLatestGeoEvents(
      'TEST_CLIENT',
      'test-provider-id',
      'test-slice',
      'test-api-key',
      null
    );
    
    console.log(`Successfully fetched ${events.length} events`);
    console.log('Sample event:', events[0]);
  } catch (error) {
    console.error('Provider test failed:', error);
  }
}

testProvider();
```

## Adding a New Notifier

### Overview

Notifiers send notifications through various channels (email, SMS, push, etc.). Each notifier implements a standard interface and handles its own delivery logic and error handling.

### Step-by-Step Implementation

#### 1. Create Notifier Class

Create a new file: `apps/server/src/Services/Notifier/Notifier/YourNotifier.ts`

```typescript
import { type NotificationParameters } from '../../../Interfaces/NotificationParameters';
import type { AdditionalOptions } from '../../../Interfaces/AdditionalOptions';
import type Notifier from '../Notifier';
import { NOTIFICATION_METHOD } from '../methodConstants';
import { logger } from '../../../server/logger';
import { prisma } from '../../../server/db';
import { handleFailedNotification as genericFailedNotificationHandler } from '../handleFailedNotification';

class YourNotifier implements Notifier {
  getSupportedMethods(): string[] {
    return [NOTIFICATION_METHOD.YOUR_METHOD]; // Define your method constant
  }

  async notify(
    destination: string,
    parameters: NotificationParameters,
    options?: AdditionalOptions,
  ): Promise<boolean> {
    try {
      // 1. Validate configuration
      if (!this.isConfigured()) {
        logger('Your notifier is not configured', 'warn');
        return false;
      }

      // 2. Validate destination format
      if (!this.isValidDestination(destination)) {
        logger(`Invalid destination format: ${destination}`, 'error');
        await this.handleInvalidDestination(destination, parameters.id);
        return false;
      }

      // 3. Prepare notification payload
      const payload = this.preparePayload(parameters);

      // 4. Send notification to external service
      const success = await this.sendNotification(destination, payload);

      if (success) {
        logger(`Successfully sent notification via ${this.getSupportedMethods()[0]}`, 'info');
        return true;
      } else {
        throw new Error('Notification delivery failed');
      }

    } catch (error) {
      logger(`Failed to send notification: ${error}`, 'error');
      
      // Handle specific error types
      await this.handleNotificationError(error, destination, parameters);
      
      return false;
    }
  }

  private isConfigured(): boolean {
    // Check if required environment variables or configuration is present
    return !!(process.env.YOUR_API_KEY && process.env.YOUR_API_URL);
  }

  private isValidDestination(destination: string): boolean {
    // Validate destination format (email, phone, URL, etc.)
    // Example for email:
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(destination);
  }

  private preparePayload(parameters: NotificationParameters): any {
    const { message, subject, url, alert } = parameters;
    
    return {
      to: parameters.alert?.siteName || 'FireAlert',
      subject: subject,
      message: message,
      url: url,
      alertData: alert,
      timestamp: new Date().toISOString()
    };
  }

  private async sendNotification(destination: string, payload: any): Promise<boolean> {
    const apiUrl = process.env.YOUR_API_URL;
    const apiKey = process.env.YOUR_API_KEY;

    const response = await fetch(`${apiUrl}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destination: destination,
        ...payload
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.success === true;
  }

  private async handleNotificationError(
    error: any,
    destination: string,
    parameters: NotificationParameters
  ): Promise<void> {
    // Handle specific error codes from your service
    if (error.code === 'INVALID_DESTINATION') {
      await this.handleInvalidDestination(destination, parameters.id);
    } else if (error.code === 'RATE_LIMITED') {
      // Don't disable, just log and retry later
      logger(`Rate limited for destination: ${destination}`, 'warn');
    } else {
      // Generic error handling
      await this.handleFailedNotification({
        destination: destination,
        method: this.getSupportedMethods()[0],
      });
    }
  }

  private async handleInvalidDestination(
    destination: string,
    notificationId?: string
  ): Promise<void> {
    try {
      // Delete the notification if it exists
      if (notificationId) {
        await prisma.notification.delete({
          where: { id: notificationId }
        });
      }

      // Disable the alert method
      await prisma.alertMethod.updateMany({
        where: {
          destination: destination,
          method: this.getSupportedMethods()[0]
        },
        data: {
          isEnabled: false,
          isVerified: false,
          failCount: { increment: 1 }
        }
      });

      logger(`Disabled invalid destination: ${destination}`, 'info');
    } catch (dbError) {
      logger(`Database error handling invalid destination: ${dbError}`, 'error');
    }
  }

  // Use the generic failed notification handler
  handleFailedNotification = genericFailedNotificationHandler;
}

export default YourNotifier;
```

#### 2. Add Method Constant

Update `apps/server/src/Services/Notifier/methodConstants.ts`:

```typescript
export const NOTIFICATION_METHOD = {
  EMAIL: 'email',
  SMS: 'sms',
  DEVICE: 'device',
  WEBHOOK: 'webhook',
  WHATSAPP: 'whatsapp',
  TEST: 'test',
  YOUR_METHOD: 'your_method', // Add your method here
} as const;
```

#### 3. Register the Notifier

Update `apps/server/src/Services/Notifier/NotifierRegistry.ts`:

```typescript
import YourNotifier from './Notifier/YourNotifier';

const NotifierRegistry = createNotifierRegistry([
  new WhatsAppNotifier(),
  new DeviceNotifier(),
  new EmailNotifier(),
  new SMSNotifier(),
  new WebhookNotifier(),
  new TestNotifier(),
  new YourNotifier(), // Add your notifier here
]);
```

#### 4. Add Environment Configuration

Update your `.env` file or environment configuration:

```bash
# Your Notifier Configuration
YOUR_API_URL=https://api.yourservice.com
YOUR_API_KEY=your-api-key-here
YOUR_WEBHOOK_SECRET=your-webhook-secret
```

#### 5. Update Environment Schema

Update `apps/server/src/env.mjs` to include your configuration:

```javascript
const server = z.object({
  // ... existing configuration
  YOUR_API_URL: z.string().url().optional(),
  YOUR_API_KEY: z.string().optional(),
  YOUR_WEBHOOK_SECRET: z.string().optional(),
});

const processEnv = {
  // ... existing environment variables
  YOUR_API_URL: process.env.YOUR_API_URL,
  YOUR_API_KEY: process.env.YOUR_API_KEY,
  YOUR_WEBHOOK_SECRET: process.env.YOUR_WEBHOOK_SECRET,
};
```

#### 6. Test Your Notifier

Create a test script:

```typescript
// test-your-notifier.ts
import YourNotifier from './YourNotifier';

async function testNotifier() {
  const notifier = new YourNotifier();
  
  const testParameters = {
    id: 'test-notification-id',
    message: 'Test fire alert message',
    subject: 'Fire Alert Test',
    url: 'https://firealert.example.com/alert/test',
    alert: {
      id: 'test-alert-id',
      type: 'fire',
      confidence: 'high',
      source: 'TEST',
      date: new Date(),
      longitude: -122.4194,
      latitude: 37.7749,
      distance: 500,
      data: {},
      siteId: 'test-site-id',
      siteName: 'Test Site'
    }
  };

  try {
    const success = await notifier.notify(
      'test@example.com', // or appropriate test destination
      testParameters
    );
    
    console.log(`Notification test ${success ? 'passed' : 'failed'}`);
  } catch (error) {
    console.error('Notifier test failed:', error);
  }
}

testNotifier();
```

## Advanced Patterns

### Provider with Authentication

```typescript
class AuthenticatedProvider implements GeoEventProviderClass {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async getLatestGeoEvents(...args): Promise<GeoEvent[]> {
    // Ensure we have a valid token before making requests
    await this.ensureAuthenticated();
    
    // Proceed with data fetching
    return this.fetchWithAuth(...args);
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.authenticate();
    }
  }

  private async authenticate(): Promise<void> {
    const { clientId, clientSecret } = this.getConfig();
    
    const response = await fetch('https://api.provider.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
  }
}
```

### Notifier with Retry Logic

```typescript
class RetryableNotifier implements Notifier {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  async notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const success = await this.attemptNotification(destination, parameters);
        if (success) return true;
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error;
        }
        await this.delay(this.retryDelay * attempt);
      }
    }
    
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Batch Processing Provider

```typescript
class BatchProcessingProvider implements GeoEventProviderClass {
  async getLatestGeoEvents(...args): Promise<GeoEvent[]> {
    const allEvents: GeoEvent[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.fetchBatch(offset, batchSize);
      allEvents.push(...batch);
      
      hasMore = batch.length === batchSize;
      offset += batchSize;
      
      // Add delay to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return allEvents;
  }
}
```

## Best Practices

### Error Handling

1. **Graceful Degradation**: Always return `false` instead of throwing errors in notifiers
2. **Specific Error Handling**: Handle different error types appropriately
3. **Logging**: Use structured logging with appropriate log levels
4. **Database Cleanup**: Remove invalid destinations and disable failed alert methods

### Configuration Management

1. **Environment Variables**: Use environment variables for sensitive configuration
2. **Validation**: Validate all configuration at startup
3. **Defaults**: Provide sensible defaults where possible
4. **Documentation**: Document all configuration options

### Performance

1. **Batch Processing**: Process data in batches to avoid memory issues
2. **Rate Limiting**: Respect external API rate limits
3. **Caching**: Cache authentication tokens and frequently accessed data
4. **Async Operations**: Use async/await for all I/O operations

### Security

1. **Input Validation**: Validate all external data
2. **Secrets Management**: Never hardcode API keys or secrets
3. **HTTPS**: Always use HTTPS for external API calls
4. **Error Messages**: Don't expose sensitive information in error messages

### Testing

1. **Unit Tests**: Test individual methods in isolation
2. **Integration Tests**: Test with real external services in development
3. **Mock Services**: Use mocks for testing error conditions
4. **Configuration Tests**: Test with various configuration scenarios

This guide provides everything you need to extend FireAlert with new data sources and notification channels while maintaining the system's reliability and performance standards.