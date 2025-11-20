# GeoEventFetcher Architecture Flow Diagram

## Overview

This document provides comprehensive Mermaid diagrams visualizing the current architecture and data flow of the refactored GeoEventFetcher system.

## Table of Contents

1. [High-Level System Architecture](#high-level-system-architecture)
2. [Request Flow Sequence](#request-flow-sequence)
3. [Service Layer Architecture](#service-layer-architecture)
4. [Data Flow Through Layers](#data-flow-through-layers)
5. [Provider Processing Workflow](#provider-processing-workflow)
6. [Event Processing Pipeline](#event-processing-pipeline)
7. [Alert Creation Workflow](#alert-creation-workflow)
8. [Component Dependency Graph](#component-dependency-graph)

---

## High-Level System Architecture

```mermaid
graph TB
    subgraph "API Layer"
        Handler[geo-event-fetcher.ts<br/>API Handler]
        FeatureFlag{Feature Flag<br/>USE_REFACTORED_PIPELINE}
        Legacy[Legacy Implementation]
        Refactored[Refactored Implementation]
    end

    subgraph "Consolidated Utilities"
        ReqHandler[RequestHandler<br/>Validation, Parsing, Response]
        EventProc[EventProcessor<br/>Checksums & Deduplication]
        ProvMgr[ProviderManager<br/>Selection & Creation]
        BatchProc[BatchProcessor]
        Queue[PQueue<br/>Concurrency Control]
    end

    subgraph "Service Layer"
        ProviderSvc[GeoEventProviderService<br/>Orchestration]
        GeoEventSvc[GeoEventService<br/>Event Processing]
        SiteAlertSvc[SiteAlertService<br/>Alert Creation]
    end

    subgraph "Repository Layer"
        ProviderRepo[GeoEventProviderRepository<br/>Services/GeoEventProvider/]
        GeoEventRepo[GeoEventRepository<br/>Services/GeoEvent/]
        SiteAlertRepo[SiteAlertRepository<br/>Services/SiteAlert/]
    end

    subgraph "Domain Models"
        EventId[EventId<br/>Event Identity]
        OpResult[OperationResult<br/>Metrics Aggregation]
    end

    subgraph "External Systems"
        NASA[NASA FIRMS API]
        GOES[GOES-16 Satellite]
        DB[(PostgreSQL + PostGIS)]
    end

    Handler --> FeatureFlag
    FeatureFlag -->|false| Legacy
    FeatureFlag -->|true| Refactored

    Refactored --> ReqHandler
    Refactored --> ProviderSvc

    ProviderSvc --> GeoEventSvc
    ProviderSvc --> SiteAlertSvc
    ProviderSvc --> ProviderRepo
    ProviderSvc --> ProvMgr
    ProviderSvc --> Queue
    ProviderSvc --> OpResult

    GeoEventSvc --> GeoEventRepo
    GeoEventSvc --> EventProc
    GeoEventSvc --> BatchProc

    SiteAlertSvc --> SiteAlertRepo
    SiteAlertSvc --> GeoEventRepo
    SiteAlertSvc --> BatchProc

    ProviderRepo --> DB
    GeoEventRepo --> DB
    SiteAlertRepo --> DB

    EventProc --> EventId
    ProvMgr --> NASA
    ProviderFact --> GOES

    style Handler fill:#e1f5fe
    style ProviderSvc fill:#c8e6c9
    style GeoEventSvc fill:#c8e6c9
    style SiteAlertSvc fill:#c8e6c9
    style DB fill:#fff3e0
```

---

## Request Flow Sequence

```mermaid
sequenceDiagram
    participant Client as CRON Job
    participant Handler as API Handler
    participant Flag as Feature Flag
    participant Validator as CronValidator
    participant Parser as RequestParser
    participant ProviderSvc as GeoEventProviderService
    participant DB as Database

    Client->>Handler: GET /api/cron/geo-event-fetcher?limit=2
    Handler->>Flag: Check USE_REFACTORED_PIPELINE

    alt Refactored Pipeline
        Flag->>Validator: validate(req)
        Validator->>Validator: Check CRON_KEY
        alt Invalid Key
            Validator-->>Handler: false
            Handler-->>Client: 403 Unauthorized
        else Valid Key
            Validator-->>Handler: true
            Handler->>Parser: parseLimit(req)
            Parser-->>Handler: limit=2
            Handler->>ProviderSvc: Initialize with dependencies
            Handler->>ProviderSvc: processProviders(selected, 3)
            ProviderSvc->>DB: Find & process providers
            ProviderSvc-->>Handler: ProcessingResult
            Handler-->>Client: 200 Success + metrics
        end
    else Legacy Pipeline
        Flag->>Handler: Execute legacy code
        Handler->>DB: Direct database operations
        Handler-->>Client: 200 Success + metrics
    end
```

---

## Service Layer Architecture

```mermaid
graph LR
    subgraph "GeoEventProviderService"
        direction TB
        PPS[processProviders]
        PP[processProvider]
        PPS --> PP
    end

    subgraph "GeoEventService"
        direction TB
        DAS[deduplicateAndSave]
    end

    subgraph "SiteAlertService"
        direction TB
        CAP[createAlertsForProvider]
        PB[processBatch]
        CAP --> PB
    end

    subgraph "Repositories"
        direction TB
        PR[ProviderRepository]
        GR[GeoEventRepository]
        SR[SiteAlertRepository]
    end

    PP -->|1. Fetch events| ProviderFactory
    PP -->|2. Deduplicate & save| DAS
    PP -->|3. Create alerts| CAP
    PP -->|4. Update lastRun| PR

    DAS -->|Generate checksums| ChecksumGen
    DAS -->|Filter duplicates| DupFilter
    DAS -->|Bulk insert| GR

    CAP -->|Mark stale| GR
    CAP -->|Process batches| PB
    PB -->|Create alerts| SR

    style PPS fill:#a5d6a7
    style PP fill:#a5d6a7
    style DAS fill:#90caf9
    style CAP fill:#ce93d8
    style PB fill:#ce93d8
```

---

## Data Flow Through Layers

```mermaid
flowchart TD
    Start([CRON Trigger]) --> Handler[API Handler]

    Handler --> Validate{Validate<br/>CRON_KEY}
    Validate -->|Invalid| Reject[403 Unauthorized]
    Validate -->|Valid| Parse[Parse Request<br/>limit parameter]

    Parse --> FindProviders[Find Eligible Providers<br/>ProviderRepository]
    FindProviders --> Shuffle[Shuffle & Select<br/>ProviderSelector]

    Shuffle --> HasProviders{Has<br/>Providers?}
    HasProviders -->|No| EmptyResult[Return Empty Result]
    HasProviders -->|Yes| InitServices[Initialize Services<br/>with Dependencies]

    InitServices --> ProcessLoop[Process Each Provider<br/>with PQueue concurrency=3]

    ProcessLoop --> FetchEvents[Fetch Latest Events<br/>from Provider API]
    FetchEvents --> HasEvents{Has<br/>Events?}

    HasEvents -->|No| UpdateLastRun[Update Provider<br/>lastRun timestamp]
    HasEvents -->|Yes| GenChecksums[Generate Checksums<br/>ChecksumGenerator]

    GenChecksums --> FetchExisting[Fetch Existing IDs<br/>from DB 30hrs window]
    FetchExisting --> FilterDB[Filter DB Duplicates<br/>DuplicateFilter]
    FilterDB --> FilterMem[Filter In-Memory<br/>Duplicates]
    FilterMem --> BulkInsert[Bulk Insert Events<br/>batch size 1000]

    BulkInsert --> MarkStale[Mark Stale Events<br/>>24hrs as processed]
    MarkStale --> AlertLoop[Process Unprocessed<br/>Events in Batches]

    AlertLoop --> CheckType{Provider<br/>Type?}
    CheckType -->|GEOSTATIONARY| GeoAlert[Create Geostationary<br/>Alerts batch=500]
    CheckType -->|POLAR| PolarAlert[Create Polar<br/>Alerts batch=1000]

    GeoAlert --> SpatialJoin1[PostGIS Spatial Join<br/>with Site geometries]
    PolarAlert --> SpatialJoin2[PostGIS Spatial Join<br/>with Site geometries]

    SpatialJoin1 --> MarkProcessed1[Mark Events<br/>as Processed]
    SpatialJoin2 --> MarkProcessed2[Mark Events<br/>as Processed]

    MarkProcessed1 --> UpdateLastRun
    MarkProcessed2 --> UpdateLastRun

    UpdateLastRun --> MoreProviders{More<br/>Providers?}
    MoreProviders -->|Yes| ProcessLoop
    MoreProviders -->|No| AggregateResults[Aggregate Results<br/>ProcessingResult.merge]

    AggregateResults --> Response[Return Success<br/>with Metrics]

    style Handler fill:#e1f5fe
    style FindProviders fill:#fff9c4
    style FetchEvents fill:#c8e6c9
    style GenChecksums fill:#b2dfdb
    style BulkInsert fill:#b2dfdb
    style GeoAlert fill:#f8bbd0
    style PolarAlert fill:#f8bbd0
    style Response fill:#dcedc8
```

---

## Provider Processing Workflow

```mermaid
stateDiagram-v2
    [*] --> FindEligible: Query Database
    FindEligible --> ShuffleSelect: Get Active Providers
    ShuffleSelect --> CheckCount: Apply Limit

    CheckCount --> NoProviders: count = 0
    CheckCount --> HasProviders: count > 0

    NoProviders --> [*]: Return Empty

    HasProviders --> InitQueue: Create PQueue(concurrency=3)
    InitQueue --> QueueProviders: Add to Queue

    QueueProviders --> ProcessProvider: Dequeue

    state ProcessProvider {
        [*] --> ParseConfig
        ParseConfig --> CreateInstance: Factory Pattern
        CreateInstance --> FetchAPI: Call Provider API
        FetchAPI --> CheckEvents: Validate Response

        CheckEvents --> NoEvents: events.length = 0
        CheckEvents --> HasEvents: events.length > 0

        NoEvents --> UpdateTimestamp

        HasEvents --> Deduplicate: GeoEventService
        Deduplicate --> CreateAlerts: SiteAlertService
        CreateAlerts --> UpdateTimestamp

        UpdateTimestamp --> [*]
    }

    ProcessProvider --> MoreInQueue: Check Queue
    MoreInQueue --> ProcessProvider: Has More
    MoreInQueue --> AggregateResults: Queue Empty

    AggregateResults --> [*]: Return Results
```

---

## Event Processing Pipeline

```mermaid
flowchart LR
    subgraph "Input"
        Events[Raw GeoEvents<br/>from Provider API]
    end

    subgraph "Checksum Generation"
        Gen[Generate Checksums<br/>XXHash3]
        Events --> Gen
        Gen --> WithIDs[Events with IDs]
    end

    subgraph "Database Deduplication"
        FetchDB[Fetch Existing IDs<br/>30 hour window]
        FilterDB[Filter Against DB]
        WithIDs --> FetchDB
        FetchDB --> FilterDB
        FilterDB --> NewEvents[New Events]
    end

    subgraph "In-Memory Deduplication"
        FilterMem[Filter Duplicates<br/>within Batch]
        NewEvents --> FilterMem
        FilterMem --> UniqueEvents[Unique Events]
    end

    subgraph "Batch Insertion"
        Chunk[Chunk into Batches<br/>size = 1000]
        Insert[Bulk Insert<br/>skipDuplicates]
        UniqueEvents --> Chunk
        Chunk --> Insert
        Insert --> Saved[Saved Events]
    end

    subgraph "Output"
        Result[ProcessingResult<br/>created count<br/>new count]
        Saved --> Result
    end

    style Gen fill:#b2dfdb
    style FilterDB fill:#ffccbc
    style FilterMem fill:#ffccbc
    style Insert fill:#c5e1a5
    style Result fill:#dcedc8
```

---

## Alert Creation Workflow

```mermaid
flowchart TD
    Start([Start Alert Creation]) --> MarkStale[Mark Events >24hrs<br/>as Processed]

    MarkStale --> InitLoop[Initialize Loop<br/>moreToProcess = true]

    InitLoop --> CheckMore{More to<br/>Process?}
    CheckMore -->|No| End([Return Total Alerts])

    CheckMore -->|Yes| CheckType{Provider<br/>Type?}

    CheckType -->|GEOSTATIONARY| SetBatch1[Batch Size = 500]
    CheckType -->|POLAR| SetBatch2[Batch Size = 1000]

    SetBatch1 --> FetchUnprocessed1[Fetch Unprocessed Events]
    SetBatch2 --> FetchUnprocessed2[Fetch Unprocessed Events]

    FetchUnprocessed1 --> HasEvents1{Has<br/>Events?}
    FetchUnprocessed2 --> HasEvents2{Has<br/>Events?}

    HasEvents1 -->|No| SetDone1[moreToProcess = false]
    HasEvents2 -->|No| SetDone2[moreToProcess = false]

    HasEvents1 -->|Yes| GeoQuery[Execute Geostationary<br/>SQL Query]
    HasEvents2 -->|Yes| PolarQuery[Execute Polar<br/>SQL Query]

    subgraph "Geostationary SQL"
        GeoQuery --> GeoSpatial[PostGIS Spatial Join<br/>ST_Within check]
        GeoSpatial --> GeoSlice[Slice Membership<br/>string_to_array]
        GeoSlice --> GeoInsert[INSERT SiteAlert]
        GeoInsert --> GeoMark[UPDATE GeoEvent<br/>isProcessed = true]
        GeoMark --> GeoUpdate[UPDATE SiteAlert<br/>isProcessed = true]
    end

    subgraph "Polar SQL"
        PolarQuery --> PolarSpatial[PostGIS Spatial Join<br/>ST_Within check]
        PolarSpatial --> PolarSlice[Slice Membership<br/>jsonb contains]
        PolarSlice --> PolarInsert[INSERT SiteAlert]
        PolarInsert --> PolarMark[UPDATE GeoEvent<br/>isProcessed = true]
    end

    GeoUpdate --> AddCount1[Add to Total Count]
    PolarMark --> AddCount2[Add to Total Count]

    SetDone1 --> CheckMore
    SetDone2 --> CheckMore
    AddCount1 --> CheckMore
    AddCount2 --> CheckMore

    style GeoQuery fill:#ffccbc
    style PolarQuery fill:#b2dfdb
    style GeoInsert fill:#c5e1a5
    style PolarInsert fill:#c5e1a5
```

---

## Component Dependency Graph

```mermaid
graph TB
    subgraph "API Layer"
        Handler[geo-event-fetcher.ts]
    end

    subgraph "Consolidated Utilities"
        ReqHandler[RequestHandler]
        EventProc[EventProcessor]
        ProvMgr[ProviderManager]
    end

    subgraph "Top-Level Service"
        ProviderSvc[GeoEventProviderService]
    end

    subgraph "Domain Services"
        GeoEventSvc[GeoEventService]
        SiteAlertSvc[SiteAlertService]
    end

    subgraph "Repositories"
        ProviderRepo[GeoEventProviderRepository]
        GeoEventRepo[GeoEventRepository]
        SiteAlertRepo[SiteAlertRepository]
    end

    subgraph "Generic Utilities"
        BatchProc[BatchProcessor]
        Queue[PQueue]
    end

    subgraph "Domain Models"
        EventId[EventId]
        OpResult[OperationResult]
    end

    subgraph "External"
        Prisma[(Prisma Client)]
        XXHash[hash-wasm<br/>XXHash3]
    end

    Handler --> ReqHandler
    Handler --> ProviderSvc

    ProviderSvc --> ProviderRepo
    ProviderSvc --> GeoEventSvc
    ProviderSvc --> SiteAlertSvc
    ProviderSvc --> ProvMgr
    ProviderSvc --> Queue
    ProviderSvc --> OpResult

    GeoEventSvc --> GeoEventRepo
    GeoEventSvc --> EventProc
    GeoEventSvc --> BatchProc

    SiteAlertSvc --> SiteAlertRepo
    SiteAlertSvc --> GeoEventRepo
    SiteAlertSvc --> BatchProc

    ProviderRepo --> Prisma
    GeoEventRepo --> Prisma
    SiteAlertRepo --> Prisma

    EventProc --> EventId
    EventProc --> XXHash
    EventId --> XXHash

    style Handler fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style ProviderSvc fill:#c8e6c9,stroke:#2e7d32,stroke-width:3px
    style GeoEventSvc fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style SiteAlertSvc fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style Prisma fill:#fff3e0,stroke:#e65100,stroke-width:2px
```

---

## Key Architectural Patterns

### 1. **Dependency Injection**

All services receive their dependencies through constructors, enabling:

- Easy testing with mocks
- Clear dependency graph
- Flexible configuration

### 2. **Repository Pattern**

Data access is centralized in repository classes:

- `GeoEventProviderRepository` - Provider queries
- `GeoEventRepository` - Event CRUD operations
- `SiteAlertRepository` - Alert creation with PostGIS

### 3. **Service Layer**

Business logic is organized in service classes:

- `GeoEventProviderService` - Orchestration
- `GeoEventService` - Event processing
- `SiteAlertService` - Alert creation

### 4. **Factory Pattern**

`GeoEventProviderFactory` creates provider instances based on configuration

### 5. **Concurrency Control**

`PQueue` limits concurrent provider processing to prevent resource exhaustion

### 6. **Domain Models**

- `GeoEventChecksum` - Value object for event identity
- `ProcessingResult` - Aggregates metrics across operations

### 7. **Feature Flag**

`USE_REFACTORED_PIPELINE` enables safe gradual rollout with instant rollback

---

## Data Flow Summary

1. **Request Validation** → CronValidator checks CRON_KEY
2. **Parameter Parsing** → RequestParser extracts limit
3. **Provider Selection** → Query DB → Shuffle → Select
4. **Concurrent Processing** → PQueue manages 3 concurrent providers
5. **Event Fetching** → Provider API calls
6. **Deduplication** → Checksum generation → DB filter → Memory filter
7. **Persistence** → Bulk insert in batches of 1000
8. **Alert Creation** → PostGIS spatial joins → Batch processing
9. **Result Aggregation** → Merge all ProcessingResults
10. **Response** → Return metrics to client

---

## Performance Characteristics

| Operation                      | Batch Size  | Concurrency  | Database Impact          |
| ------------------------------ | ----------- | ------------ | ------------------------ |
| Provider Processing            | N/A         | 3 concurrent | Low (sequential updates) |
| Event Insertion                | 1000 events | Sequential   | Medium (bulk inserts)    |
| Alert Creation (GEOSTATIONARY) | 500 events  | Sequential   | High (spatial joins)     |
| Alert Creation (POLAR)         | 1000 events | Sequential   | High (spatial joins)     |

---

## Error Handling Strategy

- **Per-Provider Isolation**: Errors in one provider don't affect others
- **Result Aggregation**: Errors are collected in ProcessingResult
- **Transaction Safety**: Alert creation uses database transactions
- **Graceful Degradation**: System continues processing remaining providers

---

## Monitoring Points

1. **Request Level**: CRON key validation failures
2. **Provider Level**: Fetch failures, API errors
3. **Event Level**: Duplicate ratios, insertion failures
4. **Alert Level**: Spatial join performance, creation counts
5. **System Level**: Processing time, memory usage

---

**Last Updated**: November 18, 2024  
**Version**: 1.0  
**Status**: Current Architecture (Refactored Implementation)
