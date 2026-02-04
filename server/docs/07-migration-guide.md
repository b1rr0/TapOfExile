# Migration Guide: Client → Server

## Overview

Existing players have all game state in browser `localStorage` (key: `tap_of_exile_save`).
The migration transfers this data to the PostgreSQL database.

## Migration Phases

### Phase 1: Dual-Write (Current)

```
Client loads:
  1. Auth via POST /auth/telegram → get JWT
  2. Read localStorage → POST /migration/import-local
  3. Server validates, runs migrations V1→V4, writes to DB
  4. Client continues using localStorage for gameplay
  5. Periodic snapshots sent to server
```

### Phase 2: Server-Read

```
Client loads:
  1. Auth via POST /auth/telegram
  2. GET /player → read state from server
  3. Fall back to localStorage if server unavailable
  4. Combat uses /combat/tap endpoints
  5. localStorage kept as offline cache
```

### Phase 3: Full Server Authority

```
Client loads:
  1. Auth → get JWT
  2. All state from server API
  3. Combat fully server-authoritative
  4. Drops computed server-side
  5. localStorage for display-only cache
```

## Data Version Migrations

The server applies the same migration chain as the client:

### V1 → V2 (Single → Multi-character)
- `{player, combat, locations}` → `{characters: [...], gold}`
- Create character from old player fields
- Move combat/locations into character object

### V2 → V3 (Act prefixes)
- Location IDs: `forest_road` → `act1_forest_road`
- Add `currentAct` field

### V3 → V4 (Endgame + Bag)
- Add `endgame` state to each character
- Add `bag` array for loot items

## Validation Rules

- `gold` must be non-negative
- `level` must be 1-9999
- `classId` must be: samurai, warrior, mage, archer
- `bag` items capped at 32
- Timestamp comparison: server keeps newer version

## API

```
POST /migration/import-local
Authorization: Bearer <token>

Body:
{
  "gameData": { ... full GameData JSON from localStorage ... }
}

Response:
{
  "status": "imported",
  "charactersImported": 2,
  "gold": "15000",
  "version": 4
}
```
