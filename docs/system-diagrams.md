# FireAlert System Diagrams

## Component Relationship Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application<br/>Next.js + React]
        MOBILE[Mobile Application<br/>React Native]
    end
    
    subgraph "API Gateway"
        TRPC[tRPC Router]
        AUTH_MW[Auth Middleware]
        VALIDATION[Input Validation<br/>Zod Schemas]
    end
    
    subgraph "Business Logic Layer"
        USER_ROUTER[User Router]
        SITE_ROUTER[Site Router]
        ALERT_ROUTER[Alert Router]
        METHOD_ROUTER[AlertMethod Router]
        PROJECT_ROUTER[Project Router]
        PROVIDER_ROUTER[GeoEventProvider Router]
    end
    
    subgraph "Service Layer (Current Utils)"
        USER_UTILS[User Utils]
        SITE_UTILS[Site Utils]
        ALERT_UTILS[Alert Utils]
        METHOD_UTILS[AlertMethod Utils]
        TRPC_UTILS[tRPC Utils]
    end
    
    subgraph "Core Services"
        GEO_HANDLER[GeoEvent Handler]
        SITE_ALERT[Site Alert Creator]
        NOTIFICATION[Notification Creator]
        SEND_NOTIFICATION[Send Notifications]
    end
    
    subgraph "Provider System"
        PROVIDER_REGISTRY[GeoEvent Provider Registry]
        NASA_PROVIDER[NASA Provider]
        GOES_PROVIDER[GOES-16 Provider]
    end
    
    subgraph "Notification System"
        NOTIFIER_REGISTRY[Notifier Registry]
        EMAIL_NOTIFIER[Email Notifier]
        SMS_NOTIFIER[SMS Notifier]
        PUSH_NOTIFIER[Push Notifier]
        WEBHOOK_NOTIFIER[Webhook Notifier]
        WHATSAPP_NOTIFIER[WhatsApp Notifier]
    end
    
    subgraph "Data Access Layer"
        PRISMA[Prisma ORM]
        DB[(PostgreSQL + PostGIS)]
    end
    
    subgraph "External Services"
        AUTH0[Auth0]
        TWILIO[Twilio]
        ONESIGNAL[OneSignal]
        SMTP_SERVER[SMTP Server]
        NASA_API[NASA FIRMS API]
        GOES_API[GOES-16 API]
    end
    
    WEB --> TRPC
    MOBILE --> TRPC
    
    TRPC --> AUTH_MW
    AUTH_MW --> VALIDATION
    VALIDATION --> USER_ROUTER
    VALIDATION --> SITE_ROUTER
    VALIDATION --> ALERT_ROUTER
    VALIDATION --> METHOD_ROUTER
    VALIDATION --> PROJECT_ROUTER
    VALIDATION --> PROVIDER_ROUTER
    
    USER_ROUTER --> USER_UTILS
    SITE_ROUTER --> SITE_UTILS
    ALERT_ROUTER --> ALERT_UTILS
    METHOD_ROUTER --> METHOD_UTILS
    
    USER_UTILS --> PRISMA
    SITE_UTILS --> PRISMA
    ALERT_UTILS --> PRISMA
    METHOD_UTILS --> PRISMA
    
    GEO_HANDLER --> PRISMA
    SITE_ALERT --> PRISMA
    NOTIFICATION --> PRISMA
    SEND_NOTIFICATION --> NOTIFIER_REGISTRY
    
    PROVIDER_REGISTRY --> NASA_PROVIDER
    PROVIDER_REGISTRY --> GOES_PROVIDER
    
    NASA_PROVIDER --> NASA_API
    GOES_PROVIDER --> GOES_API
    
    NOTIFIER_REGISTRY --> EMAIL_NOTIFIER
    NOTIFIER_REGISTRY --> SMS_NOTIFIER
    NOTIFIER_REGISTRY --> PUSH_NOTIFIER
    NOTIFIER_REGISTRY --> WEBHOOK_NOTIFIER
    NOTIFIER_REGISTRY --> WHATSAPP_NOTIFIER
    
    EMAIL_NOTIFIER --> SMTP_SERVER
    SMS_NOTIFIER --> TWILIO
    WHATSAPP_NOTIFIER --> TWILIO
    PUSH_NOTIFIER --> ONESIGNAL
    
    AUTH_MW --> AUTH0
    PRISMA --> DB
```

## Data Flow Diagram

```mermaid
flowchart TD
    START([Cron Job Trigger]) --> FETCH_PROVIDERS[Fetch Active Providers]
    FETCH_PROVIDERS --> PROVIDER_LOOP{For Each Provider}
    
    PROVIDER_LOOP --> GET_EVENTS[Get Latest GeoEvents]
    GET_EVENTS --> DEDUPE[Deduplicate Events]
    DEDUPE --> STORE_EVENTS[Store New Events]
    STORE_EVENTS --> PROCESS_EVENTS[Process Unprocessed Events]
    
    PROCESS_EVENTS --> SPATIAL_QUERY[Spatial Intersection Query]
    SPATIAL_QUERY --> CREATE_ALERTS[Create Site Alerts]
    CREATE_ALERTS --> PROCESS_ALERTS[Process Unprocessed Alerts]
    
    PROCESS_ALERTS --> CHECK_RATE_LIMIT{Check Rate Limiting}
    CHECK_RATE_LIMIT -->|Within Limits| CREATE_NOTIFICATIONS[Create Notifications]
    CHECK_RATE_LIMIT -->|Rate Limited| SKIP_NOTIFICATION[Skip Notification]
    
    CREATE_NOTIFICATIONS --> QUEUE_NOTIFICATIONS[Queue for Delivery]
    SKIP_NOTIFICATION --> MARK_PROCESSED[Mark Alert as Processed]
    
    QUEUE_NOTIFICATIONS --> SEND_LOOP{For Each Notification}
    SEND_LOOP --> DETERMINE_METHOD[Determine Notification Method]
    
    DETERMINE_METHOD --> EMAIL_CHECK{Email?}
    DETERMINE_METHOD --> SMS_CHECK{SMS?}
    DETERMINE_METHOD --> PUSH_CHECK{Push?}
    DETERMINE_METHOD --> WEBHOOK_CHECK{Webhook?}
    DETERMINE_METHOD --> WHATSAPP_CHECK{WhatsApp?}
    
    EMAIL_CHECK -->|Yes| SEND_EMAIL[Send Email via SMTP]
    SMS_CHECK -->|Yes| SEND_SMS[Send SMS via Twilio]
    PUSH_CHECK -->|Yes| SEND_PUSH[Send Push via OneSignal]
    WEBHOOK_CHECK -->|Yes| SEND_WEBHOOK[Send Webhook]
    WHATSAPP_CHECK -->|Yes| SEND_WHATSAPP[Send WhatsApp via Twilio]
    
    SEND_EMAIL --> UPDATE_STATUS[Update Delivery Status]
    SEND_SMS --> UPDATE_STATUS
    SEND_PUSH --> UPDATE_STATUS
    SEND_WEBHOOK --> UPDATE_STATUS
    SEND_WHATSAPP --> UPDATE_STATUS
    
    UPDATE_STATUS --> SEND_LOOP
    MARK_PROCESSED --> PROVIDER_LOOP
    
    PROVIDER_LOOP -->|All Processed| END([End])
```

## Database Entity Relationship Diagram

```mermaid
erDiagram
    User {
        string id PK
        string sub UK
        string name
        string email UK
        boolean emailVerified
        json detectionMethods
        boolean isPlanetRO
        string image
        datetime deletedAt
        boolean isVerified
        datetime lastLogin
        datetime signupDate
        enum roles
        string remoteId
        string plan
    }
    
    AlertMethod {
        string id PK
        string method
        string destination
        boolean isVerified
        boolean isEnabled
        datetime deletedAt
        string deviceName
        string deviceId
        int tokenSentCount
        datetime lastTokenSentDate
        string userId FK
        int failCount
    }
    
    VerificationRequest {
        string id PK
        string token UK
        datetime expires
        datetime createdAt
        datetime updatedAt
        string alertMethodId FK
    }
    
    Site {
        string id PK
        string remoteId
        string name
        string origin
        enum type
        json geometry
        int radius
        boolean isMonitored
        datetime deletedAt
        string projectId FK
        datetime lastUpdated
        string userId FK
        json slices
        geometry detectionGeometry
        geometry originalGeometry
        datetime stopAlertUntil
        datetime lastMessageCreated
        float detectionArea
    }
    
    Project {
        string id PK
        string name
        string slug
        datetime lastUpdated
        string userId FK
    }
    
    SiteAlert {
        string id PK
        string siteId FK
        string type
        float latitude
        float longitude
        datetime eventDate
        string detectedBy
        enum confidence
        boolean isProcessed
        datetime deletedAt
        int distance
        json data
    }
    
    Notification {
        string id PK
        string siteAlertId FK
        string alertMethod
        string destination
        datetime sentAt
        boolean isDelivered
        boolean isSkipped
        json metadata
    }
    
    GeoEvent {
        string id PK
        string type
        float latitude
        float longitude
        datetime eventDate
        geometry geometry
        enum confidence
        boolean isProcessed
        string geoEventProviderClientId
        string geoEventProviderId
        int radius
        string slice
        json data
    }
    
    GeoEventProvider {
        string id PK
        string name
        string description
        string type
        string clientApiKey UK
        string clientId
        int fetchFrequency
        boolean isActive
        datetime lastRun
        json config
    }
    
    SiteRelation {
        string id PK
        datetime createdAt
        datetime updatedAt
        string siteId FK
        string userId FK
        enum role
        boolean isActive
    }
    
    User ||--o{ AlertMethod : "has"
    User ||--o{ Site : "owns"
    User ||--o{ Project : "owns"
    User ||--o{ SiteRelation : "participates"
    
    AlertMethod ||--o| VerificationRequest : "has"
    
    Site ||--o{ SiteAlert : "generates"
    Site }o--|| Project : "belongs to"
    Site ||--o{ SiteRelation : "shared with"
    
    SiteAlert ||--o{ Notification : "triggers"
    
    GeoEventProvider ||--o{ GeoEvent : "provides"
```

## Authentication Flow Diagram

```mermaid
sequenceDiagram
    participant Client as Client App
    participant Auth0 as Auth0
    participant Middleware as Auth Middleware
    participant Router as tRPC Router
    participant DB as Database
    
    Client->>Auth0: 1. Login Request
    Auth0->>Client: 2. JWT Access Token
    
    Client->>Middleware: 3. API Request + Bearer Token
    Middleware->>Auth0: 4. Validate Token
    Auth0->>Middleware: 5. Token Valid + User Info
    
    Middleware->>DB: 6. Find User by sub
    DB->>Middleware: 7. User Data or null
    
    alt User exists
        Middleware->>Router: 8a. Context with User
        Router->>DB: 9a. Business Logic
        DB->>Router: 10a. Data Response
        Router->>Client: 11a. API Response
    else User doesn't exist (profile route)
        Middleware->>Router: 8b. Context with null user
        Router->>Auth0: 9b. Fetch User Profile
        Auth0->>Router: 10b. User Profile Data
        Router->>DB: 11b. Create New User
        DB->>Router: 12b. Created User
        Router->>Client: 13b. New User Response
    else User doesn't exist (other routes)
        Middleware->>Client: 8c. NOT_FOUND Error
    end
```

## Notification System Architecture

```mermaid
graph TB
    subgraph "Notification Trigger"
        SITE_ALERT[Site Alert Created]
        RATE_CHECK[Rate Limiting Check]
        USER_PREFS[User Preferences Check]
    end
    
    subgraph "Notification Creation"
        CREATE_NOTIF[Create Notification Records]
        QUEUE[Notification Queue]
    end
    
    subgraph "Notification Registry"
        REGISTRY[Notifier Registry]
        EMAIL_N[Email Notifier]
        SMS_N[SMS Notifier]
        PUSH_N[Push Notifier]
        WEBHOOK_N[Webhook Notifier]
        WHATSAPP_N[WhatsApp Notifier]
        TEST_N[Test Notifier]
    end
    
    subgraph "External Services"
        SMTP[SMTP Server]
        TWILIO[Twilio API]
        ONESIGNAL[OneSignal API]
        WEBHOOK_ENDPOINT[Webhook Endpoint]
    end
    
    subgraph "Delivery Tracking"
        UPDATE_STATUS[Update Delivery Status]
        RETRY_LOGIC[Retry Failed Notifications]
        FAILURE_HANDLING[Handle Failed Notifications]
    end
    
    SITE_ALERT --> RATE_CHECK
    RATE_CHECK --> USER_PREFS
    USER_PREFS --> CREATE_NOTIF
    CREATE_NOTIF --> QUEUE
    
    QUEUE --> REGISTRY
    REGISTRY --> EMAIL_N
    REGISTRY --> SMS_N
    REGISTRY --> PUSH_N
    REGISTRY --> WEBHOOK_N
    REGISTRY --> WHATSAPP_N
    REGISTRY --> TEST_N
    
    EMAIL_N --> SMTP
    SMS_N --> TWILIO
    PUSH_N --> ONESIGNAL
    WEBHOOK_N --> WEBHOOK_ENDPOINT
    WHATSAPP_N --> TWILIO
    
    SMTP --> UPDATE_STATUS
    TWILIO --> UPDATE_STATUS
    ONESIGNAL --> UPDATE_STATUS
    WEBHOOK_ENDPOINT --> UPDATE_STATUS
    
    UPDATE_STATUS --> RETRY_LOGIC
    RETRY_LOGIC --> FAILURE_HANDLING
```

## Geospatial Processing Flow

```mermaid
flowchart TD
    START([GeoEvent Received]) --> VALIDATE[Validate Event Data]
    VALIDATE --> TRANSFORM[Transform to Standard Format]
    TRANSFORM --> DEDUPE[Check for Duplicates]
    
    DEDUPE -->|New Event| STORE[Store in Database]
    DEDUPE -->|Duplicate| SKIP[Skip Processing]
    
    STORE --> CREATE_GEOMETRY[Create PostGIS Geometry]
    CREATE_GEOMETRY --> SPATIAL_QUERY[Execute Spatial Query]
    
    SPATIAL_QUERY --> FIND_SITES{Find Intersecting Sites}
    FIND_SITES -->|Sites Found| CALC_DISTANCE[Calculate Distance]
    FIND_SITES -->|No Sites| MARK_PROCESSED[Mark as Processed]
    
    CALC_DISTANCE --> CHECK_MONITORING{Site Monitoring Active?}
    CHECK_MONITORING -->|Active| CHECK_SLICES{Correct Slice?}
    CHECK_MONITORING -->|Inactive| MARK_PROCESSED
    
    CHECK_SLICES -->|Match| CREATE_SITE_ALERT[Create Site Alert]
    CHECK_SLICES -->|No Match| MARK_PROCESSED
    
    CREATE_SITE_ALERT --> TRIGGER_NOTIFICATIONS[Trigger Notification Process]
    TRIGGER_NOTIFICATIONS --> END([End])
    
    SKIP --> END
    MARK_PROCESSED --> END
```

## Mobile App Architecture

```mermaid
graph TB
    subgraph "React Native App"
        subgraph "Navigation Layer"
            NAV[React Navigation]
            BOTTOM_TABS[Bottom Tab Navigator]
            STACK_NAV[Stack Navigator]
        end
        
        subgraph "Screen Components"
            HOME[Home Screen]
            MAP[Map Screen]
            ALERTS[Alerts Screen]
            PROFILE[Profile Screen]
            SETTINGS[Settings Screen]
        end
        
        subgraph "State Management"
            REDUX[Redux Store]
            USER_SLICE[User Slice]
            SITE_SLICE[Site Slice]
            ALERT_SLICE[Alert Slice]
        end
        
        subgraph "API Layer"
            TRPC_CLIENT[tRPC Client]
            QUERY_CLIENT[React Query Client]
            PERSISTENCE[Async Storage Persistence]
        end
        
        subgraph "Native Services"
            LOCATION[Location Services]
            PUSH_NOTIF[Push Notifications]
            FILE_SYSTEM[File System Access]
            DEVICE_INFO[Device Information]
        end
        
        subgraph "Map Components"
            MAPBOX[Mapbox Maps]
            GEOJSON[GeoJSON Processing]
            SPATIAL_UTILS[Spatial Utilities]
        end
    end
    
    NAV --> BOTTOM_TABS
    BOTTOM_TABS --> STACK_NAV
    STACK_NAV --> HOME
    STACK_NAV --> MAP
    STACK_NAV --> ALERTS
    STACK_NAV --> PROFILE
    STACK_NAV --> SETTINGS
    
    HOME --> REDUX
    MAP --> REDUX
    ALERTS --> REDUX
    PROFILE --> REDUX
    SETTINGS --> REDUX
    
    REDUX --> USER_SLICE
    REDUX --> SITE_SLICE
    REDUX --> ALERT_SLICE
    
    USER_SLICE --> TRPC_CLIENT
    SITE_SLICE --> TRPC_CLIENT
    ALERT_SLICE --> TRPC_CLIENT
    
    TRPC_CLIENT --> QUERY_CLIENT
    QUERY_CLIENT --> PERSISTENCE
    
    MAP --> MAPBOX
    MAP --> GEOJSON
    MAP --> SPATIAL_UTILS
    
    HOME --> LOCATION
    SETTINGS --> PUSH_NOTIF
    MAP --> FILE_SYSTEM
    PROFILE --> DEVICE_INFO
```

These diagrams provide a comprehensive visual representation of the FireAlert system architecture, showing the relationships between components, data flow patterns, and system interactions.