# SiteIncident System Performance Validation

## Performance Constraints

The SiteIncident system is designed to meet the following performance requirements:

- **Per-Alert Processing**: < 100ms per SiteAlert for incident processing
- **Batch Processing**: Efficient batch resolution of multiple incidents
- **Database Queries**: Optimized with proper indexing and efficient query design
- **Memory Usage**: Minimal memory footprint during batch operations

## Performance Metrics Collection

All incident operations include comprehensive performance metrics:

### SiteIncidentService Metrics

```typescript
// Alert Processing Metrics
process_alert_total: Total time to process a new alert
find_active_incident: Time to find active incident for a site
create_incident: Time to create a new incident
associate_alert: Time to associate alert with incident

// Resolution Metrics
resolve_inactive_total: Total time for incident resolution phase
find_inactive: Time to find inactive incidents
batch_resolve: Time for batch resolution operations
```

### SiteAlertService Metrics

```typescript
// Alert Creation Metrics
alert_creation_total: Total time for alert creation phase
geostationary_query: Time for geostationary provider query
polar_query: Time for polar provider query
incident_processing: Time for incident processing phase
```

## Performance Optimization Strategies

### 1. Database Query Optimization

**Indexes**:

```sql
CREATE INDEX idx_site_incident_site_id_active ON "SiteIncident"(siteId, isActive);
CREATE INDEX idx_site_incident_started_at ON "SiteIncident"(startedAt);
CREATE INDEX idx_site_incident_is_active_processed ON "SiteIncident"(isActive, isProcessed);
```

**Query Patterns**:

- Use indexed columns in WHERE clauses
- Batch operations to reduce round trips
- Selective field queries to minimize data transfer

### 2. Batch Processing

**Incident Resolution Batching**:

- Process multiple incidents in a single batch
- Configurable batch size via `INCIDENT_BATCH_SIZE` (default: 100)
- Reduces database round trips and improves throughput

**Alert Processing Batching**:

- Process alerts in batches of 500 (GEOSTATIONARY) or 1000 (POLAR)
- Reduces incident processing overhead
- Maintains performance under high load

### 3. Caching and Memoization

**Active Incident Lookup**:

- Efficient single-query lookup per site
- Ordered by `startedAt DESC` to get most recent incident
- Minimal memory footprint

### 4. Error Handling Efficiency

**Graceful Degradation**:

- Individual incident failures don't block batch operations
- Incident processing failures don't block alert creation
- Errors are logged but don't impact performance

## Performance Benchmarks

### Expected Performance

Based on the architecture and optimization strategies:

| Operation                     | Expected Duration | Constraint |
| ----------------------------- | ----------------- | ---------- |
| Find active incident          | 5-10ms            | < 100ms    |
| Create new incident           | 10-15ms           | < 100ms    |
| Associate alert               | 5-10ms            | < 100ms    |
| Process single alert          | 20-35ms           | < 100ms    |
| Resolve single incident       | 10-20ms           | N/A        |
| Batch resolve (100 incidents) | 1000-2000ms       | N/A        |

### Scaling Characteristics

- **Linear scaling** with number of alerts processed
- **Sublinear scaling** with batch resolution (due to batching efficiency)
- **Constant memory** per alert (no accumulation)

## Tuning Recommendations

### For High-Volume Deployments

1. **Increase INCIDENT_BATCH_SIZE**:

   ```bash
   INCIDENT_BATCH_SIZE=500  # Process more incidents per batch
   ```

2. **Optimize Database Connection Pool**:

   - Increase pool size for concurrent operations
   - Monitor connection utilization

3. **Monitor Slow Queries**:
   - Enable `DATABASE_LOG_SLOWQUERY=true`
   - Review slow query logs regularly
   - Add indexes for frequently slow queries

### For Low-Latency Requirements

1. **Decrease INCIDENT_BATCH_SIZE**:

   ```bash
   INCIDENT_BATCH_SIZE=50  # Process fewer incidents per batch
   ```

2. **Increase INCIDENT_RESOLUTION_HOURS**:

   ```bash
   INCIDENT_RESOLUTION_HOURS=12  # Reduce resolution frequency
   ```

3. **Enable Caching**:
   - Use Redis for active incident lookups
   - Cache site-to-incident mappings

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Alert Processing Time**:

   - Alert: If `process_alert_total` > 100ms
   - Action: Review database performance, check for slow queries

2. **Incident Resolution Time**:

   - Alert: If `resolve_inactive_total` > 5000ms
   - Action: Check batch size, review database load

3. **Error Rate**:

   - Alert: If error count > 5% of operations
   - Action: Review error logs, check data integrity

4. **Memory Usage**:
   - Alert: If memory growth > 10% per CRON run
   - Action: Check for memory leaks, review batch sizes

### Logging for Performance Analysis

Enable debug logging to capture detailed performance metrics:

```bash
# In your application
logger(`process_alert completed in ${duration}ms`, 'debug');
logger(`batch_resolve completed in ${duration}ms`, 'debug');
```

## Performance Testing

### Unit Performance Tests

Test individual operations:

```typescript
// Test alert processing performance
const startTime = Date.now();
await siteIncidentService.processNewSiteAlert(alert);
const duration = Date.now() - startTime;
expect(duration).toBeLessThan(100);
```

### Integration Performance Tests

Test full pipeline:

```typescript
// Test full CRON execution
const startTime = Date.now();
await refactoredImplementation(req, res);
const duration = Date.now() - startTime;
expect(duration).toBeLessThan(300000); // 5 minutes
```

### Load Testing

Test under realistic load:

```typescript
// Simulate high-volume alert processing
const alerts = generateRandomAlerts(10000);
const startTime = Date.now();
for (const alert of alerts) {
  await siteIncidentService.processNewSiteAlert(alert);
}
const duration = Date.now() - startTime;
const avgTime = duration / alerts.length;
expect(avgTime).toBeLessThan(100);
```

## Performance Optimization Checklist

- [ ] Database indexes are created and verified
- [ ] Batch sizes are configured appropriately
- [ ] Query patterns are optimized
- [ ] Error handling doesn't impact performance
- [ ] Memory usage is monitored
- [ ] Slow queries are identified and optimized
- [ ] Performance metrics are collected and analyzed
- [ ] Load testing has been performed
- [ ] Monitoring and alerting are configured
- [ ] Documentation is updated with findings

## Conclusion

The SiteIncident system is designed to meet the 100ms per-alert constraint through:

1. Efficient database queries with proper indexing
2. Batch processing to reduce overhead
3. Graceful error handling that doesn't impact performance
4. Comprehensive metrics collection for monitoring
5. Configurable parameters for tuning

Regular monitoring and optimization ensure the system maintains performance under varying load conditions.
