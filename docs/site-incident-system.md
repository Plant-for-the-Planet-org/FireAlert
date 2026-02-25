# SiteIncident System Documentation

## Overview

The SiteIncident system is a fire incident grouping and lifecycle management system that integrates with the FireAlert geo-event-fetcher CRON job. It groups related fire alerts into incidents and manages their lifecycle from creation through resolution.

## Architecture

### Components

1. **SiteIncidentService**: Orchestrates incident lifecycle management

   - Processes new SiteAlerts for incident creation or association
   - Resolves inactive incidents
   - Manages incident state transitions

2. **SiteIncidentRepository**: Data access layer for incident operations

   - Handles all database interactions with Prisma
   - Implements efficient queries for incident lookup and updates
   - Manages batch operations for performance

3. **IncidentResolver**: Specialized business logic for incident resolution
   - Determines incident resolution eligibility
   - Calculates incident state and geometry
   - Handles batch resolution operations

### Integration Points

The SiteIncident system integrates into the geo-event-fetcher CRON pipeline:

```
GeoEvent Fetching → SiteAlert Creation → SiteIncident Processing → Incident Resolution
```

## Incident Lifecycle

### Creation Phase

1. New SiteAlert is created from a GeoEvent
2. SiteIncidentService checks for active incidents on the same site
3. If no active incident exists, a new SiteIncident is created
4. If an active incident exists, the SiteAlert is associated with it

### Active Phase

- Incident remains active as long as new SiteAlerts are associated within the inactivity threshold (default: 6 hours)
- Each new alert updates the `latestSiteAlertId` field
- Incident tracks all associated alerts through the `startSiteAlertId` and `latestSiteAlertId` fields

### Resolution Phase

1. Incident is marked as inactive after 6+ hours of no new alerts
2. `isActive` is set to false
3. `endedAt` timestamp is recorded
4. `isProcessed` is set to false to trigger end notifications

## Configuration

### Environment Variables

- **INCIDENT_RESOLUTION_HOURS** (default: 6)

  - Hours of inactivity before an incident is marked as resolved
  - Configurable per deployment

- **ENABLE_INCIDENT_PROCESSING** (default: true)

  - Feature flag to enable/disable incident processing
  - Allows graceful degradation if needed

- **INCIDENT_BATCH_SIZE** (default: 100)
  - Batch size for incident resolution operations
  - Controls how many incidents are processed in a single batch

### Feature Flag

The SiteIncident system is only available in the refactored geo-event-fetcher pipeline. Enable it with:

```bash
USE_REFACTORED_PIPELINE=true
```

## Performance Characteristics

### Constraints

- **Per-Alert Processing**: < 100ms per SiteAlert for incident processing
- **Batch Resolution**: Efficient batch processing of multiple incidents
- **Database Queries**: Optimized with proper indexing and efficient query design

### Metrics

All incident operations include performance metrics:

- `process_alert_total`: Total time to process a new alert
- `find_active_incident`: Time to find active incident for a site
- `create_incident`: Time to create a new incident
- `associate_alert`: Time to associate alert with incident
- `resolve_inactive_total`: Total time for incident resolution phase
- `batch_resolve`: Time for batch resolution operations

## Error Handling

### Input Validation

All service methods validate inputs before processing:

- SiteAlert validation: Checks for required fields (id, siteId)
- SiteIncident validation: Checks for required fields (id, siteId)
- Data validation: Validates CreateIncidentData and UpdateIncidentData objects

### Error Recovery

- Individual incident failures don't block batch operations
- Incident processing failures don't block alert creation
- Comprehensive error logging with context for debugging

### Partial Failure Handling

- Batch resolution continues even if individual incidents fail
- Failed incidents are logged with error details
- Resolution result includes error count and details

## Logging

### Log Levels

- **DEBUG**: Detailed operation logs (incident creation, association, resolution)
- **INFO**: High-level operation summaries (batch completion, resolution phase)
- **WARN**: Non-critical issues (no valid incidents to resolve, slow operations)
- **ERROR**: Critical errors (validation failures, database errors)

### Log Examples

```
Processing new SiteAlert abc123 for site site456
Associating alert abc123 with existing incident inc789
Created new incident inc789 for site site456
Found 5 inactive incidents (>6h)
Resolution complete: 5/5 resolved in 245ms
```

## Database Schema

### SiteIncident Table

```sql
CREATE TABLE "SiteIncident" (
  id CUID PRIMARY KEY,
  siteId CUID NOT NULL REFERENCES "Site"(id),
  startSiteAlertId CUID NOT NULL REFERENCES "SiteAlert"(id),
  endSiteAlertId CUID REFERENCES "SiteAlert"(id),
  latestSiteAlertId CUID NOT NULL REFERENCES "SiteAlert"(id),
  startedAt TIMESTAMP NOT NULL,
  endedAt TIMESTAMP,
  isActive BOOLEAN DEFAULT true,
  isProcessed BOOLEAN DEFAULT false,
  startNotificationId CUID,
  endNotificationId CUID,
  reviewStatus VARCHAR DEFAULT 'to_review',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_site_incident_site_id_active ON "SiteIncident"(siteId, isActive);
CREATE INDEX idx_site_incident_started_at ON "SiteIncident"(startedAt);
CREATE INDEX idx_site_incident_is_active_processed ON "SiteIncident"(isActive, isProcessed);
```

## Operational Monitoring

### Key Metrics to Monitor

1. **Incident Creation Rate**: Number of new incidents created per CRON run
2. **Incident Resolution Rate**: Number of incidents resolved per CRON run
3. **Average Incident Duration**: Time from creation to resolution
4. **Processing Time**: Time spent on incident operations per CRON run
5. **Error Rate**: Percentage of failed incident operations

### Troubleshooting

#### No incidents being created

- Check if `ENABLE_INCIDENT_PROCESSING` is true
- Verify `USE_REFACTORED_PIPELINE` is true
- Check logs for validation errors

#### Incidents not resolving

- Verify `INCIDENT_RESOLUTION_HOURS` is set correctly
- Check if incidents have `isProcessed = false`
- Review database for stale incidents

#### Performance issues

- Monitor `process_alert_total` duration
- Check batch resolution times
- Verify database indexes are present
- Consider adjusting `INCIDENT_BATCH_SIZE`

## Integration with Notifications

The SiteIncident system integrates with the notification system:

1. **Start Notification**: Sent when a new incident is created
2. **End Notification**: Sent when an incident is resolved
3. **Duplicate Prevention**: Prevents duplicate notifications for the same incident phase

## Future Enhancements

- Geometry union calculations for incident detection areas
- Advanced incident clustering based on spatial proximity
- Incident severity scoring based on alert density
- Custom incident resolution rules per site
- Incident analytics and reporting

## Support and Maintenance

For issues or questions about the SiteIncident system:

1. Check the logs for error messages
2. Review the configuration in `.env`
3. Verify database connectivity and schema
4. Check the design document for detailed specifications
5. Contact the development team with specific error details
