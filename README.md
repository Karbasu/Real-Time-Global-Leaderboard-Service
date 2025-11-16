# Temporal State Engine

A general-purpose Temporal State Engine built with NestJS, featuring event sourcing and CQRS patterns. This system tracks the evolving state of any domain entity without overwriting historical data.

## Features

- **Flexible Entity Schema**: User-defined types with JSON schema validation
- **Event Sourcing**: Complete audit trail of all state changes
- **CQRS Pattern**: Separate command and query responsibilities
- **NATS Event Store**: Distributed event streaming and pub/sub
- **TimescaleDB Storage**: Time-series optimized PostgreSQL for versioned data
- **Redis Cache**: Fast current state reads with automatic cache invalidation
- **Historical Queries**: Query state at any point in time or version
- **Time-based Analytics**: Aggregate and analyze state changes over time
- **React UI**: Interactive visualization of entity state evolution

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React UI  │────▶│  NestJS API │────▶│   NATS      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                     │
                    ┌──────┴──────┐              │
                    ▼             ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │  Redis   │  │TimescaleDB│  │ Consumers │
              │  Cache   │  │  Events   │  │           │
              └──────────┘  └──────────┘  └──────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- npm or yarn

### Running with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check service health
curl http://localhost:3000/health

# Access the UI
open http://localhost:3001

# View Swagger API docs
open http://localhost:3000/api
```

### Local Development

1. **Start Infrastructure Services**:
```bash
docker-compose up -d timescaledb redis nats
```

2. **Setup Backend**:
```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

3. **Setup Frontend**:
```bash
cd frontend
npm install
npm start
```

## API Overview

### Entity Types
- `POST /entities/types` - Create a new entity type
- `GET /entities/types` - List all entity types
- `GET /entities/types/:id` - Get entity type details

### Entity Instances
- `POST /entities/types/:typeId/instances` - Create entity instance
- `GET /entities/types/:typeId/instances` - List instances
- `GET /entities/instances/:id` - Get instance details
- `GET /entities/types/:typeId/instances/external/:externalId/current` - Fast read from cache

### Events
- `POST /entities/instances/:id/events` - Apply event to entity

### Queries
- `GET /queries/instances/:id/history` - Get event history
- `GET /queries/instances/:id/state/at-version/:version` - State at version
- `GET /queries/instances/:id/state/at-time?timestamp=` - State at timestamp
- `GET /queries/instances/:id/compare?version1=&version2=` - Compare versions
- `GET /queries/instances/:id/timeline/:field` - Field value timeline

### Analytics
- `GET /analytics/entity-types/:name/event-counts` - Event counts by type
- `GET /analytics/entity-types/:name/time-series` - Event time series
- `GET /analytics/entity-types/:typeId/field-aggregation/:field` - Field statistics
- `GET /analytics/entity-types/:name/most-active` - Most active entities
- `GET /analytics/entity-types/:name/summary` - Summary statistics

## Usage Examples

### Create an Entity Type

```bash
curl -X POST http://localhost:3000/entities/types \
  -H "Content-Type: application/json" \
  -d '{
    "name": "player_profile",
    "description": "Game player profile with score tracking",
    "schema": {
      "type": "object",
      "properties": {
        "username": { "type": "string" },
        "email": { "type": "string" },
        "score": { "type": "number" },
        "level": { "type": "number" },
        "achievements": { "type": "array" }
      },
      "required": ["username", "email"]
    }
  }'
```

### Create an Entity Instance

```bash
curl -X POST http://localhost:3000/entities/types/{typeId}/instances \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "player-001",
    "initialState": {
      "username": "john_doe",
      "email": "john@example.com",
      "score": 0,
      "level": 1,
      "achievements": []
    }
  }'
```

### Apply an Event

```bash
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "ScoreIncreased",
    "payload": {
      "score": 150,
      "level": 2
    },
    "metadata": {
      "reason": "level_complete",
      "bonus": 50
    }
  }'
```

### Query Historical State

```bash
# Get state at version 5
curl http://localhost:3000/queries/instances/{instanceId}/state/at-version/5

# Get state at specific timestamp
curl "http://localhost:3000/queries/instances/{instanceId}/state/at-time?timestamp=2024-01-15T10:30:00Z"

# Compare two versions
curl "http://localhost:3000/queries/instances/{instanceId}/compare?version1=1&version2=10"
```

## Project Structure

```
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── entity/      # Entity management
│   │   │   ├── event-store/ # Event sourcing
│   │   │   ├── cache/       # Redis caching
│   │   │   ├── query/       # Historical queries
│   │   │   ├── analytics/   # Time-based analytics
│   │   │   └── health/      # Health checks
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── Dockerfile
├── frontend/                # React UI
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── api/            # API client
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── scripts/                 # Database scripts
├── docker-compose.yml       # Infrastructure setup
└── README.md
```

## Key Concepts

### Event Sourcing
Every state change is captured as an immutable event. The current state is derived by replaying all events from the beginning. This provides:
- Complete audit trail
- Ability to reconstruct state at any point in time
- Event-driven architecture support

### CQRS (Command Query Responsibility Segregation)
Commands (writes) and queries (reads) are handled separately:
- Commands: Create entities, apply events
- Queries: Historical state, analytics, comparisons

### Snapshots
To optimize performance, the system creates snapshots every 10 events. When rebuilding state, it starts from the nearest snapshot and applies remaining events.

### Caching Strategy
- Redis caches current state for fast reads
- Cache is updated on every event application
- Automatic TTL prevents stale data
- Cache miss falls back to database

## Customization

### Custom Event Transformers
You can define custom logic for how events modify state:

```typescript
// In entity.service.ts
async applyEvent(
  instanceId: string,
  dto: ApplyEventDto,
  stateTransformer: (currentState, payload) => newState,
) {
  // Custom transformation logic
}
```

### TimescaleDB Optimization
Enable hypertables for time-series optimization:

```sql
SELECT create_hypertable('events', 'timestamp');

-- Add compression policy
ALTER TABLE events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'entity_instance_id'
);

SELECT add_compression_policy('events', INTERVAL '7 days');
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | API server port | 3000 |
| DB_HOST | TimescaleDB host | localhost |
| DB_PORT | TimescaleDB port | 5432 |
| DB_USERNAME | Database username | postgres |
| DB_PASSWORD | Database password | postgres |
| DB_DATABASE | Database name | temporal_state |
| REDIS_HOST | Redis host | localhost |
| REDIS_PORT | Redis port | 6379 |
| NATS_URL | NATS server URL | nats://localhost:4222 |

## Production Considerations

- Enable database connection pooling
- Configure Redis sentinel for high availability
- Set up NATS cluster for fault tolerance
- Implement proper authentication and authorization
- Add rate limiting and request validation
- Monitor event store growth and implement retention policies
- Regular snapshot cleanup based on retention policy

## License

MIT
