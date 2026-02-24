# Requirements Document: API Versioning System

## Introduction

The API Versioning System establishes a comprehensive versioning strategy for the FireAlert monorepo, encompassing the React Native mobile app, Next.js web client, and tRPC API server. The system implements dual versioning: internal Calendar Versioning (CalVer) for development coordination and public Semantic Versioning (SemVer) for app store releases. It provides version compatibility enforcement, minimum version checks, and coordinated release management across all platform components.

## Glossary

- **Version_Manager**: The system component responsible for version validation, compatibility checks, and enforcement
- **CalVer_Version**: Internal date-based version identifier in YYYY-MM-DD format (e.g., "2026-02-18")
- **SemVer_Version**: Public semantic version in MAJOR.MINOR.PATCH format (e.g., "1.8.0")
- **Mobile_Client**: The React Native application running on iOS or Android devices
- **Web_Client**: The Next.js web application accessed via browsers
- **API_Server**: The tRPC-based backend server providing data and business logic
- **Version_Metadata**: Configuration data containing version numbers, compatibility rules, and update policies
- **Compatibility_Matrix**: Mapping of client versions to compatible API versions
- **Force_Update**: Mechanism requiring users to update their client before continued use
- **Soft_Update**: Optional update notification that allows continued use of current version
- **Build_Number**: Platform-specific incremental identifier (versionCode for Android, CURRENT_PROJECT_VERSION for iOS)
- **Version_Check_Endpoint**: API endpoint that validates client version compatibility
- **Version_Middleware**: tRPC middleware that enforces version compatibility on API requests

## Requirements

### Requirement 1: Calendar Versioning for Internal Development

**User Story:** As a developer, I want to use date-based versioning internally, so that I can easily track when features were developed and coordinate releases across the monorepo.

#### Acceptance Criteria

1. THE Version_Manager SHALL use CalVer format YYYY-MM-DD for internal version identifiers
2. WHEN a new version is created, THE Version_Manager SHALL generate the CalVer_Version from the current date
3. THE Version_Manager SHALL maintain CalVer_Version in a centralized configuration file at the monorepo root
4. THE Version_Manager SHALL expose CalVer_Version to both Mobile_Client and API_Server at build time
5. THE Version_Manager SHALL validate that CalVer_Version follows the YYYY-MM-DD format pattern

### Requirement 2: Semantic Versioning for Public Releases

**User Story:** As a product manager, I want to maintain semantic versioning for app store releases, so that users understand the significance of updates and app stores accept our submissions.

#### Acceptance Criteria

1. THE Version_Manager SHALL maintain SemVer_Version in MAJOR.MINOR.PATCH format for public releases
2. THE Version_Manager SHALL map each CalVer_Version to a corresponding SemVer_Version in Version_Metadata
3. WHEN building for app store release, THE Mobile_Client SHALL use SemVer_Version as the marketing version
4. THE Version_Manager SHALL increment MAJOR version for breaking API changes
5. THE Version_Manager SHALL increment MINOR version for new features with backward compatibility
6. THE Version_Manager SHALL increment PATCH version for bug fixes and minor updates
7. THE Version_Manager SHALL maintain separate Build_Number sequences for Android and iOS platforms

### Requirement 3: API Server Versioning

**User Story:** As a backend developer, I want the API server to have version tracking, so that I can coordinate breaking changes with client updates and maintain compatibility.

#### Acceptance Criteria

1. THE API_Server SHALL expose its CalVer_Version via a version endpoint
2. THE API_Server SHALL include CalVer_Version in response headers for all API requests
3. THE API_Server SHALL maintain Version_Metadata containing minimum supported client versions
4. WHEN API_Server starts, THE API_Server SHALL log its current CalVer_Version and SemVer_Version
5. THE API_Server SHALL expose a health check endpoint that includes version information

### Requirement 4: Client Version Validation

**User Story:** As a system administrator, I want to enforce minimum client versions, so that users with outdated clients cannot access incompatible API features.

#### Acceptance Criteria

1. WHEN Mobile_Client or Web_Client starts, THE Version_Manager SHALL send the client's CalVer_Version to Version_Check_Endpoint
2. THE Version_Check_Endpoint SHALL compare the client version against minimum supported version in Version_Metadata
3. IF client version is below minimum supported version, THEN THE Version_Check_Endpoint SHALL return a force update response
4. IF client version is below recommended version but above minimum, THEN THE Version_Check_Endpoint SHALL return a soft update response
5. IF client version meets requirements, THEN THE Version_Check_Endpoint SHALL return a success response with Compatibility_Matrix
6. THE Version_Manager SHALL perform version checks at application startup
7. THE Version_Manager SHALL perform periodic version checks every 24 hours while application is running

### Requirement 5: Force Update Mechanism

**User Story:** As a product manager, I want to force users to update when critical changes are deployed, so that all users benefit from security fixes and breaking changes are properly coordinated.

#### Acceptance Criteria

1. WHEN Version_Check_Endpoint returns force update response, THE Mobile_Client SHALL display a blocking modal with update message
2. THE Mobile_Client SHALL prevent access to application features until update is completed
3. THE Mobile_Client SHALL provide a direct link to the app store for update installation
4. THE Web_Client SHALL display a blocking message and automatically refresh after a countdown
5. THE Version_Manager SHALL allow configuration of force update message text in Version_Metadata
6. THE Version_Manager SHALL support platform-specific force update thresholds (iOS, Android, Web)

### Requirement 6: Soft Update Notification

**User Story:** As a user, I want to be notified of optional updates, so that I can choose to update when convenient while still using the application.

#### Acceptance Criteria

1. WHEN Version_Check_Endpoint returns soft update response, THE Mobile_Client SHALL display a dismissible update notification
2. THE Mobile_Client SHALL allow users to dismiss the notification and continue using the application
3. THE Mobile_Client SHALL show the soft update notification once per session
4. THE Mobile_Client SHALL provide an "Update Now" button linking to the app store
5. THE Web_Client SHALL display a banner notification for soft updates
6. THE Version_Manager SHALL track user dismissal of soft update notifications

### Requirement 7: tRPC API Version Middleware

**User Story:** As a backend developer, I want tRPC middleware to validate client versions on every request, so that incompatible clients cannot execute API operations.

#### Acceptance Criteria

1. THE Version_Middleware SHALL extract client version from request headers
2. THE Version_Middleware SHALL validate client version against Compatibility_Matrix
3. IF client version is incompatible, THEN THE Version_Middleware SHALL return a version mismatch error
4. THE Version_Middleware SHALL include API_Server version in error responses
5. THE Version_Middleware SHALL log version mismatch events for monitoring
6. WHERE version validation is disabled for specific endpoints, THE Version_Middleware SHALL skip validation

### Requirement 8: Version Metadata Management

**User Story:** As a release manager, I want centralized version configuration, so that I can update version requirements without code changes.

#### Acceptance Criteria

1. THE Version_Manager SHALL store Version_Metadata in a JSON configuration file
2. THE Version_Metadata SHALL include minimum supported versions for Mobile_Client (iOS and Android) and Web_Client
3. THE Version_Metadata SHALL include recommended versions for each client platform
4. THE Version_Metadata SHALL include Compatibility_Matrix mapping client versions to API versions
5. THE Version_Metadata SHALL include force update messages for each platform
6. THE API_Server SHALL reload Version_Metadata without restart when configuration file changes
7. THE Version_Manager SHALL validate Version_Metadata schema on load

### Requirement 9: Build System Integration

**User Story:** As a developer, I want version numbers automatically injected during build, so that I don't manually update version strings in multiple locations.

#### Acceptance Criteria

1. WHEN building Mobile_Client, THE Version_Manager SHALL inject CalVer_Version and SemVer_Version into app configuration
2. WHEN building API_Server, THE Version_Manager SHALL inject CalVer_Version into server configuration
3. THE Version_Manager SHALL update Android versionCode automatically based on build sequence
4. THE Version_Manager SHALL update iOS CURRENT_PROJECT_VERSION automatically based on build sequence
5. THE Version_Manager SHALL maintain a build history log with timestamps and version mappings
6. THE Version_Manager SHALL support manual version override via environment variables for testing

### Requirement 10: Version Compatibility Matrix

**User Story:** As a system architect, I want a compatibility matrix defining which client versions work with which API versions, so that I can manage gradual rollouts and backward compatibility.

#### Acceptance Criteria

1. THE Compatibility_Matrix SHALL define minimum API version for each client version
2. THE Compatibility_Matrix SHALL define maximum API version for each client version
3. THE Version_Manager SHALL evaluate compatibility using both minimum and maximum bounds
4. THE Compatibility_Matrix SHALL support wildcard rules for version ranges
5. THE Version_Manager SHALL log compatibility evaluation results for debugging
6. WHERE no explicit rule exists, THE Version_Manager SHALL apply default compatibility policy

### Requirement 11: Version Information Display

**User Story:** As a user, I want to see the current version in the app settings, so that I can verify I'm running the latest version and report issues with version context.

#### Acceptance Criteria

1. THE Mobile_Client SHALL display SemVer_Version in the settings or about screen
2. THE Mobile_Client SHALL display Build_Number alongside SemVer_Version
3. THE Mobile_Client SHALL display CalVer_Version in debug builds
4. THE Web_Client SHALL display version information in the footer or settings page
5. WHEN user taps version information 7 times, THE Mobile_Client SHALL display detailed version debug information
6. THE Version_Manager SHALL include API_Server version in debug information display

### Requirement 12: Backward Compatibility During Rollout

**User Story:** As a release manager, I want to maintain backward compatibility during version system rollout, so that existing users are not disrupted during the transition.

#### Acceptance Criteria

1. WHERE client does not send version information, THE Version_Middleware SHALL allow the request with a warning log
2. THE Version_Manager SHALL support a grace period configuration during which version checks are non-blocking
3. THE Version_Manager SHALL log all version check results during grace period for analysis
4. WHEN grace period expires, THE Version_Manager SHALL enforce version requirements
5. THE Version_Manager SHALL provide metrics on client version distribution during rollout

### Requirement 13: Version Monitoring and Analytics

**User Story:** As a product manager, I want analytics on client version distribution, so that I can make informed decisions about deprecating old versions.

#### Acceptance Criteria

1. THE Version_Manager SHALL log client version on each version check request
2. THE Version_Manager SHALL aggregate version distribution statistics
3. THE API_Server SHALL expose version distribution metrics via monitoring endpoint
4. THE Version_Manager SHALL track force update completion rates
5. THE Version_Manager SHALL track soft update adoption rates
6. THE Version_Manager SHALL alert when unsupported client versions exceed threshold percentage

### Requirement 14: Development and Testing Support

**User Story:** As a developer, I want to bypass version checks in development, so that I can test features without version enforcement interference.

#### Acceptance Criteria

1. WHERE environment is development, THE Version_Manager SHALL allow version check bypass via configuration flag
2. THE Version_Manager SHALL log when version checks are bypassed
3. THE Version_Manager SHALL support version spoofing for testing different client versions
4. THE Version_Manager SHALL provide a test endpoint that simulates force update and soft update responses
5. WHERE version bypass is enabled, THE Version_Manager SHALL display a warning indicator in the UI

### Requirement 15: Version Documentation and Changelog

**User Story:** As a developer, I want automated changelog generation from version history, so that I can communicate changes to users and stakeholders.

#### Acceptance Criteria

1. THE Version_Manager SHALL maintain a changelog file mapping CalVer_Version to SemVer_Version
2. THE Version_Manager SHALL include release notes for each version in the changelog
3. THE Version_Manager SHALL support tagging versions with feature categories (breaking, feature, bugfix)
4. THE Version_Manager SHALL generate user-facing release notes from changelog data
5. THE API_Server SHALL expose changelog via a public endpoint for in-app display
6. THE Version_Manager SHALL validate that each version has associated release notes before build
