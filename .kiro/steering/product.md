# FireAlert Product Overview

FireAlert is a geolocation-based alert system that notifies users when fire/heat anomalies are detected by NASA's FIRMS across the earth. The system consists of two main applications: 

1. server: Next.js application that handles CRUD actions, CRON jobs & public-facing alert pages that are visible to users.
2. nativeapp: React Native application that works as the main user interaction application for end users. 
 
## Core Features

- **Heat Anomaly Detection**: Monitors NASA FIRMS data for heat anomalies in user-defined forest areas
- **Multi-channel Notifications**: Supports SMS, EMAIL, WhatsApp, WEBHOOK, and PUSH notifications
- **Mobile & Web Access**: React Native mobile app and Next.js web application
- **Plant-for-the-Planet Integration**: Auto-sync project sites and Single Sign-On support
- **Extensible Architecture**: Modular design for adding new alert providers and notification methods

## Target Users

- Forest managers and conservationists
- Plant-for-the-Planet platform users
- Environmental monitoring organizations

## Key Value Proposition

Real-time forest fire detection and alerting system that helps users protect their forest areas through early warning notifications from satellite data.

# FireAlert User Personas

Based on the database schema and product requirements, here are the key user personas for FireAlert:

## 1. End Users (Forest Managers & Conservationists)

**Role**: `ROLE_CLIENT`
**Primary Use Case**: Monitor their forest areas for fire alerts
**Note**: In the next section we talk about "Plant-for-the-Planet Users" which are a subset of End Users with respect to the system.

### Profile
- Forest managers, conservationists, or landowners
- Responsible for protecting specific forest areas or conservation sites
- Need near-real-time (NRT) or time-delayed (30 min or 3-5 hour) alerts when fire anomalies are detected by NASA
- May manage multiple sites with different monitoring requirements
- If already part of Restoration Platform, can benefit from the system as it periodically fetches projects & sites from that platform to FireAlert

### Key Behaviors
- Create and manage monitoring sites (Point, Polygon, MultiPolygon)
- Configure alert methods (SMS, EMAIL, WhatsApp, WEBHOOK, Device PUSH)
- Set detection preferences (MODIS, VIIRS, LANDSAT, GEOSTATIONARY - planned but not implemented yet)
- Review and respond to fire alerts
- Manage site monitoring settings (radius, detection area, stop alerts)

### Database Relations
- Owns multiple `Site` records
- May have multiple `Projects` & their `Sites` records if part of Restoration Platform, Planet Webapp, or ttc-backend
<!-- TODO: Clarify what ttc-backend refers to and its relationship to the system -->
- Has multiple `AlertMethod` configurations
- Receives `Notification` records via `SiteAlert`

## 2. Plant-for-the-Planet Users

**Role**: `ROLE_CLIENT` with `isPlanetRO: true` (RO - Restoration Organisation)
**Primary Use Case**: Monitor reforestation project sites

### Profile
- Users from Plant-for-the-Planet platform (also known as Planet Webapp or Restoration Platform)
- Monitor reforestation and conservation project sites
- Use Single Sign-On integration (`remoteId` field)
- Focus on protecting newly planted or restored forest areas

### Key Behaviors
- Auto-sync project sites from Plant-for-the-Planet platform
- Monitor project-specific forest areas
- Collaborate with other users on shared projects
- Track fire incidents affecting reforestation efforts

### Database Relations
- Linked via `remoteId` for SSO integration
- Associated with `Project` records from external platform
- System periodically fetches `Project` & their `Site` records for users to benefit from the integration
- May have `SiteRelation` records for shared project access

## 3. Protected Site Users or Watchers (Protected Site Viewers)

**Role**: `ROLE_CLIENT` with `SiteRelation` as `ROLE_VIEWER`
**Primary Use Case**: View and monitor shared forest sites (specifically intended to view and receive alerts for `ProtectedArea`)
**Note**: No separate user group. Subset of End Users. All End User behaviors apply here too. These users can add Protected Sites they are interested in and get alerts for them.

<!-- TODO: Complete the Profile, Key Behaviors, and Database Relations sections for Protected Site Users -->

### Profile
<!-- TODO: Define the profile characteristics for Protected Site Users -->

### Key Behaviors
<!-- TODO: List specific behaviors for Protected Site Users -->

### Database Relations
<!-- TODO: Define database relationships for Protected Site Users -->

## 4. System Administrators (Kiro generated - not reviewed fully)

**Role**: `ROLE_ADMIN`
**Primary Use Case**: Manage the FireAlert platform

### Profile
- Technical administrators managing the FireAlert system
- Responsible for platform operations and user support
- Monitor system performance and data providers

### Key Behaviors
- Manage `GeoEventProvider` configurations
- Monitor system `Stats` and performance
- Oversee user accounts and permissions
- Configure detection methods and alert systems

### Database Relations
- Full access to all system tables
- Manage `GeoEventProvider` and system configuration
- Monitor `GeoEvent` processing and `Notification` delivery

## 5. Support Team (Kiro generated - not reviewed fully)

**Role**: `ROLE_SUPPORT`
**Primary Use Case**: Provide user assistance and troubleshooting

### Profile
- Customer support representatives
- Help users with account issues and alert configuration
- Troubleshoot notification delivery problems

### Key Behaviors
- Assist users with `AlertMethod` verification
- Help troubleshoot notification delivery issues
- Support users with site configuration
- Monitor `VerificationRequest` and failed notifications

### Database Relations
- Read access to user accounts and alert configurations
- Can view `Notification` delivery status
- Access to `AlertMethod` verification data

## User Journey Considerations

### New User Onboarding
1. Account creation with email verification
2. Alert method setup and verification
3. First site creation and monitoring configuration
4. Initial fire alert experience


# Key Workflows

## 1. Alert Mechanism Workflow (Sites & GeoEvent Processing)

### GeoEvent Data Fetching
1. **CRON Job Execution**: Scheduled jobs fetch fire/heat anomaly data from NASA FIRMS
2. **GeoEventProvider Processing**: Different providers (FIRMS, MODIS, VIIRS, LANDSAT) implement data fetching logic
3. **Data Normalization**: Raw satellite data is processed and stored as `GeoEvent` records with standardized format
4. **Geospatial Indexing**: Events are indexed using PostGIS for efficient spatial queries

### Site Monitoring & Alert Generation
1. **Site Intersection Detection**: System performs geospatial queries to find `GeoEvent` records intersecting with user `Site` geometries
2. **Alert Filtering**: Applies user preferences (detection methods, confidence levels, time slices)
3. **SiteAlert Creation**: Generates `SiteAlert` records for qualifying intersections with distance calculations
4. **Duplicate Prevention**: Checks for existing alerts to avoid notification spam

### Multi-Channel Notification Delivery
1. **Notification Queue**: Creates `Notification` records for each user's configured `AlertMethod`
2. **Method-Specific Processing**: Different `Notifier` implementations handle SMS, EMAIL, WhatsApp, WEBHOOK, and PUSH notifications
3. **Delivery Tracking**: Updates notification status (sent, delivered, failed) with retry logic
4. **Verification Handling**: Manages `VerificationRequest` for unverified alert methods

## 2. User Onboarding Workflow

### Account Setup
1. **Registration**: User creates account with email verification
2. **Alert Method Configuration**: User adds and verifies notification methods (SMS, email, etc.)
3. **Site Creation**: User defines monitoring areas using Point, Polygon, or MultiPolygon geometries
4. **Detection Preferences**: User selects satellite data sources and alert sensitivity

### Plant-for-the-Planet Integration
1. **SSO Authentication**: Users authenticate via Plant-for-the-Planet platform
2. **Project Sync**: System fetches user's restoration projects and associated sites
3. **Auto-Site Creation**: Converts project boundaries into monitoring sites
4. **Collaborative Access**: Sets up `SiteRelation` records for shared project monitoring

## 3. Site Management Workflow

### Site Creation & Configuration
1. **Geometry Definition**: User draws or uploads site boundaries
2. **Detection Area Calculation**: System calculates monitoring area using PostGIS
3. **Monitoring Settings**: User configures radius, detection methods, and alert preferences
4. **Geospatial Optimization**: Site geometry is processed for efficient intersection queries

## 4. Protected Area Monitoring Workflow

### Protected Area Integration
1. **WDPA Data Import**: System imports World Database on Protected Areas data
2. **User Interest Selection**: Users can subscribe to alerts for specific protected areas
3. **Automated Monitoring**: System monitors fire events within protected boundaries
4. **Conservation Alerts**: Generates alerts for fire incidents in protected regions