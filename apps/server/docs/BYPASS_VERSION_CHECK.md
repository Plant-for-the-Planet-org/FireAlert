# BYPASS_VERSION_CHECK Environment Variable

## Overview

The `BYPASS_VERSION_CHECK` environment variable allows developers to bypass version validation checks during development and testing. When enabled, the API server will skip all version compatibility checks, allowing clients with any version to access the API.

## Usage

### Enable Bypass Mode

Set the environment variable to `'true'` (as a string):

```bash
BYPASS_VERSION_CHECK=true
```

### Disable Bypass Mode

Either set it to any other value or leave it unset:

```bash
BYPASS_VERSION_CHECK=false
# or simply omit the variable
```

## Behavior

When `BYPASS_VERSION_CHECK=true`:

1. **Version Middleware**: All version validation is skipped for every API request
2. **Logging**: A warning is logged for each bypassed request: `"Version check bypassed via BYPASS_VERSION_CHECK environment variable for endpoint: {endpoint}"`
3. **Version Context**: The `bypassEnabled` flag is set to `true` in the tRPC context
4. **UI Warning**: A warning indicator is displayed in both mobile and web UIs

## Warning Indicators

### Mobile App (React Native)

When version checks are bypassed, the debug modal (accessed by tapping version 7 times) displays:

```
⚠️ Version checks are bypassed
Development mode active
```

The warning appears in a yellow box below the server version information.

### Web Client

The footer version display shows:

```
Version 2026-02-18 ⚠️ Version checks bypassed
```

The warning appears in a yellow badge next to the version number.

## Use Cases

### Development

Enable bypass mode when:

- Testing features without version enforcement
- Developing with mismatched client/server versions
- Running local development environment

### Testing

Enable bypass mode to:

- Test different client versions against the same API
- Verify functionality without version constraints
- Simulate version spoofing scenarios

### Production

**⚠️ NEVER enable bypass mode in production!**

This setting should only be used in development and testing environments. Enabling it in production:

- Removes version compatibility protection
- Allows outdated clients to access potentially incompatible APIs
- Bypasses critical security and compatibility checks

## Implementation Details

### Server-Side

The bypass check occurs early in the version middleware:

```typescript
const bypassVersionCheck = process.env.BYPASS_VERSION_CHECK === 'true';
if (bypassVersionCheck) {
  logger(
    `Version check bypassed via BYPASS_VERSION_CHECK environment variable for endpoint: ${procedureName}`,
    'warn',
  );
  return next({
    ctx: {
      ...ctx,
      version: {
        bypassEnabled: true,
        isCompatible: true,
        gracePeriodActive: metadata.gracePeriod.enabled,
      },
    },
  });
}
```

### Client-Side Detection

Clients can detect bypass mode by checking the `version.info` endpoint:

```typescript
const serverVersionInfo = await trpc.version.info.useQuery();
if (serverVersionInfo.bypassEnabled) {
  // Show warning indicator
}
```

## Related Configuration

- **Grace Period**: `version-metadata.json` → `gracePeriod.enabled`
- **Bypass Endpoints**: `version-metadata.json` → `bypassEndpoints`
- **Minimum Versions**: `version-metadata.json` → `minimumVersions`

## Monitoring

When bypass mode is enabled:

- All bypassed requests are logged with `warn` level
- The `version.info` endpoint returns `bypassEnabled: true`
- Version check analytics still track requests but mark them as bypassed

## Requirements

Implements requirements:

- **14.1**: Allow version check bypass via configuration flag
- **14.2**: Log when version checks are bypassed
- **14.5**: Display warning indicator in UI when bypass is active
