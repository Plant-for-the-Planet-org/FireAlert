# Fire Incident Tracking API Documentation

## Overview

This document describes the tRPC API endpoints for the Fire Incident Tracking feature. All endpoints are accessible via the `siteIncident` router.

**Base Path**: `/api/trpc/siteIncident`

---

## Table of Contents

1. [Query Endpoints](#query-endpoints)
   - [getIncidentPublic](#getincidentpublic)
   - [getIncident](#getincident)
   - [getActiveIncidents](#getactiveincidents)
   - [getIncidentHistory](#getincidenthistory)
2. [Mutation Endpoints](#mutation-endpoints)
   - [updateIncidentReviewStatus](#updateincidentreviewstatus)
   - [closeIncident](#closeincident)
3. [Mock API Endpoints (Testing)](#mock-api-endpoints)
   - [mockCreateIncidentNotifications](#mockcreateincidentnotifications)
   - [mockSendIncidentNotifications](#mocksendincidentnotifications)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)

---

## Query Endpoints

### getIncidentPublic

Get a single incident by ID (public endpoint for sharing).

**Type**: `publicProcedure` (no authentication required)

**Input**:

```typescript
{
  incidentId: string; // CUID format
}
```

**Response**:

```typescript
{
  status: "success";
  data: {
    id: string;
    siteId: string;
    startSiteAlertId: string;
    endSiteAlertId: string | null;
    latestSiteAlertId: string;
    startedAt: Date;
    endedAt: Date | null;
    isActive: boolean;
    isProcessed: boolean;
    startNotificationId: string | null;
    endNotificationId: string | null;
    reviewStatus: "to_review" | "in_review" | "reviewed";
    createdAt: Date;
    updatedAt: Date;
    site: {
      id: string;
      name: string | null;
      geometry: Json;
      project: {
        id: string;
        name: string;
      } | null;
    };
    startSiteAlert: {
      id: string;
      eventDate: Date;
      latitude: number;
      longitude: number;
      detectedBy: string;
      confidence: "high" | "medium" | "low";
    };
    latestSiteAlert: {
      id: string;
      eventDate: Date;
      latitude: number;
      longitude: number;
      detectedBy: string;
      confidence: "high" | "medium" | "low";
    };
    siteAlerts: Array<{
      id: string;
      eventDate: Date;
      latitude: number;
      longitude: number;
      detectedBy: string;
      confidence: "high" | "medium" | "low";
    }>;
  };
}
```

**Example Usage**:

```typescript
const result = await trpc.siteIncident.getIncidentPublic.query({
  incidentId: "clx1234567890abcdefghijk",
});
```

**Errors**:

- `NOT_FOUND`: Incident not found
- `INTERNAL_SERVER_ERROR`: Something went wrong

---

### getIncident

Get a single incident by ID (protected endpoint).

**Type**: `protectedProcedure` (requires authentication)

**Input**:

```typescript
{
  incidentId: string; // CUID format
}
```

**Response**:

```typescript
{
  id: string;
  siteId: string;
  startSiteAlertId: string;
  endSiteAlertId: string | null;
  latestSiteAlertId: string;
  startedAt: Date;
  endedAt: Date | null;
  isActive: boolean;
  isProcessed: boolean;
  startNotificationId: string | null;
  endNotificationId: string | null;
  reviewStatus: "to_review" | "in_review" | "reviewed";
  createdAt: Date;
  updatedAt: Date;
  // Includes all related data
}
```

**Authorization**: User must have permission to view the site associated with the incident.

**Example Usage**:

```typescript
const incident = await trpc.siteIncident.getIncident.query({
  incidentId: "clx1234567890abcdefghijk",
});
```

**Errors**:

- `NOT_FOUND`: Incident not found
- `UNAUTHORIZED`: User doesn't have permission to view this site

---

### getActiveIncidents

Get all active incidents for a specific site.

**Type**: `protectedProcedure` (requires authentication)

**Input**:

```typescript
{
  siteId: string; // CUID format
}
```

**Response**:

```typescript
Array<SiteIncident>; // Array of active incidents (typically 0 or 1)
```

**Authorization**: User must have permission to view the specified site.

**Example Usage**:

```typescript
const activeIncidents = await trpc.siteIncident.getActiveIncidents.query({
  siteId: "clx9876543210zyxwvutsrqp",
});
```

**Notes**:

- Returns an array, but typically contains at most one incident per site
- Returns empty array if no active incidents exist

---

### getIncidentHistory

Get incident history for a site within a date range.

**Type**: `protectedProcedure` (requires authentication)

**Input**:

```typescript
{
  siteId: string; // CUID format
  startDate: Date | string; // ISO 8601 format if string
  endDate: Date | string; // ISO 8601 format if string
}
```

**Response**:

```typescript
Array<{
  id: string;
  siteId: string;
  startSiteAlertId: string;
  endSiteAlertId: string | null;
  latestSiteAlertId: string;
  startedAt: Date;
  endedAt: Date | null;
  isActive: boolean;
  isProcessed: boolean;
  startNotificationId: string | null;
  endNotificationId: string | null;
  reviewStatus: "to_review" | "in_review" | "reviewed";
  createdAt: Date;
  updatedAt: Date;
  site: Site;
  startSiteAlert: SiteAlert;
  latestSiteAlert: SiteAlert;
  endSiteAlert: SiteAlert | null;
  siteAlerts: SiteAlert[]; // Ordered by eventDate ascending
}>;
```

**Authorization**: User must have permission to view the specified site.

**Validation**:

- `startDate` must be before or equal to `endDate`

**Example Usage**:

```typescript
const history = await trpc.siteIncident.getIncidentHistory.query({
  siteId: "clx9876543210zyxwvutsrqp",
  startDate: "2024-01-01T00:00:00Z",
  endDate: "2024-12-31T23:59:59Z",
});
```

**Errors**:

- `BAD_REQUEST`: Start date must be before end date
- `UNAUTHORIZED`: User doesn't have permission to view this site

---

## Mutation Endpoints

### updateIncidentReviewStatus

Update the review status of an incident.

**Type**: `protectedProcedure` (requires authentication)

**Input**:

```typescript
{
  incidentId: string; // CUID format
  status: "to_review" | "in_review" | "reviewed";
}
```

**Response**:

```typescript
{
  id: string;
  siteId: string;
  // ... all incident fields
  reviewStatus: "to_review" | "in_review" | "reviewed"; // Updated status
  updatedAt: Date; // Updated timestamp
}
```

**Authorization**: User must have permission to modify the site associated with the incident.

**Example Usage**:

```typescript
const updatedIncident =
  await trpc.siteIncident.updateIncidentReviewStatus.mutate({
    incidentId: "clx1234567890abcdefghijk",
    status: "reviewed",
  });
```

**Errors**:

- `NOT_FOUND`: Incident not found
- `BAD_REQUEST`: Invalid review status
- `UNAUTHORIZED`: User doesn't have permission to modify this site

---

### closeIncident

Manually close an active incident (admin operation).

**Type**: `protectedProcedure` (requires authentication)

**Input**:

```typescript
{
  incidentId: string; // CUID format
}
```

**Response**:

```typescript
{
  id: string;
  siteId: string;
  // ... all incident fields
  isActive: false; // Set to false
  isProcessed: false; // Set to false to trigger END notification
  endedAt: Date; // Set to current timestamp
  updatedAt: Date; // Updated timestamp
}
```

**Authorization**: User must have permission to modify the site associated with the incident.

**Validation**:

- Incident must be currently active (`isActive: true`)

**Example Usage**:

```typescript
const closedIncident = await trpc.siteIncident.closeIncident.mutate({
  incidentId: "clx1234567890abcdefghijk",
});
```

**Errors**:

- `NOT_FOUND`: Incident not found
- `BAD_REQUEST`: Incident is already closed
- `UNAUTHORIZED`: User doesn't have permission to modify this site

---

## Mock API Endpoints

These endpoints are for testing the notification system without CRON automation.

### mockCreateIncidentNotifications

Create incident boundary notifications for testing.

**Type**: `protectedProcedure` (requires authentication)

**Input**:

```typescript
{
  incidentId?: string;  // Optional: Filter by specific incident
  siteId?: string;      // Optional: Filter by specific site
  notificationType?: "START" | "END"; // Optional: Filter by notification type
}
```

**Response**:

```typescript
{
  success: boolean;
  notificationsCreated: number;
  processedIncidentIds: string[];
  methodCounts: {
    [method: string]: number; // e.g., { "sms": 5, "email": 3, "whatsapp": 2 }
  };
  errors: string[];
}
```

**Behavior**:

- Processes unprocessed SiteIncidents (where `isProcessed=false`)
- Creates notifications for each verified and enabled alert method
- Marks incidents as processed after notification creation
- Applies optional filters if provided

**Example Usage**:

```typescript
// Create all pending incident notifications
const result = await trpc.siteIncident.mockCreateIncidentNotifications.mutate(
  {}
);

// Create notifications for a specific incident
const result = await trpc.siteIncident.mockCreateIncidentNotifications.mutate({
  incidentId: "clx1234567890abcdefghijk",
});

// Create only START notifications for a specific site
const result = await trpc.siteIncident.mockCreateIncidentNotifications.mutate({
  siteId: "clx9876543210zyxwvutsrqp",
  notificationType: "START",
});
```

**Notes**:

- This endpoint calls the same service used by the production CRON job
- Maintains transactional consistency
- Safe to call multiple times (idempotent for already processed incidents)

---

### mockSendIncidentNotifications

Send incident boundary notifications for testing.

**Type**: `protectedProcedure` (requires authentication)

**Input**:

```typescript
{
  incidentId?: string;  // Optional: Filter by specific incident
  siteId?: string;      // Optional: Filter by specific site
  notificationType?: "START" | "END"; // Optional: Filter by notification type
  batchSize?: number;   // Optional: Number of notifications per batch (default: 10)
}
```

**Response**:

```typescript
{
  success: boolean;
  notificationsSent: number;
  notificationsFailed: number;
  processedIncidentIds: string[];
  failureStats: {
    [method: string]: number; // e.g., { "sms": 2, "email": 1 }
  };
  errors: string[];
}
```

**Behavior**:

- Processes notifications with `START_SCHEDULED` or `END_SCHEDULED` status
- Delivers through configured alert methods (SMS, WhatsApp, Email, Device, Webhook)
- Updates `notificationStatus` to `START_SENT` or `END_SENT` on success
- Marks failed notifications as skipped
- Applies optional filters if provided

**Example Usage**:

```typescript
// Send all pending incident notifications
const result = await trpc.siteIncident.mockSendIncidentNotifications.mutate({});

// Send notifications for a specific incident
const result = await trpc.siteIncident.mockSendIncidentNotifications.mutate({
  incidentId: "clx1234567890abcdefghijk",
});

// Send only END notifications for a specific site with custom batch size
const result = await trpc.siteIncident.mockSendIncidentNotifications.mutate({
  siteId: "clx9876543210zyxwvutsrqp",
  notificationType: "END",
  batchSize: 20,
});
```

**Notes**:

- This endpoint calls the same service used by the production CRON job
- Maintains transactional consistency
- Implements rate limiting (0.7s delay between batches)
- Safe to call multiple times (only processes unsent notifications)

---

## Data Models

### SiteIncident

```typescript
{
  id: string; // CUID
  siteId: string; // Foreign key to Site

  // Lifecycle tracking
  startSiteAlertId: string; // First alert that triggered incident
  latestSiteAlertId: string; // Most recent alert (updated while active)
  endSiteAlertId: string | null; // Last alert before closure

  // Timestamps
  startedAt: Date; // When incident was created
  endedAt: Date | null; // When incident was closed

  // State management
  isActive: boolean; // Whether incident is ongoing
  isProcessed: boolean; // Whether notifications have been sent

  // Notification tracking
  startNotificationId: string | null; // START notification reference
  endNotificationId: string | null; // END notification reference

  // Audit trail
  reviewStatus: "to_review" | "in_review" | "reviewed";

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### NotificationStatus Enum

```typescript
enum NotificationStatus {
  START_SCHEDULED = "START_SCHEDULED", // START notification created, awaiting send
  START_SENT = "START_SENT", // START notification successfully sent
  END_SCHEDULED = "END_SCHEDULED", // END notification created, awaiting send
  END_SENT = "END_SENT", // END notification successfully sent
}
```

### Incident Notification Metadata

Stored in the `Notification.metadata` JSON field:

```typescript
{
  type: "INCIDENT_START" | "INCIDENT_END";
  incidentId: string;
  siteId: string;
  siteName: string;
  detectionCount?: number;    // For END notifications: count of alerts in incident
  durationMinutes?: number;   // For END notifications: incident duration in minutes
}
```

---

## Error Handling

### Error Codes

All endpoints use standard tRPC error codes:

- **`BAD_REQUEST`**: Invalid input or validation failure
- **`UNAUTHORIZED`**: User not authenticated or lacks permission
- **`NOT_FOUND`**: Requested resource doesn't exist
- **`INTERNAL_SERVER_ERROR`**: Unexpected server error

### Error Response Format

```typescript
{
  error: {
    code: string;           // Error code (e.g., "NOT_FOUND")
    message: string;        // Human-readable error message
    data?: {
      code: string;         // tRPC error code
      httpStatus: number;   // HTTP status code
      path: string;         // API path that failed
    };
  };
}
```

### Common Error Scenarios

1. **Permission Denied**:

   ```typescript
   {
     code: "UNAUTHORIZED",
     message: "User doesn't have permission to view this site"
   }
   ```

2. **Invalid Input**:

   ```typescript
   {
     code: "BAD_REQUEST",
     message: "Start date must be before end date"
   }
   ```

3. **Resource Not Found**:
   ```typescript
   {
     code: "NOT_FOUND",
     message: "Incident not found"
   }
   ```

---

## Testing Workflow

### Complete Testing Flow

1. **Create a SiteIncident** (via SiteAlert processing or manual creation)
2. **Create notifications**:

   ```typescript
   const createResult =
     await trpc.siteIncident.mockCreateIncidentNotifications.mutate({});
   console.log(`Created ${createResult.notificationsCreated} notifications`);
   ```

3. **Send notifications**:

   ```typescript
   const sendResult =
     await trpc.siteIncident.mockSendIncidentNotifications.mutate({});
   console.log(`Sent ${sendResult.notificationsSent} notifications`);
   console.log(`Failed ${sendResult.notificationsFailed} notifications`);
   ```

4. **Verify incident status**:

   ```typescript
   const incident = await trpc.siteIncident.getIncident.query({
     incidentId: "clx1234567890abcdefghijk",
   });
   console.log(`Incident processed: ${incident.isProcessed}`);
   ```

5. **Review incident history**:
   ```typescript
   const history = await trpc.siteIncident.getIncidentHistory.query({
     siteId: "clx9876543210zyxwvutsrqp",
     startDate: new Date("2024-01-01"),
     endDate: new Date(),
   });
   console.log(`Found ${history.length} incidents`);
   ```

---

## Environment Variables

The following environment variables affect the notification system:

- **`INCIDENT_INACTIVITY_HOURS`**: Hours of inactivity before closing an incident (default: 6)
- **`ENABLE_INCIDENT_NOTIFICATIONS`**: Feature flag for incident notifications (default: true)
- **`NOTIFICATION_BATCH_SIZE`**: Number of notifications to process per batch (default: 10)
- **`ALERT_SMS_DISABLED`**: Disable SMS notifications (default: false)
- **`ALERT_WHATSAPP_DISABLED`**: Disable WhatsApp notifications (default: false)

---

## Additional Resources

- **Requirements**: See `.kiro/specs/fire-incident/requirements.md`
- **Design**: See `.kiro/specs/fire-incident/design.md`
- **Tasks**: See `.kiro/specs/fire-incident/tasks.md`
- **Service Implementation**:
  - `apps/server/src/Services/SiteIncident/CreateIncidentNotifications.ts`
  - `apps/server/src/Services/SiteIncident/SendIncidentNotifications.ts`
- **Router**: `apps/server/src/server/api/routers/siteIncident.ts`
- **Schemas**: `apps/server/src/server/api/zodSchemas/siteIncident.schema.ts`
