# Temporal State Engine - Architecture & Design Guide

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Folder Structure](#folder-structure)
3. [Core Patterns](#core-patterns)
4. [Sample Code](#sample-code)
5. [Use Case Examples](#use-case-examples)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  React UI   │    │   REST API  │    │  WebSocket  │        │
│  │  Dashboard  │    │   Clients   │    │   Clients   │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NestJS Application                    │   │
│  │  ┌──────────────────┐  ┌──────────────────────────┐    │   │
│  │  │   Controllers    │  │    Swagger/OpenAPI       │    │   │
│  │  │  (REST Endpoints)│  │    Documentation         │    │   │
│  │  └────────┬─────────┘  └──────────────────────────┘    │   │
│  └───────────┼─────────────────────────────────────────────┘   │
└──────────────┼──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CQRS LAYER (Command/Query)                    │
│  ┌─────────────────────┐    ┌─────────────────────────┐        │
│  │   COMMAND SIDE      │    │      QUERY SIDE         │        │
│  │                     │    │                         │        │
│  │  ┌───────────────┐  │    │  ┌─────────────────┐   │        │
│  │  │   Commands    │  │    │  │   Query Service │   │        │
│  │  │ - CreateType  │  │    │  │ - Historical    │   │        │
│  │  │ - CreateInst  │  │    │  │ - Time-based    │   │        │
│  │  │ - ApplyEvent  │  │    │  │ - Comparison    │   │        │
│  │  └───────┬───────┘  │    │  └────────┬────────┘   │        │
│  │          │          │    │           │            │        │
│  │  ┌───────▼───────┐  │    │  ┌────────▼────────┐   │        │
│  │  │   Handlers    │  │    │  │   Analytics     │   │        │
│  │  │  (Business    │  │    │  │   Service       │   │        │
│  │  │   Logic)      │  │    │  │ (Aggregations)  │   │        │
│  │  └───────┬───────┘  │    │  └────────┬────────┘   │        │
│  └──────────┼──────────┘    └────────────┼───────────┘        │
└─────────────┼────────────────────────────┼──────────────────────┘
              │                            │
              ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DOMAIN SERVICE LAYER                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   Entity Service                        │    │
│  │  - Entity Type Management                              │    │
│  │  - Entity Instance Lifecycle                           │    │
│  │  - Event Application & State Transformation            │    │
│  └─────────────────────┬──────────────────────────────────┘    │
└────────────────────────┼────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬───────────────┐
        │                │                │               │
        ▼                ▼                ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Event Store │ │    Cache     │ │  Persistence │ │   Message    │
│   Service    │ │   Service    │ │    Layer     │ │   Broker     │
│              │ │              │ │              │ │              │
│ - Append     │ │ - Get/Set    │ │ - TypeORM    │ │ - Publish    │
│ - Rebuild    │ │ - Invalidate │ │ - Entities   │ │ - Subscribe  │
│ - Snapshot   │ │ - Multi-get  │ │ - Relations  │ │ - Routing    │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │               │
       ▼                ▼                ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  TimescaleDB │ │    Redis     │ │  TimescaleDB │ │     NATS     │
│   (Events)   │ │   (Cache)    │ │  (Entities)  │ │   JetStream  │
│              │ │              │ │              │ │              │
│ - Hypertable │ │ - Key-Value  │ │ - JSONB      │ │ - Pub/Sub    │
│ - Time-series│ │ - TTL        │ │ - Indexes    │ │ - Streaming  │
│ - Compression│ │ - Pub/Sub    │ │ - Relations  │ │ - Persistence│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WRITE PATH (Commands)                     │
└─────────────────────────────────────────────────────────────┘

1. API Request → 2. Controller → 3. CommandBus → 4. Handler
       │                                              │
       │                                              ▼
       │                                    5. Entity Service
       │                                              │
       │                    ┌─────────────────────────┼─────────────────┐
       │                    │                         │                 │
       │                    ▼                         ▼                 ▼
       │           6. Event Store            7. Update Cache     8. Publish Event
       │           (Append Event)            (Redis)              (NATS)
       │                    │
       │                    ▼
       │           9. Create Snapshot
       │           (Every N events)
       │
       ▼
   Response to Client

┌─────────────────────────────────────────────────────────────┐
│                    READ PATH (Queries)                       │
└─────────────────────────────────────────────────────────────┘

1. API Request → 2. Controller → 3. Query Service
                                          │
                      ┌───────────────────┴───────────────────┐
                      │                                       │
                      ▼                                       ▼
              Current State?                          Historical State?
                      │                                       │
                      ▼                                       ▼
              Check Redis Cache                     Load Snapshot + Events
                      │                                       │
                 ┌────┴────┐                                 │
                 │         │                                 ▼
              HIT       MISS                          Rebuild State
                 │         │                                 │
                 ▼         ▼                                 │
             Return    Query DB                              │
                         │                                   │
                         ▼                                   ▼
                    Cache Result                        Return State
```

---

## Folder Structure

```
temporal-state-engine/
├── backend/                              # NestJS Backend Application
│   ├── src/
│   │   ├── main.ts                       # Application bootstrap
│   │   ├── app.module.ts                 # Root module configuration
│   │   │
│   │   └── modules/
│   │       ├── entity/                   # Entity Management Domain
│   │       │   ├── entities/             # TypeORM Database Entities
│   │       │   │   ├── entity-type.entity.ts
│   │       │   │   └── entity-instance.entity.ts
│   │       │   │
│   │       │   ├── dto/                  # Data Transfer Objects
│   │       │   │   ├── create-entity-type.dto.ts
│   │       │   │   ├── create-entity-instance.dto.ts
│   │       │   │   └── apply-event.dto.ts
│   │       │   │
│   │       │   ├── commands/             # CQRS Command Definitions
│   │       │   │   ├── create-entity-type.command.ts
│   │       │   │   ├── create-entity-instance.command.ts
│   │       │   │   └── apply-event.command.ts
│   │       │   │
│   │       │   ├── handlers/             # CQRS Command Handlers
│   │       │   │   ├── create-entity-type.handler.ts
│   │       │   │   ├── create-entity-instance.handler.ts
│   │       │   │   └── apply-event.handler.ts
│   │       │   │
│   │       │   ├── services/
│   │       │   │   └── entity.service.ts # Core business logic
│   │       │   │
│   │       │   ├── controllers/
│   │       │   │   └── entity.controller.ts
│   │       │   │
│   │       │   └── entity.module.ts      # Module definition
│   │       │
│   │       ├── event-store/              # Event Sourcing Infrastructure
│   │       │   ├── entities/
│   │       │   │   ├── event.entity.ts   # Immutable event storage
│   │       │   │   └── snapshot.entity.ts # Performance optimization
│   │       │   │
│   │       │   ├── services/
│   │       │   │   ├── event-store.service.ts    # Event persistence
│   │       │   │   └── nats-publisher.service.ts # Event streaming
│   │       │   │
│   │       │   └── event-store.module.ts
│   │       │
│   │       ├── cache/                    # Caching Layer
│   │       │   ├── services/
│   │       │   │   └── cache.service.ts  # Redis operations
│   │       │   └── cache.module.ts
│   │       │
│   │       ├── query/                    # CQRS Query Side
│   │       │   ├── services/
│   │       │   │   └── query.service.ts  # Historical queries
│   │       │   │
│   │       │   ├── controllers/
│   │       │   │   └── query.controller.ts
│   │       │   │
│   │       │   └── query.module.ts
│   │       │
│   │       ├── analytics/                # Time-Series Analytics
│   │       │   ├── services/
│   │       │   │   └── analytics.service.ts
│   │       │   │
│   │       │   ├── controllers/
│   │       │   │   └── analytics.controller.ts
│   │       │   │
│   │       │   └── analytics.module.ts
│   │       │
│   │       └── health/                   # Health Monitoring
│   │           ├── controllers/
│   │           │   └── health.controller.ts
│   │           └── health.module.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                             # React Frontend Application
│   ├── src/
│   │   ├── index.tsx                     # React entry point
│   │   ├── App.tsx                       # Main application component
│   │   ├── App.css                       # Global styles
│   │   │
│   │   ├── api/
│   │   │   └── client.ts                 # Axios API client
│   │   │
│   │   └── pages/
│   │       ├── Dashboard.tsx             # System overview
│   │       ├── EntityTypes.tsx           # Type management
│   │       ├── EntityInstances.tsx       # Instance listing
│   │       ├── EntityDetail.tsx          # Timeline & state viewer
│   │       └── Analytics.tsx             # Charts & statistics
│   │
│   ├── public/
│   │   └── index.html
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── nginx.conf
│
├── scripts/
│   └── init-timescaledb.sql             # Database optimization scripts
│
├── examples/
│   └── example-usage.md                  # Detailed usage examples
│
├── docker-compose.yml                    # Infrastructure setup
└── README.md                             # Project documentation
```

---

## Core Patterns

### 1. Event Sourcing Pattern

Event Sourcing stores state changes as a sequence of immutable events rather than overwriting current state.

```typescript
// Event Entity - Immutable record of state change
@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_instance_id' })
  entityInstanceId: string;

  @Column({ name: 'event_type' })
  eventType: string;                    // e.g., "ScoreUpdated"

  @Column({ type: 'bigint' })
  version: number;                      // Sequential version number

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;     // Event-specific data

  @Column({ type: 'jsonb', name: 'previous_state' })
  previousState: Record<string, unknown>; // State before event

  @Column({ type: 'jsonb', name: 'new_state' })
  newState: Record<string, unknown>;    // State after event

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;                      // When event occurred

  @Column({ name: 'correlation_id', nullable: true })
  correlationId: string;                // Track related events
}
```

**Key Benefits:**
- Complete audit trail
- Temporal queries (state at any point in time)
- Event replay for debugging
- Natural fit for distributed systems

### 2. CQRS (Command Query Responsibility Segregation)

Separates write operations (commands) from read operations (queries).

```typescript
// COMMAND SIDE - Write Operations
// 1. Define Command
export class ApplyEventCommand {
  constructor(
    public readonly entityInstanceId: string,
    public readonly eventType: string,
    public readonly payload: Record<string, unknown>,
  ) {}
}

// 2. Command Handler - Business Logic
@CommandHandler(ApplyEventCommand)
export class ApplyEventHandler implements ICommandHandler<ApplyEventCommand> {
  constructor(private readonly entityService: EntityService) {}

  async execute(command: ApplyEventCommand) {
    // Validate, transform, and persist
    return this.entityService.applyGenericEvent(command.entityInstanceId, {
      eventType: command.eventType,
      payload: command.payload,
    });
  }
}

// 3. Controller dispatches command
@Post('instances/:id/events')
async applyEvent(@Param('id') id: string, @Body() dto: ApplyEventDto) {
  return this.commandBus.execute(
    new ApplyEventCommand(id, dto.eventType, dto.payload)
  );
}

// QUERY SIDE - Read Operations
@Injectable()
export class QueryService {
  // Optimized for reading, can use different data models
  async getHistoricalState(query: HistoricalStateQuery) {
    // Rebuild state from events
  }

  async compareVersions(entityInstanceId: string, v1: number, v2: number) {
    // Calculate differences between versions
  }
}
```

**Key Benefits:**
- Independent scaling of reads and writes
- Optimized data models for each operation
- Clear separation of concerns
- Better performance through specialization

### 3. Snapshot Pattern

Periodic snapshots optimize state reconstruction by avoiding replaying all events from the beginning.

```typescript
@Injectable()
export class EventStoreService {
  private readonly SNAPSHOT_INTERVAL = 10;

  async appendEvent(eventData: EventData): Promise<Event> {
    const savedEvent = await this.eventRepository.save(event);

    // Create snapshot every N events
    if (eventData.version % this.SNAPSHOT_INTERVAL === 0) {
      await this.createSnapshot(
        eventData.entityInstanceId,
        eventData.version,
        eventData.newState,
      );
    }

    return savedEvent;
  }

  async rebuildState(entityInstanceId: string, targetVersion?: number) {
    // Find nearest snapshot before target version
    const snapshot = await this.getSnapshotAtVersion(entityInstanceId, targetVersion);

    let currentState = snapshot ? snapshot.state : {};
    let fromVersion = snapshot ? snapshot.version + 1 : 1;

    // Only replay events since snapshot
    const events = await this.getEvents(entityInstanceId, fromVersion, targetVersion);

    for (const event of events) {
      currentState = event.newState;
    }

    return currentState;
  }
}
```

**Performance Impact:**
- Without snapshots: O(n) - replay all n events
- With snapshots (interval=10): O(10) - replay max 10 events
- Significant improvement for long-lived entities

### 4. Cache-Aside Pattern

Redis cache provides fast current state reads with automatic invalidation.

```typescript
@Injectable()
export class CacheService {
  async setCurrentState(
    entityTypeId: string,
    externalId: string,
    state: Record<string, unknown>,
    version: number,
  ): Promise<void> {
    const key = `entity:${entityTypeId}:${externalId}`;
    await this.redis.set(key, JSON.stringify(state), 'EX', 3600);
  }

  async getCurrentState(entityTypeId: string, externalId: string) {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
}

// Usage in Entity Service
async getCurrentStateFast(entityTypeId: string, externalId: string) {
  // Try cache first (fast path)
  const cached = await this.cacheService.getCurrentState(entityTypeId, externalId);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // Cache miss - fetch from database (slow path)
  const instance = await this.getEntityInstanceByExternalId(entityTypeId, externalId);

  // Populate cache for next request
  await this.cacheService.setCurrentState(
    entityTypeId,
    externalId,
    instance.currentState,
    instance.version,
  );

  return { state: instance.currentState, version: instance.version, fromCache: false };
}
```

---

## Sample Code

### Event Dispatch - Complete Flow

```typescript
// 1. API Layer - Entity Controller
@Controller('entities')
export class EntityController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly entityService: EntityService,
  ) {}

  @Post('instances/:id/events')
  @ApiOperation({ summary: 'Apply an event to an entity instance' })
  async applyEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyEventDto,
  ) {
    // Dispatch command through CQRS bus
    return this.commandBus.execute(
      new ApplyEventCommand(
        id,
        dto.eventType,
        dto.payload,
        dto.correlationId,
        dto.causationId,
        dto.metadata,
      ),
    );
  }
}

// 2. Command Definition
export class ApplyEventCommand {
  constructor(
    public readonly entityInstanceId: string,
    public readonly eventType: string,
    public readonly payload: Record<string, unknown>,
    public readonly correlationId?: string,
    public readonly causationId?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}

// 3. Command Handler
@CommandHandler(ApplyEventCommand)
export class ApplyEventHandler implements ICommandHandler<ApplyEventCommand> {
  constructor(private readonly entityService: EntityService) {}

  async execute(command: ApplyEventCommand) {
    return this.entityService.applyGenericEvent(command.entityInstanceId, {
      eventType: command.eventType,
      payload: command.payload,
      correlationId: command.correlationId,
      causationId: command.causationId,
      metadata: command.metadata,
    });
  }
}

// 4. Domain Service - Core Business Logic
@Injectable()
export class EntityService {
  constructor(
    @InjectRepository(EntityInstance)
    private readonly entityInstanceRepository: Repository<EntityInstance>,
    private readonly eventStoreService: EventStoreService,
    private readonly cacheService: CacheService,
    private readonly natsPublisherService: NatsPublisherService,
  ) {}

  async applyGenericEvent(instanceId: string, dto: ApplyEventDto) {
    // Default transformer: merge payload into state
    const transformer = (currentState, payload) => ({ ...currentState, ...payload });
    return this.applyEvent(instanceId, dto, transformer);
  }

  async applyEvent(
    instanceId: string,
    dto: ApplyEventDto,
    stateTransformer: (current: Record<string, unknown>, payload: Record<string, unknown>) => Record<string, unknown>,
  ) {
    // 1. Load current entity
    const instance = await this.getEntityInstance(instanceId);
    const entityType = instance.entityType;

    // 2. Capture previous state
    const previousState = { ...instance.currentState };

    // 3. Apply transformation to compute new state
    const newState = stateTransformer(instance.currentState, dto.payload);

    // 4. Increment version
    const newVersion = Number(instance.version) + 1;

    // 5. Create immutable event record
    const eventData: EventData = {
      entityInstanceId: instance.id,
      entityTypeName: entityType.name,
      eventType: dto.eventType,
      version: newVersion,
      payload: dto.payload,
      previousState,
      newState,
      metadata: dto.metadata,
      correlationId: dto.correlationId,
      causationId: dto.causationId,
    };

    // 6. Persist event to event store (creates snapshot if needed)
    const event = await this.eventStoreService.appendEvent(eventData);

    // 7. Update entity instance with new state
    instance.currentState = newState;
    instance.version = newVersion;
    const updatedInstance = await this.entityInstanceRepository.save(instance);

    // 8. Update cache for fast reads
    await this.cacheService.setCurrentState(
      entityType.id,
      instance.externalId,
      newState,
      newVersion,
    );

    // 9. Publish event for external consumers
    await this.natsPublisherService.publishEvent(event);

    this.logger.log(`Applied event ${dto.eventType} to ${instance.id} (version ${newVersion})`);

    return { instance: updatedInstance, event };
  }
}

// 5. Event Store Service - Persistence
@Injectable()
export class EventStoreService {
  async appendEvent(eventData: EventData): Promise<Event> {
    const event = this.eventRepository.create({
      id: uuidv4(),
      ...eventData,
    });

    const savedEvent = await this.eventRepository.save(event);

    // Create snapshot periodically for performance
    if (eventData.version % this.SNAPSHOT_INTERVAL === 0) {
      await this.createSnapshot(
        eventData.entityInstanceId,
        eventData.version,
        eventData.newState,
      );
    }

    return savedEvent;
  }
}

// 6. NATS Publisher - Event Streaming
@Injectable()
export class NatsPublisherService {
  async publishEvent(event: Event): Promise<void> {
    const subject = `events.${event.entityTypeName}.${event.eventType}`;
    const payload = {
      id: event.id,
      entityInstanceId: event.entityInstanceId,
      eventType: event.eventType,
      version: event.version,
      payload: event.payload,
      newState: event.newState,
      timestamp: event.timestamp,
    };

    this.connection.publish(subject, this.stringCodec.encode(JSON.stringify(payload)));
  }
}
```

### Version Querying - Complete Flow

```typescript
// 1. API Layer - Query Controller
@Controller('queries')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  // Get state at specific version
  @Get('instances/:id/state/at-version/:version')
  async getStateAtVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version') version: number,
  ) {
    return this.queryService.getHistoricalState({
      entityInstanceId: id,
      version,
    });
  }

  // Get state at specific timestamp
  @Get('instances/:id/state/at-time')
  async getStateAtTimestamp(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('timestamp') timestamp: string,
  ) {
    return this.queryService.getHistoricalState({
      entityInstanceId: id,
      timestamp: new Date(timestamp),
    });
  }

  // Compare two versions
  @Get('instances/:id/compare')
  async compareVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version1') version1: number,
    @Query('version2') version2: number,
  ) {
    return this.queryService.compareVersions(id, version1, version2);
  }

  // Track field changes over time
  @Get('instances/:id/timeline/:field')
  async getFieldTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('field') field: string,
  ) {
    return this.queryService.getStateTimeline(id, field);
  }
}

// 2. Query Service - Historical State Reconstruction
@Injectable()
export class QueryService {
  constructor(
    private readonly eventStoreService: EventStoreService,
    private readonly entityService: EntityService,
  ) {}

  async getHistoricalState(query: HistoricalStateQuery): Promise<Record<string, unknown>> {
    // Query by timestamp
    if (query.timestamp) {
      const state = await this.eventStoreService.getStateAtTimestamp(
        query.entityInstanceId,
        query.timestamp,
      );

      if (!state) {
        throw new NotFoundException(
          `No state found for entity ${query.entityInstanceId} at ${query.timestamp}`,
        );
      }

      return state;
    }

    // Query by version
    if (query.version !== undefined) {
      return this.eventStoreService.rebuildState(
        query.entityInstanceId,
        query.version,
      );
    }

    // Return current state
    const instance = await this.entityService.getEntityInstance(query.entityInstanceId);
    return instance.currentState;
  }

  // Compare two versions to see what changed
  async compareVersions(
    entityInstanceId: string,
    version1: number,
    version2: number,
  ): Promise<StateComparison> {
    // Rebuild both states
    const state1 = await this.eventStoreService.rebuildState(entityInstanceId, version1);
    const state2 = await this.eventStoreService.rebuildState(entityInstanceId, version2);

    // Calculate differences
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const allKeys = new Set([...Object.keys(state1), ...Object.keys(state2)]);

    for (const key of allKeys) {
      const val1 = state1[key];
      const val2 = state2[key];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes[key] = { from: val1, to: val2 };
      }
    }

    return {
      version1,
      version2,
      state1,
      state2,
      changes,
    };
  }

  // Get timeline of a specific field's values
  async getStateTimeline(
    entityInstanceId: string,
    field: string,
  ): Promise<Array<{ timestamp: Date; version: number; value: unknown }>> {
    const events = await this.eventStoreService.getEvents(entityInstanceId);
    const timeline = [];

    for (const event of events) {
      const value = event.newState[field];
      timeline.push({
        timestamp: event.timestamp,
        version: Number(event.version),
        value,
      });
    }

    return timeline;
  }
}

// 3. Event Store Service - State Reconstruction
@Injectable()
export class EventStoreService {
  // Rebuild state from events (with snapshot optimization)
  async rebuildState(entityInstanceId: string, targetVersion?: number): Promise<Record<string, unknown>> {
    // Find nearest snapshot for performance
    const snapshot = targetVersion
      ? await this.getSnapshotAtVersion(entityInstanceId, targetVersion)
      : await this.getLatestSnapshot(entityInstanceId);

    let currentState: Record<string, unknown> = {};
    let fromVersion = 1;

    if (snapshot) {
      currentState = snapshot.state;
      fromVersion = Number(snapshot.version) + 1;
    }

    // Apply events from snapshot to target version
    const events = await this.getEvents(entityInstanceId, fromVersion, targetVersion);

    for (const event of events) {
      currentState = event.newState;
    }

    return currentState;
  }

  // Get state at specific timestamp
  async getStateAtTimestamp(
    entityInstanceId: string,
    timestamp: Date,
  ): Promise<Record<string, unknown> | null> {
    const event = await this.eventRepository.findOne({
      where: {
        entityInstanceId,
        timestamp: LessThanOrEqual(timestamp),
      },
      order: { timestamp: 'DESC' },
    });

    return event ? event.newState : null;
  }

  // Get events with optional version filtering
  async getEvents(
    entityInstanceId: string,
    fromVersion?: number,
    toVersion?: number,
  ): Promise<Event[]> {
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event.entityInstanceId = :entityInstanceId', { entityInstanceId })
      .orderBy('event.version', 'ASC');

    if (fromVersion !== undefined) {
      queryBuilder.andWhere('event.version >= :fromVersion', { fromVersion });
    }

    if (toVersion !== undefined) {
      queryBuilder.andWhere('event.version <= :toVersion', { toVersion });
    }

    return queryBuilder.getMany();
  }
}
```

### Custom Event Transformer Example

```typescript
// Example: Score update with validation and bonus calculation
async applyScoreUpdate(instanceId: string, scoreData: { delta: number; reason: string }) {
  const transformer = (currentState, payload) => {
    const currentScore = currentState.score || 0;
    let bonus = 0;

    // Apply bonus based on reason
    if (payload.reason === 'perfect_game') {
      bonus = payload.delta * 0.5;
    }

    const newScore = currentScore + payload.delta + bonus;

    // Check for level up
    let newLevel = currentState.level || 1;
    if (newScore >= newLevel * 1000) {
      newLevel += 1;
    }

    return {
      ...currentState,
      score: newScore,
      level: newLevel,
      lastScoreUpdate: new Date().toISOString(),
    };
  };

  return this.applyEvent(instanceId, {
    eventType: 'ScoreUpdated',
    payload: scoreData,
  }, transformer);
}
```

---

## Use Case Examples

### Example 1: E-Commerce Order Lifecycle Management

Track the complete lifecycle of an order from creation to delivery, with full audit trail.

#### Setup

```typescript
// Create Order Entity Type
const orderType = await createEntityType({
  name: 'ecommerce_order',
  description: 'Complete order lifecycle with payment and shipping',
  schema: {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
      customerId: { type: 'string' },
      status: {
        type: 'string',
        enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']
      },
      items: { type: 'array' },
      subtotal: { type: 'number' },
      tax: { type: 'number' },
      total: { type: 'number' },
      shippingAddress: { type: 'object' },
      billingAddress: { type: 'object' },
      paymentMethod: { type: 'string' },
      trackingNumber: { type: 'string' },
    },
  },
});
```

#### Order Creation

```typescript
// Create new order instance
const order = await createEntityInstance(orderType.id, {
  externalId: 'ORD-2024-1001',
  initialState: {
    orderId: 'ORD-2024-1001',
    customerId: 'CUST-456',
    status: 'pending',
    items: [
      { sku: 'LAPTOP-PRO', quantity: 1, price: 1299.99 },
      { sku: 'MOUSE-WIRELESS', quantity: 2, price: 49.99 },
    ],
    subtotal: 1399.97,
    tax: 111.99,
    total: 1511.96,
    shippingAddress: {
      street: '123 Tech Avenue',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
    },
    billingAddress: {
      street: '123 Tech Avenue',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
    },
    paymentMethod: null,
    trackingNumber: null,
  },
});

// Event 1: Payment Processed (Version 2)
await applyEvent(order.id, {
  eventType: 'PaymentProcessed',
  payload: {
    status: 'paid',
    paymentMethod: 'credit_card',
  },
  correlationId: 'payment-gateway-txn-789',
  metadata: {
    transactionId: 'TXN-12345',
    paymentGateway: 'Stripe',
    cardLast4: '4242',
    processingTime: 1.2,
  },
});

// Event 2: Order Processing Started (Version 3)
await applyEvent(order.id, {
  eventType: 'ProcessingStarted',
  payload: {
    status: 'processing',
  },
  metadata: {
    warehouse: 'SF-WEST',
    assignedTo: 'picker-007',
    estimatedProcessingTime: '2 hours',
  },
});

// Event 3: Order Shipped (Version 4)
await applyEvent(order.id, {
  eventType: 'OrderShipped',
  payload: {
    status: 'shipped',
    trackingNumber: '1Z999AA10123456784',
  },
  metadata: {
    carrier: 'UPS',
    shippingMethod: 'Ground',
    estimatedDelivery: '2024-01-20',
    weight: 5.2,
  },
});

// Event 4: Order Delivered (Version 5)
await applyEvent(order.id, {
  eventType: 'OrderDelivered',
  payload: {
    status: 'delivered',
  },
  metadata: {
    deliveredAt: '2024-01-19T14:30:00Z',
    signedBy: 'J. Smith',
    photoProof: 'delivery-photo-001.jpg',
  },
});
```

#### Querying Order History

```typescript
// 1. Get complete order lifecycle
const history = await getEventHistory(order.id);
console.log('Order Lifecycle:');
history.events.forEach(event => {
  console.log(`  ${event.version}. ${event.eventType} at ${event.timestamp}`);
});
// Output:
//   1. EntityCreated at 2024-01-15T10:00:00Z
//   2. PaymentProcessed at 2024-01-15T10:05:00Z
//   3. ProcessingStarted at 2024-01-15T10:30:00Z
//   4. OrderShipped at 2024-01-17T09:00:00Z
//   5. OrderDelivered at 2024-01-19T14:30:00Z

// 2. What was the order status before shipping?
const stateBeforeShip = await getStateAtVersion(order.id, 3);
console.log('Status before shipping:', stateBeforeShip.status);
// Output: "processing"

// 3. Audit: When did we process payment? What method?
const paymentEvent = history.events.find(e => e.eventType === 'PaymentProcessed');
console.log('Payment processed at:', paymentEvent.timestamp);
console.log('Payment method:', paymentEvent.newState.paymentMethod);
console.log('Transaction ID:', paymentEvent.metadata.transactionId);

// 4. Track status changes over time
const statusTimeline = await getFieldTimeline(order.id, 'status');
console.log('Status Timeline:');
statusTimeline.forEach(point => {
  console.log(`  v${point.version}: ${point.value} at ${point.timestamp}`);
});

// 5. Compare order at creation vs delivery
const comparison = await compareVersions(order.id, 1, 5);
console.log('Changes from creation to delivery:', comparison.changes);
// Output: {
//   status: { from: 'pending', to: 'delivered' },
//   paymentMethod: { from: null, to: 'credit_card' },
//   trackingNumber: { from: null, to: '1Z999AA10123456784' }
// }
```

#### Business Intelligence Queries

```typescript
// 1. Average time from paid to shipped
const paidToShippedTime = async (orderId: string) => {
  const events = await getEventHistory(orderId);
  const paidEvent = events.find(e => e.eventType === 'PaymentProcessed');
  const shippedEvent = events.find(e => e.eventType === 'OrderShipped');

  if (paidEvent && shippedEvent) {
    const diffMs = new Date(shippedEvent.timestamp) - new Date(paidEvent.timestamp);
    return diffMs / (1000 * 60 * 60); // Hours
  }
  return null;
};

// 2. Orders cancelled after payment (refund cases)
const eventStats = await getSummaryStatistics('ecommerce_order');
console.log('Event distribution:', eventStats.eventsByType);
// Shows how many orders were cancelled vs completed

// 3. Most problematic orders (most events = most status changes)
const activeOrders = await getMostActiveEntities('ecommerce_order', 10);
// Orders with many events might indicate issues
```

---

### Example 2: Real-Time Multiplayer Game Player Stats

Track player progression, achievements, and game statistics with complete history for anti-cheat and analytics.

#### Setup

```typescript
const playerType = await createEntityType({
  name: 'game_player_stats',
  description: 'Player progression, inventory, and competitive stats',
  schema: {
    type: 'object',
    properties: {
      playerId: { type: 'string' },
      username: { type: 'string' },
      level: { type: 'number' },
      experience: { type: 'number' },
      experienceToNextLevel: { type: 'number' },
      currency: {
        type: 'object',
        properties: {
          gold: { type: 'number' },
          gems: { type: 'number' },
        },
      },
      stats: {
        type: 'object',
        properties: {
          matchesPlayed: { type: 'number' },
          wins: { type: 'number' },
          losses: { type: 'number' },
          kills: { type: 'number' },
          deaths: { type: 'number' },
          kdRatio: { type: 'number' },
        },
      },
      inventory: { type: 'array' },
      achievements: { type: 'array' },
      currentSeason: { type: 'number' },
      seasonRank: { type: 'string' },
      banStatus: { type: 'object' },
    },
  },
});
```

#### Player Progression Events

```typescript
// Create new player
const player = await createEntityInstance(playerType.id, {
  externalId: 'player-dragon-slayer-99',
  initialState: {
    playerId: 'USR-99',
    username: 'DragonSlayer99',
    level: 1,
    experience: 0,
    experienceToNextLevel: 1000,
    currency: { gold: 100, gems: 10 },
    stats: {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      kills: 0,
      deaths: 0,
      kdRatio: 0,
    },
    inventory: ['starter_sword', 'basic_shield'],
    achievements: [],
    currentSeason: 5,
    seasonRank: 'Bronze',
    banStatus: { banned: false },
  },
});

// Event 1: First Match Completed (Win)
await applyEvent(player.id, {
  eventType: 'MatchCompleted',
  payload: {
    experience: 250,
    currency: { gold: 150, gems: 10 },
    stats: {
      matchesPlayed: 1,
      wins: 1,
      losses: 0,
      kills: 12,
      deaths: 3,
      kdRatio: 4.0,
    },
  },
  correlationId: 'match-session-001',
  metadata: {
    matchId: 'MATCH-001',
    gameMode: 'ranked',
    duration: '15:32',
    map: 'Castle_Siege',
    team: 'Blue',
    mvp: true,
  },
});

// Event 2: Achievement Unlocked
await applyEvent(player.id, {
  eventType: 'AchievementUnlocked',
  payload: {
    achievements: ['First Victory', 'Kill Streak 5'],
    experience: 350,
    currency: { gold: 250, gems: 15 },
  },
  metadata: {
    achievementDetails: [
      { id: 'first_victory', title: 'First Victory', xpBonus: 100 },
      { id: 'kill_streak_5', title: 'Kill Streak 5', xpBonus: 50 },
    ],
  },
});

// Event 3: Item Purchased
await applyEvent(player.id, {
  eventType: 'ItemPurchased',
  payload: {
    inventory: ['starter_sword', 'basic_shield', 'legendary_bow'],
    currency: { gold: 50, gems: 15 },
  },
  correlationId: 'transaction-002',
  metadata: {
    itemId: 'legendary_bow',
    price: { gold: 200 },
    shopId: 'main_store',
  },
});

// Event 4: Level Up!
await applyEvent(player.id, {
  eventType: 'LevelUp',
  payload: {
    level: 2,
    experience: 100, // Remaining XP after level up
    experienceToNextLevel: 1500,
    currency: { gold: 150, gems: 25 }, // Level up bonus
  },
  metadata: {
    previousLevel: 1,
    bonusRewards: ['gold_100', 'gems_10'],
  },
});

// Event 5: Season Rank Update
await applyEvent(player.id, {
  eventType: 'SeasonRankUpdated',
  payload: {
    seasonRank: 'Silver',
  },
  metadata: {
    previousRank: 'Bronze',
    rankPoints: 1250,
    gamesAtRank: 1,
  },
});

// Event 6: Suspicious Activity Detected (Anti-Cheat)
await applyEvent(player.id, {
  eventType: 'AntiCheatFlagged',
  payload: {
    banStatus: {
      banned: false,
      warnings: 1,
      lastWarning: '2024-01-16T10:00:00Z',
      reason: 'unusual_kill_pattern',
    },
  },
  metadata: {
    detectionSystem: 'heuristic_v2',
    confidence: 0.72,
    reviewRequired: true,
    evidenceId: 'EVIDENCE-001',
  },
});

// Event 7: Another Match (checking for cheating patterns)
await applyEvent(player.id, {
  eventType: 'MatchCompleted',
  payload: {
    experience: 280,
    currency: { gold: 320, gems: 25 },
    stats: {
      matchesPlayed: 2,
      wins: 2,
      losses: 0,
      kills: 24,
      deaths: 5,
      kdRatio: 4.8,
    },
  },
  metadata: {
    matchId: 'MATCH-002',
    gameMode: 'ranked',
    duration: '18:45',
    suspiciousActivity: false,
  },
});
```

#### Analytics and Anti-Cheat Queries

```typescript
// 1. Player Progression Analysis
const levelTimeline = await getFieldTimeline(player.id, 'level');
const expTimeline = await getFieldTimeline(player.id, 'experience');
console.log('Level progression:', levelTimeline);
console.log('XP gains over time:', expTimeline);

// 2. K/D Ratio Trends (Anti-Cheat)
const kdTimeline = await getFieldTimeline(player.id, 'stats');
const kdRatios = kdTimeline.map(point => ({
  version: point.version,
  kdRatio: point.value?.kdRatio || 0,
  timestamp: point.timestamp,
}));
console.log('K/D Ratio progression:', kdRatios);
// Sudden spikes might indicate cheating

// 3. Currency Flow Analysis
const currencyHistory = await getFieldTimeline(player.id, 'currency');
currencyHistory.forEach((point, index) => {
  if (index > 0) {
    const prev = currencyHistory[index - 1];
    const goldDiff = point.value.gold - prev.value.gold;
    const gemsDiff = point.value.gems - prev.value.gems;
    console.log(`v${point.version}: Gold ${goldDiff >= 0 ? '+' : ''}${goldDiff}, Gems ${gemsDiff >= 0 ? '+' : ''}${gemsDiff}`);
  }
});

// 4. Achievement Timeline
const achievementHistory = await getFieldTimeline(player.id, 'achievements');
console.log('Achievement unlocks:', achievementHistory);

// 5. State at specific time (for dispute resolution)
const stateAtDispute = await getStateAtTimestamp(player.id, '2024-01-16T09:00:00Z');
console.log('Player state before anti-cheat flag:', stateAtDispute);

// 6. Compare player before and after suspicious activity
const beforeFlag = await getStateAtVersion(player.id, 5);
const afterMatches = await getStateAtVersion(player.id, 7);
const comparison = await compareVersions(player.id, 5, 7);
console.log('Stats changes during investigation period:', comparison.changes.stats);

// 7. Most Active Players (for leaderboards)
const topPlayers = await getMostActiveEntities('game_player_stats', 100);
console.log('Most active players:', topPlayers);

// 8. Aggregate Statistics
const levelDistribution = await getFieldDistribution(playerType.id, 'level', 10);
console.log('Player level distribution:', levelDistribution);

const kdStats = await getFieldAggregation(playerType.id, 'stats.kdRatio');
console.log('K/D Ratio statistics:', kdStats);
// { min: 0.5, max: 4.8, avg: 2.1, count: 1000 }
```

#### Real-Time Leaderboard with Historical Context

```typescript
// Get current top players
const getCurrentLeaderboard = async () => {
  const instances = await getEntityInstances(playerType.id, 100);
  return instances
    .sort((a, b) => b.currentState.level - a.currentState.level)
    .map(p => ({
      username: p.currentState.username,
      level: p.currentState.level,
      seasonRank: p.currentState.seasonRank,
      kdRatio: p.currentState.stats.kdRatio,
    }));
};

// Track how leaderboard changed over time
const getLeaderboardAtTime = async (timestamp: string) => {
  const instances = await getEntityInstances(playerType.id, 100);
  const historicalStates = await Promise.all(
    instances.map(async (inst) => {
      const state = await getStateAtTimestamp(inst.id, timestamp);
      return { id: inst.id, state };
    })
  );

  return historicalStates
    .filter(p => p.state)
    .sort((a, b) => b.state.level - a.state.level)
    .map(p => ({
      username: p.state.username,
      level: p.state.level,
    }));
};

// Compare rankings over season
const seasonStart = '2024-01-01T00:00:00Z';
const now = new Date().toISOString();

const startRankings = await getLeaderboardAtTime(seasonStart);
const currentRankings = await getCurrentLeaderboard();

console.log('Ranking changes this season:', {
  start: startRankings,
  current: currentRankings,
});
```

---

## Benefits Summary

1. **Complete Audit Trail**: Every state change is recorded with timestamp, who changed it, and why
2. **Time Travel**: Query exact state at any historical point
3. **Debugging**: Replay events to understand how bugs occurred
4. **Compliance**: Meet regulatory requirements with immutable records
5. **Analytics**: Rich time-series data for business intelligence
6. **Scalability**: Read and write paths can scale independently
7. **Flexibility**: Works with any domain entity type
8. **Performance**: Caching and snapshots ensure fast reads

The Temporal State Engine provides a robust foundation for building applications that require complete state history, compliance tracking, and sophisticated temporal queries.
