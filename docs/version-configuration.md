# Version Configuration System

## Overview

The FireAlert monorepo uses a dual versioning strategy:

- **CalVer (Calendar Versioning)**: Internal date-based versioning in YYYY-MM-DD format for development coordination
- **SemVer (Semantic Versioning)**: Public MAJOR.MINOR.PATCH versioning for app store releases

## Configuration Files

### 1. version-config.json (Monorepo Root)

**Location**: `/version-config.json`

**Purpose**: Single source of truth for all version information across the monorepo.

**Structure**:

```json
{
  "calver": "2026-02-18", // Current internal version (YYYY-MM-DD)
  "semver": "1.9.0", // Current public version (MAJOR.MINOR.PATCH)
  "buildNumbers": {
    "android": 24, // Android versionCode
    "ios": 24 // iOS CURRENT_PROJECT_VERSION
  },
  "versionMappings": {
    "2026-02-18": {
      "semver": "1.9.0",
      "releaseDate": "2026-02-18T00:00:00Z",
      "releaseNotes": "Added API versioning system with force update support"
    }
  }
}
```

**Usage**:

- Read by build scripts to inject versions into platform-specific files
- Updated manually when creating new releases
- Maintains historical mapping of CalVer to SemVer versions

### 2. version-metadata.json (Server Config)

**Location**: `/apps/server/config/version-metadata.json`

**Purpose**: Runtime configuration for version enforcement and compatibility checks.

**Structure**:

```json
{
  "apiVersion": "2026-02-18",
  "minimumVersions": {
    "ios": "2026-01-01",
    "android": "2026-01-01",
    "web": "2026-01-15"
  },
  "recommendedVersions": {
    "ios": "2026-02-18",
    "android": "2026-02-18",
    "web": "2026-02-18"
  },
  "compatibilityMatrix": [
    {
      "clientVersionPattern": "2026-02-*",
      "minApiVersion": "2026-02-01",
      "maxApiVersion": "2026-12-31",
      "platforms": ["ios", "android", "web"]
    }
  ],
  "forceUpdateMessages": {
    "ios": "A critical update is required. Please update FireAlert from the App Store to continue.",
    "android": "A critical update is required. Please update FireAlert from the Play Store to continue.",
    "web": "A critical update is required. The page will refresh automatically."
  },
  "softUpdateMessages": {
    "ios": "A new version of FireAlert is available. Update now for the latest features and improvements.",
    "android": "A new version of FireAlert is available. Update now for the latest features and improvements.",
    "web": "A new version is available. Refresh to get the latest updates."
  },
  "gracePeriod": {
    "enabled": false,
    "endDate": "2026-03-01T00:00:00Z"
  },
  "bypassEndpoints": ["version.check", "version.info", "health"]
}
```

**Usage**:

- Loaded by API server at runtime
- Supports hot reload (changes take effect without server restart)
- Controls version enforcement behavior
- Defines compatibility rules between client and API versions

## Schema Validation

Both configuration files are validated using Zod schemas defined in:
`apps/server/src/utils/version/schema.ts`

### Validation Script

Run validation manually:

```bash
npx tsx scripts/validate-version-config.ts
```

This script validates:

- CalVer format (YYYY-MM-DD)
- SemVer format (MAJOR.MINOR.PATCH)
- Required fields presence
- Data type correctness
- Date format validity

## Version Format Rules

### CalVer (YYYY-MM-DD)

- **Format**: Four-digit year, two-digit month, two-digit day
- **Example**: `2026-02-18`
- **Validation**: Must be a valid calendar date
- **Usage**: Internal development tracking, API versioning

### SemVer (MAJOR.MINOR.PATCH)

- **Format**: Three numeric components separated by dots
- **Example**: `1.9.0`
- **Rules**:
  - MAJOR: Breaking API changes
  - MINOR: New features with backward compatibility
  - PATCH: Bug fixes and minor updates
- **Usage**: App store releases, user-facing version

## Updating Versions

### For New Releases

1. **Update version-config.json**:

   ```json
   {
     "calver": "2026-03-01",
     "semver": "1.10.0",
     "buildNumbers": {
       "android": 25,
       "ios": 25
     }
   }
   ```

2. **Add version mapping**:

   ```json
   "versionMappings": {
     "2026-03-01": {
       "semver": "1.10.0",
       "releaseDate": "2026-03-01T00:00:00Z",
       "releaseNotes": "Your release notes here"
     }
   }
   ```

3. **Update version-metadata.json** (if needed):

   - Update `apiVersion` to match new CalVer
   - Adjust `minimumVersions` if deprecating old clients
   - Update `recommendedVersions` to new version
   - Add compatibility matrix rules if needed

4. **Validate configuration**:

   ```bash
   npx tsx scripts/validate-version-config.ts
   ```

5. **Build and deploy**:
   - Build scripts will automatically inject versions
   - Server will load new metadata on next deployment

## Compatibility Matrix

The compatibility matrix defines which client versions work with which API versions.

### Pattern Matching

Supports wildcard patterns:

- `"2026-02-*"` - Matches all versions in February 2026
- `"2026-*"` - Matches all versions in 2026
- `"*"` - Matches all versions

### Example Rule

```json
{
  "clientVersionPattern": "2026-02-*",
  "minApiVersion": "2026-02-01",
  "maxApiVersion": "2026-12-31",
  "platforms": ["ios", "android", "web"]
}
```

This rule means:

- Clients with version 2026-02-XX
- Are compatible with API versions from 2026-02-01 to 2026-12-31
- Applies to iOS, Android, and Web platforms

## Grace Period

The grace period allows gradual rollout of version enforcement:

```json
"gracePeriod": {
  "enabled": true,
  "endDate": "2026-03-01T00:00:00Z"
}
```

**When enabled**:

- Clients without version headers are allowed (with warning logs)
- Version checks are non-blocking
- Analytics collected on version distribution

**When disabled**:

- Version headers required for all requests
- Incompatible versions are rejected
- Force update enforcement active

## Bypass Endpoints

Certain endpoints skip version validation:

```json
"bypassEndpoints": ["version.check", "version.info", "health"]
```

These endpoints:

- Don't require version headers
- Always accessible regardless of client version
- Used for version checking and health monitoring

## Best Practices

1. **Always validate** configuration files after changes
2. **Test in staging** before updating production metadata
3. **Use grace period** when rolling out new version requirements
4. **Monitor analytics** before enforcing minimum versions
5. **Provide clear messages** in force/soft update notifications
6. **Maintain backward compatibility** when possible
7. **Document breaking changes** in release notes
8. **Increment build numbers** for each release

## Troubleshooting

### Validation Errors

If validation fails:

1. Check CalVer format (YYYY-MM-DD)
2. Check SemVer format (MAJOR.MINOR.PATCH)
3. Verify all required fields are present
4. Ensure dates are valid ISO 8601 format
5. Check compatibility matrix min <= max

### Hot Reload Not Working

If metadata changes don't take effect:

1. Check file permissions
2. Verify JSON syntax is valid
3. Check server logs for reload errors
4. Restart server if necessary

### Version Mismatch Errors

If clients are rejected:

1. Check client version in request headers
2. Verify compatibility matrix rules
3. Check minimum version requirements
4. Review grace period settings
5. Check bypass endpoint list

## Related Documentation

- [API Versioning System Design](.kiro/specs/api-versioning-system/design.md)
- [API Versioning System Requirements](.kiro/specs/api-versioning-system/requirements.md)
- [Implementation Tasks](.kiro/specs/api-versioning-system/tasks.md)
