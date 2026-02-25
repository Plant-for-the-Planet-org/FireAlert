# Changelog

All notable changes to FireAlert will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project uses dual versioning:

- **CalVer (YYYY-MM-DD)**: Internal development versioning
- **SemVer (MAJOR.MINOR.PATCH)**: Public app store versioning

## Version Mapping

| CalVer     | SemVer | Release Date | Platform     |
| ---------- | ------ | ------------ | ------------ |
| 2026-02-25 | 1.6.0  | 2026-02-25   | iOS, Android |

---

## [2026-02-25] - 1.6.0 - 2026-02-25

### Added

- **API Versioning System**: Implemented dual versioning (CalVer + SemVer) with version compatibility enforcement
- **Version Check Mechanism**: Automatic version checks on app launch and periodic intervals
- **Force Update Modal**: Blocking modal for critical updates requiring immediate action
- **Soft Update Banner**: Dismissible banner for recommended updates with new features
- **Version Middleware**: Server-side validation of client versions with compatibility matrix
- **Version Metrics**: Analytics endpoint for tracking version distribution and update rates
- **Development Bypass Mode**: Environment variable to bypass version checks during development
- **Version Display**: Added version information to mobile settings and web footer

### Changed

- Build system now injects version information automatically into iOS and Android builds
- API responses now include `X-API-Version` header for client tracking

### Technical

- Added `version-config.json` for centralized version management
- Added `version-metadata.json` for server-side version policies
- Implemented tRPC version router with check, info, changelog, and metrics endpoints
- Created version utilities for validation, compatibility checking, and analytics

---

## Template for Future Releases

```markdown
## [YYYY-MM-DD] - MAJOR.MINOR.PATCH - YYYY-MM-DD

### Breaking Changes

- Description of breaking changes that require client updates

### Added

- New features and capabilities

### Changed

- Changes to existing functionality

### Deprecated

- Features that will be removed in future versions

### Removed

- Features that have been removed

### Fixed

- Bug fixes and corrections

### Security

- Security-related changes and fixes

### Technical

- Internal technical changes, refactoring, or infrastructure updates
```

---

## Guidelines for Maintaining This Changelog

1. **Version Mapping Table**: Always update the version mapping table at the top when adding a new release
2. **Date Format**: Use ISO 8601 format (YYYY-MM-DD) for all dates
3. **Categories**: Use the standard categories (Breaking Changes, Added, Changed, Deprecated, Removed, Fixed, Security, Technical)
4. **User-Facing Language**: Write release notes in user-friendly language, avoiding technical jargon when possible
5. **Feature Highlights**: For soft updates, highlight the most compelling features to encourage adoption
6. **Breaking Changes**: Always document breaking changes prominently at the top of the release notes
7. **CalVer to SemVer Mapping**: Ensure CalVer and SemVer versions are properly mapped in both the table and release headers
