# GeoEventFetcher Refactoring - Deployment & Rollback Guide

## Overview

The GeoEventFetcher pipeline has been refactored to use a service layer architecture with improved separation of concerns, dependency injection, and better testability. A feature flag (`USE_REFACTORED_PIPELINE`) controls which implementation is active.

## Feature Flag Configuration

### Environment Variable

```bash
USE_REFACTORED_PIPELINE=true   # Use refactored implementation (new)
USE_REFACTORED_PIPELINE=false  # Use legacy implementation (old) - DEFAULT
```

**Default Behavior**: If not set, defaults to `false` (legacy implementation) for safe rollout.

### Where to Configure

1. **Local Development**: Add to `apps/server/.env`
2. **Production**: Set in your deployment platform's environment variables (e.g., Vercel, AWS, etc.)

## Deployment Strategy

### Phase 1: Initial Deployment (0% Traffic)

1. Deploy code with feature flag set to `false` (default)
2. Verify deployment is successful
3. Monitor logs to confirm legacy implementation is running

```bash
# In logs, you should see:
"Using LEGACY pipeline implementation"
```

### Phase 2: Canary Testing (10% Traffic)

1. Enable feature flag for a subset of requests or a staging environment
2. Set `USE_REFACTORED_PIPELINE=true` in staging environment
3. Monitor for 48 hours:
   - Error rates
   - Processing times
   - Alert creation counts
   - Memory usage

```bash
# In logs, you should see:
"Using REFACTORED pipeline implementation"
```

### Phase 3: Gradual Rollout (10% → 50% → 100%)

1. **10% Traffic**: Enable for 10% of production traffic
   - Monitor for 48 hours
   - Compare metrics with legacy implementation
2. **50% Traffic**: If error rate < 5% increase, expand to 50%
   - Monitor for 24 hours
   - Validate alert delivery consistency
3. **100% Traffic**: If all metrics are stable, enable for all traffic
   - Set `USE_REFACTORED_PIPELINE=true` globally
   - Monitor for 1 week

### Phase 4: Cleanup (After Successful Rollout)

1. Remove legacy implementation code
2. Remove feature flag logic
3. Update documentation
4. Delete backup files

## Rollback Procedures

### Immediate Rollback (Emergency)

If critical issues are detected:

1. **Set environment variable to false**:

   ```bash
   USE_REFACTORED_PIPELINE=false
   ```

2. **Redeploy or restart services** (depending on your platform):

   - Vercel: Redeploy with updated environment variable
   - AWS/Docker: Restart containers with updated env
   - Kubernetes: Update ConfigMap and restart pods

3. **Verify rollback**:
   - Check logs for "Using LEGACY pipeline implementation"
   - Monitor alert creation resumes normally
   - Verify no errors in error tracking (Sentry)

**Expected Downtime**: < 2 minutes (time to update env var and redeploy)

### Gradual Rollback

If non-critical issues are detected:

1. Reduce traffic percentage gradually (100% → 50% → 10% → 0%)
2. Investigate issues in staging environment
3. Fix issues and redeploy
4. Resume gradual rollout

## Monitoring Checklist

### Key Metrics to Monitor

- [ ] **Error Rate**: Should not increase by more than 5%
- [ ] **Processing Time**: Compare average time per provider
- [ ] **Events Processed**: Total events should match between implementations
- [ ] **Alerts Created**: Alert counts should be consistent
- [ ] **Memory Usage**: Monitor for memory leaks
- [ ] **Database Queries**: Check for N+1 queries or slow queries

### Log Messages to Watch

**Success Indicators**:

- "Using REFACTORED pipeline implementation"
- "Running Geo Event Fetcher. Taking X eligible providers."
- "Created X Site Alerts."

**Error Indicators**:

- Any uncaught exceptions
- Database connection errors
- Timeout errors
- "Something went wrong before creating notifications"

### Comparison Testing

Run both implementations side-by-side in staging:

```bash
# Terminal 1: Legacy
USE_REFACTORED_PIPELINE=false npm run server:dev

# Terminal 2: Refactored
USE_REFACTORED_PIPELINE=true npm run server:dev
```

Compare outputs:

- Events processed count
- Alerts created count
- Processing duration
- Error logs

## Architecture Differences

### Legacy Implementation

- Inline logic in handler
- Direct database queries
- No dependency injection
- Harder to test

### Refactored Implementation

- Service layer architecture
- Repository pattern for data access
- Dependency injection
- Testable components
- Better separation of concerns

## Key Files

### Handler

- `apps/server/src/pages/api/cron/geo-event-fetcher.ts` - Main handler with feature flag

### Services

- `apps/server/src/Services/GeoEventProviderService.ts` - Provider orchestration
- `apps/server/src/Services/GeoEventService.ts` - Event processing
- `apps/server/src/Services/SiteAlertService.ts` - Alert creation

### Repositories

- `apps/server/src/repositories/GeoEventProviderRepository.ts`
- `apps/server/src/repositories/GeoEventRepository.ts`
- `apps/server/src/repositories/SiteAlertRepository.ts`

### Utilities

- `apps/server/src/utils/BatchProcessor.ts`
- `apps/server/src/utils/ChecksumGenerator.ts`
- `apps/server/src/utils/DuplicateFilter.ts`
- `apps/server/src/utils/ProviderSelector.ts`
- `apps/server/src/utils/GeoEventProviderFactory.ts`

### Domain Models

- `apps/server/src/domain/GeoEventChecksum.ts`
- `apps/server/src/domain/ProcessingResult.ts`

## Troubleshooting

### Issue: Feature flag not taking effect

**Solution**:

1. Verify environment variable is set correctly
2. Restart the application/server
3. Check `env.mjs` is loading the variable
4. Verify no caching issues

### Issue: Different results between implementations

**Solution**:

1. Check database state is identical
2. Verify provider configurations match
3. Compare timestamps and time windows
4. Review checksum generation logic

### Issue: Performance degradation

**Solution**:

1. Check database connection pooling
2. Review batch sizes (may need tuning)
3. Monitor concurrent processing limits
4. Check for memory leaks

## Support

For issues or questions:

1. Check logs in your monitoring system (Sentry, CloudWatch, etc.)
2. Review this documentation
3. Contact the development team
4. Create an issue in the repository

## Timeline

- **Week 1**: Deploy with flag disabled (0% traffic)
- **Week 2**: Enable in staging, monitor (0% production)
- **Week 3**: Canary rollout (10% production)
- **Week 4**: Gradual increase (50% production)
- **Week 5**: Full rollout (100% production)
- **Week 6+**: Monitor and cleanup

## Success Criteria

- [ ] Zero increase in error rate
- [ ] Processing time within 10% of legacy
- [ ] 100% alert delivery consistency
- [ ] No memory leaks detected
- [ ] Successful 1-week production run
- [ ] Positive team feedback on code maintainability
