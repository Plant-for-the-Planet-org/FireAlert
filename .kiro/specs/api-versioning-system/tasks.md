# Implementation Plan: API Versioning System

## Overview

This implementation plan breaks down the API Versioning System into discrete coding tasks that build incrementally. The system implements dual versioning (CalVer for internal development, SemVer for public releases) with version compatibility enforcement, minimum version checks, and coordinated release management across the React Native mobile app, Next.js web client, and tRPC API server.

## Tasks

- [ ] 1. Create version configuration infrastructure

  - Create `version-config.json` at monorepo root with CalVer, SemVer, build numbers, and version mappings structure
  - Create `version-metadata.json` in `apps/server/config/` with minimum versions, recommended versions, compatibility matrix, update messages, grace period, and bypass endpoints
  - Add JSON schema validation for both configuration files
  - _Requirements: 1.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 2. Implement version validation utilities

  - [ ] 2.1 Create version format validators and comparators

    - Implement `isValidCalVer()` function to validate YYYY-MM-DD format and real dates
    - Implement `isValidSemVer()` function to validate MAJOR.MINOR.PATCH format
    - Implement `compareVersions()` function for CalVer comparison (returns -1, 0, 1)
    - Implement `matchesPattern()` function for wildcard pattern matching (supports "2026-02-_", "2026-_")
    - Create utility file at `apps/server/src/utils/version/validator.ts`
    - _Requirements: 1.1, 1.5, 2.1, 10.4_

  - [ ]\* 2.2 Write property tests for version validators

    - **Property 1: CalVer format validation**
    - **Property 4: SemVer format validation**
    - **Property 11: Wildcard pattern matching**
    - **Property 14: Version comparison correctness**
    - **Validates: Requirements 1.1, 1.5, 2.1, 10.4**

  - [ ] 2.3 Create version metadata schema validation

    - Implement Zod schema for `VersionMetadata` type
    - Implement `validateMetadata()` function using Zod
    - Create schema file at `apps/server/src/utils/version/schema.ts`
    - _Requirements: 8.7_

  - [ ]\* 2.4 Write property test for metadata schema validation
    - **Property 13: Metadata schema validation**
    - **Validates: Requirements 8.7**

- [ ] 3. Implement compatibility matrix evaluation

  - [ ] 3.1 Create compatibility evaluation logic

    - Implement `evaluateCompatibility()` function that checks if API version falls within min/max bounds of matching rule
    - Support wildcard pattern matching for client version patterns
    - Implement default compatibility policy (allow versions within 3 months)
    - Create utility file at `apps/server/src/utils/version/compatibility.ts`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

  - [ ]\* 3.2 Write property tests for compatibility evaluation
    - **Property 9: Compatibility matrix bounds**
    - **Property 10: Compatibility evaluation with bounds**
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [ ] 4. Create version injection build script

  - [ ] 4.1 Implement version injection utility

    - Create `scripts/version-inject.ts` that reads `version-config.json`
    - Implement Android build.gradle update (versionCode, versionName) using regex replacement
    - Implement iOS project settings update (MARKETING_VERSION, CURRENT_PROJECT_VERSION) using xcode npm package
    - Generate `apps/nativeapp/app/constants/version.ts` with VERSION_CONFIG constant
    - Generate `apps/server/src/config/version.ts` with VERSION_CONFIG constant
    - Append build entry to `build-history.log` with timestamp and version mapping
    - Validate release notes exist for current version before build
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 15.6_

  - [ ]\* 4.2 Write unit tests for version injection
    - Test Android build.gradle injection
    - Test iOS project settings injection
    - Test React Native constants generation
    - Test Next.js constants generation
    - Test build history logging
    - Test release notes validation

- [ ] 5. Integrate version injection into build systems

  - Update `apps/nativeapp/android/app/build.gradle` to use injected versionCode and versionName
  - Update `apps/nativeapp/ios/` project settings to use MARKETING_VERSION and CURRENT_PROJECT_VERSION variables
  - Add pre-build script to `apps/nativeapp/package.json` that runs version injection
  - Add pre-build script to `apps/server/package.json` that runs version injection
  - Add generated version files to `.gitignore`
  - _Requirements: 9.1, 9.2_

- [ ] 6. Checkpoint - Verify build system integration

  - Ensure version injection script runs successfully
  - Verify generated version constants are correct
  - Ensure build history log is created
  - Ask the user if questions arise

- [ ] 7. Implement server-side version infrastructure

  - [ ] 7.1 Create metadata loader with hot reload

    - Implement `loadVersionMetadata()` function that reads and validates `version-metadata.json`
    - Implement file watcher for hot reload without server restart
    - Cache metadata in memory with invalidation on file change
    - Handle errors gracefully with fallback to last known good configuration
    - Create utility file at `apps/server/src/utils/version/metadataLoader.ts`
    - _Requirements: 8.6, 8.7_

  - [ ] 7.2 Create version logging and analytics utilities

    - Implement `logVersionCheck()` function to log client version, platform, result, and timestamp
    - Implement version distribution aggregation logic
    - Create analytics file at `apps/server/src/utils/version/analytics.ts`
    - _Requirements: 13.1, 13.2_

  - [ ] 7.3 Implement version comparison and helper utilities
    - Implement `getDownloadUrl()` function for platform-specific app store URLs
    - Implement `getNewFeatures()` function to extract features between versions from changelog
    - Create helper file at `apps/server/src/utils/version/helpers.ts`
    - _Requirements: 5.3, 6.4_

- [ ] 8. Implement tRPC version middleware

  - [ ] 8.1 Create version validation middleware

    - Implement middleware that extracts `X-Client-Version` and `X-Client-Platform` headers
    - Check if endpoint is in bypass list and skip validation if true
    - Handle missing version during grace period (log warning, allow request)
    - Validate client version against compatibility matrix using `evaluateCompatibility()`
    - Throw `PRECONDITION_FAILED` TRPCError for incompatible versions with client/API version details
    - Add version context to tRPC context (clientVersion, platform, isCompatible, bypassEnabled, gracePeriodActive)
    - Log all version check results
    - Create middleware file at `apps/server/src/server/api/middleware/versionMiddleware.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 12.1, 12.2_

  - [ ]\* 8.2 Write property test for version middleware

    - **Property 7: Version middleware validation logic**
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ]\* 8.3 Write unit tests for version middleware
    - Test compatible version allows request
    - Test incompatible version rejects request
    - Test bypass for whitelisted endpoints
    - Test grace period behavior
    - Test missing version header handling

- [ ] 9. Implement version check tRPC router

  - [ ] 9.1 Create version router with check endpoint

    - Implement `version.check` mutation that accepts clientVersion, platform, buildNumber, appVersion
    - Load version metadata and compare client version against minimum and recommended versions
    - Return force update response if client < minimum (include message, minimumVersion, downloadUrl, serverVersion)
    - Return soft update response if minimum ≤ client < recommended (include message, recommendedVersion, downloadUrl, serverVersion, features)
    - Return success response if client ≥ recommended (include currentVersion, serverVersion, compatibilityMatrix, nextCheckIn)
    - Log version check for analytics
    - Create router file at `apps/server/src/server/api/routers/version.ts`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]\* 9.2 Write property test for version check response correctness

    - **Property 3: Version check response correctness**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**

  - [ ] 9.3 Add version info and changelog endpoints

    - Implement `version.info` query that returns current CalVer and API version
    - Implement `version.changelog` query that returns changelog entries with optional filtering
    - _Requirements: 3.1, 15.5_

  - [ ]\* 9.4 Write unit tests for version check endpoint

    - Test force update response for outdated client
    - Test soft update response for recent but not latest client
    - Test success response for up-to-date client
    - Test invalid platform handling

  - [ ] 9.5 Add version router to tRPC app router
    - Import and register version router in main tRPC router
    - Ensure version endpoints bypass version middleware
    - _Requirements: 7.6_

- [ ] 10. Add API version headers to responses

  - [ ] 10.1 Create response header middleware

    - Implement middleware that adds `X-API-Version` header with current CalVer to all responses
    - Add middleware to tRPC middleware chain
    - _Requirements: 3.2, 7.4_

  - [ ]\* 10.2 Write property test for API response version headers
    - **Property 2: API response version headers**
    - **Validates: Requirements 3.2, 7.4**

- [ ] 11. Checkpoint - Verify server implementation

  - Ensure version middleware is working
  - Test version check endpoint with different scenarios
  - Verify API version headers are present
  - Ensure metadata hot reload works
  - Ask the user if questions arise

- [ ] 12. Implement mobile version check hook

  - [ ] 12.1 Create useVersionCheck hook

    - Implement hook that reads version from `VERSION_CONFIG` constant
    - Call `version.check` tRPC mutation on mount with clientVersion, platform, buildNumber, appVersion
    - Schedule periodic version checks every 24 hours using setInterval
    - Manage state for isChecking, lastCheck, updateRequired, updateMessage, downloadUrl
    - Implement `dismissSoftUpdate()` function that stores dismissal in AsyncStorage with session key
    - Trigger onForceUpdate and onSoftUpdate callbacks based on response
    - Handle network failures with exponential backoff (max 3 retries)
    - Create hook file at `apps/nativeapp/app/hooks/version/useVersionCheck.ts`
    - _Requirements: 4.1, 4.6, 4.7, 6.3_

  - [ ]\* 12.2 Write unit tests for useVersionCheck hook
    - Test version check on mount
    - Test force update callback trigger
    - Test soft update dismissal in AsyncStorage
    - Test periodic check scheduling
    - Test network failure retry logic

- [ ] 13. Implement mobile update UI components

  - [ ] 13.1 Create ForceUpdateModal component

    - Implement blocking modal that prevents app access
    - Display force update message from server response
    - Show "Update Now" button that opens app store URL using Linking API
    - Disable back button and modal dismissal
    - Create component file at `apps/nativeapp/app/components/version/ForceUpdateModal.tsx`
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 13.2 Create SoftUpdateBanner component

    - Implement dismissible banner notification
    - Display soft update message from server response
    - Show "Update Now" button and "Dismiss" button
    - Track dismissal state to show once per session
    - Create component file at `apps/nativeapp/app/components/version/SoftUpdateBanner.tsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 13.3 Integrate version check into app root
    - Add `useVersionCheck` hook to app root component
    - Conditionally render ForceUpdateModal when updateRequired is "force"
    - Conditionally render SoftUpdateBanner when updateRequired is "soft"
    - _Requirements: 4.6, 5.1, 6.1_

- [ ] 14. Add version display to mobile settings

  - [ ] 14.1 Create version info display in settings screen
    - Display SemVer version and build number in settings/about screen
    - Display CalVer version in debug builds only
    - Implement 7-tap gesture on version to show debug information (client version, server version, last check time)
    - Create version display component at `apps/nativeapp/app/components/version/VersionInfo.tsx`
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6_

- [ ] 15. Implement web client version check

  - [ ] 15.1 Create web version check service

    - Implement version check service that reads version from `VERSION_CONFIG` constant
    - Call `version.check` tRPC mutation on page load
    - Schedule periodic checks every 24 hours
    - Handle force update by showing modal and auto-refreshing after countdown
    - Handle soft update by showing dismissible banner
    - Create service file at `apps/server/src/services/version/versionCheckService.ts`
    - _Requirements: 4.1, 4.6, 4.7, 5.4_

  - [ ] 15.2 Create web update UI components

    - Create UpdateModal component for force updates with countdown and auto-refresh
    - Create UpdateBanner component for soft updates with dismiss functionality
    - Create component files at `apps/server/src/Components/version/UpdateModal.tsx` and `apps/server/src/Components/version/UpdateBanner.tsx`
    - _Requirements: 5.4, 6.5_

  - [ ] 15.3 Add version display to web footer
    - Display CalVer version in footer or settings page
    - _Requirements: 11.4_

- [ ] 16. Implement development bypass mode

  - [ ] 16.1 Add version check bypass configuration

    - Add `BYPASS_VERSION_CHECK` environment variable support
    - Update version middleware to skip validation when bypass is enabled
    - Log when version checks are bypassed
    - Add warning indicator in UI when bypass is active
    - _Requirements: 14.1, 14.2, 14.5_

  - [ ] 16.2 Create version testing utilities
    - Implement version spoofing support for testing different client versions
    - Create test endpoint that simulates force update and soft update responses
    - Create utility file at `apps/server/src/utils/version/testUtils.ts`
    - _Requirements: 14.3, 14.4_

- [ ] 17. Implement monitoring and metrics endpoints

  - [ ] 17.1 Create version metrics endpoint

    - Implement endpoint that returns version distribution statistics by platform
    - Calculate force update completion rates
    - Calculate soft update adoption rates
    - Create endpoint at `apps/server/src/server/api/routers/version.ts` (add to existing router)
    - _Requirements: 13.2, 13.3, 13.4, 13.5_

  - [ ] 17.2 Add version monitoring alerts
    - Implement alert logic for unsupported client versions exceeding threshold
    - Implement alert logic for grace period expiration
    - Create alert utility at `apps/server/src/utils/version/alerts.ts`
    - _Requirements: 13.6_

- [ ] 18. Create changelog management

  - [ ] 18.1 Create CHANGELOG.md structure

    - Create `CHANGELOG.md` at monorepo root with version mappings
    - Include CalVer to SemVer mappings, release dates, and release notes
    - Add feature categories (breaking, feature, bugfix) for each version
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ] 18.2 Implement changelog parser
    - Implement function to parse CHANGELOG.md and extract version information
    - Implement function to generate user-facing release notes from changelog
    - Create utility file at `apps/server/src/utils/version/changelog.ts`
    - _Requirements: 15.4_

- [ ] 19. Add health check endpoint with version info

  - Implement health check endpoint that includes current CalVer and SemVer
  - Add endpoint to version router
  - _Requirements: 3.5_

- [ ] 20. Implement server startup version logging

  - Add version logging to server startup that logs current CalVer and SemVer
  - _Requirements: 3.4_

- [ ] 21. Final checkpoint - End-to-end testing
  - Test complete flow: build injection → server startup → mobile version check → force update modal
  - Test complete flow: build injection → server startup → mobile version check → soft update banner
  - Test web client version check and update flows
  - Test grace period behavior
  - Test metadata hot reload
  - Test version middleware blocking incompatible requests
  - Test bypass mode for development
  - Verify all version headers are present in API responses
  - Verify analytics and metrics endpoints return valid data
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation uses TypeScript throughout (React Native, Next.js, tRPC)
- Build system integration requires careful handling of platform-specific files (Gradle, Xcode)
- Grace period support ensures smooth rollout without disrupting existing users
- Version middleware is applied globally but bypasses specific endpoints (version.check, version.info, health)
- Mobile and web clients have different update UX patterns (modal vs banner, app store vs refresh)
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific scenarios and edge cases
