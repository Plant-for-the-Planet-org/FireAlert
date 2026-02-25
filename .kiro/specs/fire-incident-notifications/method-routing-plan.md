# Method-Specific Notification Routing Plan

## Executive Summary

This plan outlines the architecture for splitting notification processing based on `AlertMethod.method`, routing:

- **SiteAlert-based notifications** → `device`, `webhook` methods (real-time, per-alert)
- **SiteIncident-based notifications** → `email`, `sms`, `whatsapp` methods (aggregated, incident boundaries)

## Current State Analysis

### Existing Architecture

**Cron Handlers:**

- `notification-creator.ts` - Uses `ENABLE_INCIDENT_NOTIFICATIONS` flag to switch between services
- `notification-sender.ts` - Uses same flag to switch between services

**Service Pairs:**

1. **SiteAlert-based** (Legacy):
   - `CreateNotifications.ts` - Processes unprocessed SiteAlerts
   - `SendNotifications.ts` - Sends notifications with per-alert messages

2. **SiteIncident-based** (New):
   - `CreateIncidentNotifications.ts` - Processes unprocessed SiteIncidents
   - `SendIncidentNotifications.ts` - Sends notifications with incident boundary messages

### Key Observations

1. **Current Toggle is Binary**: `ENABLE_INCIDENT_NOTIFICATIONS` switches ALL methods, not per-method
2. **Method Handling Differences**:
   - Legacy: `device`/`webhook` get `Infinity` counter (unlimited notifications)
   - Legacy: `email`/`sms`/`whatsapp` get counted (rate-limited per site)
3. **Status Tracking**: Incident notifications use `NotificationStatus` enum (START_SCHEDULED, END_SCHEDULED, etc.)
4. **Both Services Handle All Methods**: No current filtering by method type

## Proposed Architecture

### 1. Configuration Layer

Create a centralized configuration that defines routing rules:

**File**: `apps/server/src/Services/Notifications/NotificationRoutingConfig.ts`

```typescript
export const NOTIFICATION_ROUTING = {
  // Real-time methods: Send per SiteAlert
  SITE_ALERT_METHODS: ["device", "webhook"] as const,

  // Aggregated methods: Send per SiteIncident boundaries
  SITE_INCIDENT_METHODS: ["email", "sms", "whatsapp"] as const,
} as const;

export type SiteAlertMethod =
  (typeof NOTIFICATION_ROUTING.SITE_ALERT_METHODS)[number];
export type SiteIncidentMethod =
  (typeof NOTIFICATION_ROUTING.SITE_INCIDENT_METHODS)[number];

export function isSiteAlertMethod(method: string): method is SiteAlertMethod {
  return NOTIFICATION_ROUTING.SITE_ALERT_METHODS.includes(method as any);
}

export function isSiteIncidentMethod(
  method: string,
): method is SiteIncidentMethod {
  return NOTIFICATION_ROUTING.SITE_INCIDENT_METHODS.includes(method as any);
}
```

### 2. Unified Cron Handlers

**Modify**: `notification-creator.ts` and `notification-sender.ts`

Instead of binary toggle, run BOTH services in parallel:

```typescript
// notification-creator.ts (Pseudocode)
async function notificationsCron() {
  // Run both services in parallel
  const [alertNotifications, incidentNotifications] = await Promise.all([
    CreateNotifications.run(), // Filtered to device/webhook only
    CreateIncidentNotifications.run(), // Filtered to email/sms/whatsapp only
  ]);

  return alertNotifications + incidentNotifications;
}
```

### 3. Service Modifications

#### 3.1 CreateNotifications.ts (SiteAlert-based)

**Changes**:

1. Filter alert methods to ONLY `device` and `webhook`
2. Remove rate-limiting logic (these methods should fire immediately)
3. Keep `Infinity` counter for these methods
4. Remove `lastMessageCreated` updates (not needed for real-time)

**Key Code Changes**:

```typescript
// In processSiteAlertChunk()
const validMethods = allAlertMethods.filter(
  (m: any) => m.isVerified && m.isEnabled && isSiteAlertMethod(m.method),
);

// Remove rate-limiting check
const canCreateNotification = true; // Always create for device/webhook

// Don't update lastMessageCreated
// Remove sitesToBeUpdated logic
```

#### 3.2 CreateIncidentNotifications.ts (SiteIncident-based)

**Changes**:

1. Filter alert methods to ONLY `email`, `sms`, `whatsapp`
2. Keep rate-limiting logic (incident-based already handles this)
3. Keep `lastMessageCreated` updates

**Key Code Changes**:

```typescript
// In createNotificationQueue()
const validMethods = allAlertMethods.filter(
  (m: any) => m.isVerified && m.isEnabled && isSiteIncidentMethod(m.method),
);
```

#### 3.3 SendNotifications.ts (SiteAlert-based)

**Changes**:

1. Filter to ONLY process notifications for `device` and `webhook`
2. Query condition: `alertMethod IN ['device', 'webhook']`
3. Keep existing message format (per-alert details)

**Key Code Changes**:

```typescript
const notifications = await prisma.notification.findMany({
  where: {
    isSkipped: false,
    isDelivered: false,
    sentAt: null,
    alertMethod: { in: ["device", "webhook"] },
    // Exclude incident-based statuses
    notificationStatus: null, // or NOT IN [START_SCHEDULED, END_SCHEDULED, etc.]
  },
  // ...
});
```

#### 3.4 SendIncidentNotifications.ts (SiteIncident-based)

**Changes**:

1. Already filters by `NotificationStatus` (START_SCHEDULED, END_SCHEDULED)
2. Add explicit method filter: `alertMethod IN ['email', 'sms', 'whatsapp']`

**Key Code Changes**:

```typescript
const notifications = await prisma.notification.findMany({
  where: {
    isSkipped: false,
    isDelivered: false,
    notificationStatus: {
      in: [
        NotificationStatus.START_SCHEDULED,
        NotificationStatus.END_SCHEDULED,
      ],
    },
    alertMethod: { in: ["email", "sms", "whatsapp"] },
  },
  // ...
});
```

### 4. Database Schema Considerations

**Notification Table**:

- `notificationStatus` field distinguishes incident-based notifications
- `null` status = SiteAlert-based notification
- `START_SCHEDULED`, `END_SCHEDULED`, etc. = SiteIncident-based notification

**No schema changes needed** - existing structure supports this routing.

### 5. Migration Strategy

#### Phase 1: Add Configuration Layer

- Create `NotificationRoutingConfig.ts`
- Add helper functions for method type checking

#### Phase 2: Update Creator Services

- Modify `CreateNotifications.ts` to filter for device/webhook
- Modify `CreateIncidentNotifications.ts` to filter for email/sms/whatsapp
- Add logging to show which methods are being processed

#### Phase 3: Update Sender Services

- Modify `SendNotifications.ts` query to filter device/webhook
- Modify `SendIncidentNotifications.ts` query to filter email/sms/whatsapp
- Add logging to show which methods are being sent

#### Phase 4: Update Cron Handlers

- Remove `ENABLE_INCIDENT_NOTIFICATIONS` flag
- Run both services in parallel
- Aggregate counts for response

#### Phase 5: Testing & Validation

- Test device notifications fire per-alert
- Test email notifications fire per-incident
- Verify no duplicate notifications
- Verify correct message content per method

### 6. Environment Variable Changes

**Remove**:

- `ENABLE_INCIDENT_NOTIFICATIONS` (no longer needed)

**Keep**:

- `ALERT_SMS_DISABLED` (still useful for disabling SMS)
- `ALERT_WHATSAPP_DISABLED` (still useful for disabling WhatsApp)
- `NOTIFICATION_BATCH_SIZE` (still useful for rate limiting)

### 7. Backward Compatibility

**Transition Period**:

1. Keep `ENABLE_INCIDENT_NOTIFICATIONS` flag initially
2. When `true`: Use new parallel approach
3. When `false`: Use legacy approach
4. After validation, remove flag entirely

### 8. Testing Strategy

**Unit Tests**:

- Test `isSiteAlertMethod()` and `isSiteIncidentMethod()` helpers
- Test method filtering in each service

**Integration Tests**:

- Create test SiteAlerts with device/webhook methods → verify notifications created
- Create test SiteIncidents with email/sms methods → verify notifications created
- Verify no cross-contamination (device doesn't get incident notifications)

**End-to-End Tests**:

- Run full cron cycle
- Verify device gets immediate per-alert notifications
- Verify email gets aggregated incident notifications
- Check notification counts and delivery status

## Implementation Checklist

- [ ] 1. Create `NotificationRoutingConfig.ts` with method routing rules
- [ ] 2. Update `CreateNotifications.ts` to filter device/webhook methods
- [ ] 3. Update `CreateIncidentNotifications.ts` to filter email/sms/whatsapp methods
- [ ] 4. Update `SendNotifications.ts` query to filter device/webhook methods
- [ ] 5. Update `SendIncidentNotifications.ts` query to filter email/sms/whatsapp methods
- [ ] 6. Modify `notification-creator.ts` to run both services in parallel
- [ ] 7. Modify `notification-sender.ts` to run both services in parallel
- [ ] 8. Add comprehensive logging for debugging
- [ ] 9. Write unit tests for routing logic
- [ ] 10. Write integration tests for each service
- [ ] 11. Test in staging environment
- [ ] 12. Deploy to production
- [ ] 13. Monitor for 48 hours
- [ ] 14. Remove `ENABLE_INCIDENT_NOTIFICATIONS` flag after validation

## Benefits of This Approach

1. **Clear Separation**: Each method type has dedicated processing logic
2. **Easy Configuration**: Single source of truth for routing rules
3. **Maintainable**: Easy to add new methods or change routing
4. **Backward Compatible**: Can run in parallel with legacy system
5. **Type Safe**: TypeScript types ensure correct method handling
6. **Testable**: Each service can be tested independently
7. **Scalable**: Services run in parallel for better performance

## Risks & Mitigations

**Risk**: Duplicate notifications during transition
**Mitigation**: Use `notificationStatus` field to distinguish notification types

**Risk**: Missing notifications if filtering is wrong
**Mitigation**: Comprehensive logging and monitoring

**Risk**: Performance impact from running both services
**Mitigation**: Services already process in batches; parallel execution may improve performance

**Risk**: Configuration drift between services
**Mitigation**: Centralized configuration file with TypeScript types

## Future Enhancements

1. **Dynamic Routing**: Allow per-user or per-site method routing preferences
2. **Method-Specific Rate Limiting**: Different rate limits per method type
3. **Priority Queuing**: High-priority methods (device) processed first
4. **Retry Logic**: Method-specific retry strategies
5. **Analytics**: Track notification success rates per method type
