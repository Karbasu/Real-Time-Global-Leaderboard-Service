# Temporal State Engine - Usage Examples

This document provides comprehensive examples of how to use the Temporal State Engine for various use cases.

## Use Case 1: User Profile Management

### Create User Profile Entity Type

```bash
curl -X POST http://localhost:3000/entities/types \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user_profile",
    "description": "User profile with preferences and settings",
    "schema": {
      "type": "object",
      "properties": {
        "username": { "type": "string" },
        "email": { "type": "string" },
        "displayName": { "type": "string" },
        "preferences": {
          "type": "object",
          "properties": {
            "theme": { "type": "string" },
            "language": { "type": "string" },
            "notifications": { "type": "boolean" }
          }
        },
        "lastLogin": { "type": "string" }
      }
    }
  }'
```

### Create a User Instance

```bash
curl -X POST http://localhost:3000/entities/types/{typeId}/instances \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "user-12345",
    "initialState": {
      "username": "alice_wonder",
      "email": "alice@example.com",
      "displayName": "Alice Wonder",
      "preferences": {
        "theme": "light",
        "language": "en",
        "notifications": true
      },
      "lastLogin": "2024-01-01T00:00:00Z"
    }
  }'
```

### Track Profile Changes

```bash
# User changes theme
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "PreferencesUpdated",
    "payload": {
      "preferences": {
        "theme": "dark",
        "language": "en",
        "notifications": true
      }
    }
  }'

# User logs in
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "UserLoggedIn",
    "payload": {
      "lastLogin": "2024-01-15T10:30:00Z"
    },
    "metadata": {
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  }'

# User changes email
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "EmailUpdated",
    "payload": {
      "email": "alice.new@example.com"
    },
    "correlationId": "support-ticket-123"
  }'
```

### Query User History

```bash
# See all changes
curl http://localhost:3000/queries/instances/{instanceId}/history

# What was the email before the change?
curl http://localhost:3000/queries/instances/{instanceId}/state/at-version/2

# Track preference changes over time
curl http://localhost:3000/queries/instances/{instanceId}/timeline/preferences
```

---

## Use Case 2: Inventory Management

### Create Product Inventory Entity Type

```bash
curl -X POST http://localhost:3000/entities/types \
  -H "Content-Type: application/json" \
  -d '{
    "name": "product_inventory",
    "description": "Product inventory levels and movements",
    "schema": {
      "type": "object",
      "properties": {
        "sku": { "type": "string" },
        "productName": { "type": "string" },
        "quantity": { "type": "number" },
        "reservedQuantity": { "type": "number" },
        "reorderLevel": { "type": "number" },
        "warehouseLocation": { "type": "string" }
      }
    }
  }'
```

### Create Product Instance

```bash
curl -X POST http://localhost:3000/entities/types/{typeId}/instances \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "SKU-WIDGET-001",
    "initialState": {
      "sku": "SKU-WIDGET-001",
      "productName": "Premium Widget",
      "quantity": 1000,
      "reservedQuantity": 0,
      "reorderLevel": 100,
      "warehouseLocation": "A-12-3"
    }
  }'
```

### Track Inventory Movements

```bash
# Order placed - reserve inventory
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "InventoryReserved",
    "payload": {
      "reservedQuantity": 50
    },
    "correlationId": "order-789",
    "metadata": {
      "orderId": "ORD-789",
      "customerId": "CUST-456"
    }
  }'

# Order shipped - reduce inventory
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "InventoryShipped",
    "payload": {
      "quantity": 950,
      "reservedQuantity": 0
    },
    "correlationId": "order-789"
  }'

# Receive new stock
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "StockReceived",
    "payload": {
      "quantity": 1450
    },
    "metadata": {
      "purchaseOrderId": "PO-123",
      "supplierId": "SUP-ABC"
    }
  }'
```

### Analytics for Inventory

```bash
# Track quantity changes over time
curl http://localhost:3000/queries/instances/{instanceId}/timeline/quantity

# Aggregate statistics
curl http://localhost:3000/analytics/entity-types/{typeId}/field-aggregation/quantity

# Most active products (most inventory movements)
curl http://localhost:3000/analytics/entity-types/product_inventory/most-active
```

---

## Use Case 3: Game Player Progress

### Create Player Progress Entity Type

```bash
curl -X POST http://localhost:3000/entities/types \
  -H "Content-Type: application/json" \
  -d '{
    "name": "player_progress",
    "description": "Game player progress and achievements",
    "schema": {
      "type": "object",
      "properties": {
        "playerId": { "type": "string" },
        "username": { "type": "string" },
        "level": { "type": "number" },
        "experience": { "type": "number" },
        "coins": { "type": "number" },
        "achievements": { "type": "array" },
        "currentQuest": { "type": "string" },
        "stats": {
          "type": "object",
          "properties": {
            "gamesPlayed": { "type": "number" },
            "wins": { "type": "number" },
            "losses": { "type": "number" }
          }
        }
      }
    }
  }'
```

### Track Player Progress

```bash
# Create player
curl -X POST http://localhost:3000/entities/types/{typeId}/instances \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "player-hero123",
    "initialState": {
      "playerId": "hero123",
      "username": "DragonSlayer",
      "level": 1,
      "experience": 0,
      "coins": 100,
      "achievements": [],
      "currentQuest": "tutorial",
      "stats": {
        "gamesPlayed": 0,
        "wins": 0,
        "losses": 0
      }
    }
  }'

# Complete a quest
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "QuestCompleted",
    "payload": {
      "experience": 250,
      "coins": 200,
      "currentQuest": "forest_adventure"
    },
    "metadata": {
      "questId": "tutorial",
      "completionTime": "00:15:30",
      "bonusObjectives": 2
    }
  }'

# Level up
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "LevelUp",
    "payload": {
      "level": 2,
      "experience": 0,
      "achievements": ["First Level Up"]
    }
  }'

# Win a game
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "GameCompleted",
    "payload": {
      "experience": 100,
      "coins": 350,
      "stats": {
        "gamesPlayed": 1,
        "wins": 1,
        "losses": 0
      }
    },
    "metadata": {
      "gameType": "pvp",
      "opponent": "player-enemy456",
      "score": "10-5"
    }
  }'
```

### Analyze Player Data

```bash
# Experience growth over time
curl http://localhost:3000/queries/instances/{instanceId}/timeline/experience

# Level progression
curl http://localhost:3000/queries/instances/{instanceId}/timeline/level

# Compare early vs current stats
curl "http://localhost:3000/queries/instances/{instanceId}/compare?version1=1&version2=10"

# Event distribution (what do players do most?)
curl http://localhost:3000/analytics/entity-types/player_progress/event-distribution

# Player statistics aggregation
curl http://localhost:3000/analytics/entity-types/{typeId}/field-aggregation/level
```

---

## Use Case 4: Order Lifecycle

### Create Order Entity Type

```bash
curl -X POST http://localhost:3000/entities/types \
  -H "Content-Type: application/json" \
  -d '{
    "name": "order_lifecycle",
    "description": "E-commerce order state machine",
    "schema": {
      "type": "object",
      "properties": {
        "orderId": { "type": "string" },
        "customerId": { "type": "string" },
        "status": { "type": "string" },
        "items": { "type": "array" },
        "totalAmount": { "type": "number" },
        "shippingAddress": { "type": "object" },
        "paymentInfo": { "type": "object" },
        "trackingNumber": { "type": "string" }
      }
    }
  }'
```

### Track Order Through Lifecycle

```bash
# Create order
curl -X POST http://localhost:3000/entities/types/{typeId}/instances \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "ORD-2024-001",
    "initialState": {
      "orderId": "ORD-2024-001",
      "customerId": "CUST-789",
      "status": "pending",
      "items": [
        {"productId": "PROD-A", "quantity": 2, "price": 29.99},
        {"productId": "PROD-B", "quantity": 1, "price": 49.99}
      ],
      "totalAmount": 109.97,
      "shippingAddress": {
        "street": "123 Main St",
        "city": "New York",
        "zip": "10001"
      },
      "paymentInfo": {},
      "trackingNumber": null
    }
  }'

# Payment processed
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "PaymentProcessed",
    "payload": {
      "status": "paid",
      "paymentInfo": {
        "method": "credit_card",
        "transactionId": "TXN-12345",
        "paidAt": "2024-01-15T10:00:00Z"
      }
    }
  }'

# Order shipped
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "OrderShipped",
    "payload": {
      "status": "shipped",
      "trackingNumber": "1Z999AA10123456784"
    },
    "metadata": {
      "carrier": "UPS",
      "estimatedDelivery": "2024-01-18"
    }
  }'

# Order delivered
curl -X POST http://localhost:3000/entities/instances/{instanceId}/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "OrderDelivered",
    "payload": {
      "status": "delivered"
    },
    "metadata": {
      "deliveredAt": "2024-01-17T14:30:00Z",
      "signedBy": "J. Smith"
    }
  }'
```

### Query Order History

```bash
# Full order lifecycle
curl http://localhost:3000/queries/instances/{instanceId}/history

# Status at specific time (for auditing)
curl "http://localhost:3000/queries/instances/{instanceId}/state/at-time?timestamp=2024-01-16T00:00:00Z"

# Track status changes
curl http://localhost:3000/queries/instances/{instanceId}/timeline/status
```

---

## Best Practices

1. **Event Naming**: Use past tense for event types (e.g., `OrderShipped`, `UserCreated`)

2. **Payload Design**: Include only the fields that changed in the payload

3. **Correlation IDs**: Use correlation IDs to track related events across entities

4. **Metadata**: Store contextual information in metadata (who, where, why)

5. **Schema Evolution**: Plan for schema changes - add new fields, avoid removing required fields

6. **Snapshot Strategy**: The system creates snapshots every 10 events; adjust based on your needs

7. **Cache TTL**: Configure Redis TTL based on read patterns and data freshness requirements
