# Architecture Overview

## Stack
- **Runtime**: Node.js 20
- **Framework**: NestJS 10
- **Database**: PostgreSQL 16 (TypeORM 0.3)
- **Cache**: Redis 7 (ioredis)
- **WebSocket**: Socket.IO 4.8 (namespace `/combat`)
- **Auth**: Telegram initData + JWT (Passport)
- **Containers**: Docker Compose

## Project Structure

```
server/
  src/
    main.ts                    # NestJS bootstrap, CORS, Swagger, Socket.IO adapter
    app.module.ts              # Root module, imports all feature modules

    auth/                      # Telegram auth + JWT tokens
    player/                    # Player state (getPlayerState)
    character/                 # Character CRUD, activate, skin
    combat/                    # WebSocket gateway + server-authoritative combat
    level-gen/                 # Monster factory, queue builder
    loot/                      # Bag management, map key drops
    skill-tree/                # Skill tree allocations, validation, reset
    endgame/                   # Endgame status, unlock logic
    league/                    # League CRUD, join/switch, migration

    shared/
      entities/                # TypeORM entities (6 tables)
      constants/               # Balance constants, game version
      decorators/              # @CurrentUser param decorator

    database/                  # TypeORM config, data source
    redis/                     # Redis client wrapper (global)
```

## Module Dependency Graph

```
AppModule
  ├── ConfigModule         (global)
  ├── ThrottlerModule      (100 req/60s)
  ├── DatabaseModule       → TypeORM PostgreSQL
  ├── RedisModule          → ioredis (global)
  ├── AuthModule           → Player entity, Redis
  ├── PlayerModule         → Player, PlayerLeague, Character entities
  ├── CharacterModule      → Character, Player, PlayerLeague entities
  ├── CombatModule         → WebSocket gateway, Character, CombatSession, LevelGen, Loot
  ├── LevelGenModule       → (standalone, no DB)
  ├── LootModule           → BagItem, PlayerLeague entities
  ├── SkillTreeModule      → Character entities
  ├── EndgameModule        → Character entity, LootModule
  └── LeagueModule         → League, PlayerLeague, Player entities
```

## Data Flow

```
Client (Telegram WebApp)
  │
  ├── REST (HTTP)
  │   ├── POST /auth/telegram {initData}     → JWT tokens
  │   ├── GET  /player                        → Full game state
  │   ├── GET  /characters                    → Character list
  │   ├── POST /characters {nickname, classId}→ New character
  │   ├── GET  /skill-tree?characterId=       → Allocated nodes
  │   ├── POST /skill-tree/accept             → Bulk save allocations
  │   ├── GET  /loot/bag                      → Bag contents
  │   ├── GET  /leagues                       → Active leagues
  │   └── POST /endgame/check-unlock          → Unlock endgame
  │
  └── WebSocket (Socket.IO /combat namespace)
      ├── combat:start-location               → Start story combat
      ├── combat:start-map                    → Start endgame combat
      ├── combat:tap                          → Player attack
      ├── combat:entrance-done                → Monster entrance finished
      ├── combat:complete                     → Claim rewards
      ├── combat:flee                         → Abandon combat
      ├── combat:reconnect                    → Resume after disconnect
      │
      ├── combat:started         ← Session created
      ├── combat:tap-result      ← Damage result
      ├── combat:enemy-attack    ← Server tick (200ms)
      ├── combat:completed       ← Rewards awarded
      ├── combat:player-died     ← Player HP <= 0
      └── combat:reconnected     ← Session resumed
```

## Key Design Decisions

- **Server-authoritative combat**: All damage calculations on server, client is pure presentation
- **WebSocket for combat**: Socket.IO gateway replaced REST combat endpoints (lower latency, real-time enemy attacks)
- **Redis for sessions**: Combat sessions in Redis (30min TTL), not PostgreSQL (fast read/write for 200ms ticks)
- **Per-league scoping**: Gold and bag tied to PlayerLeague, characters bound to league
- **Shared code**: Balance constants, types, skill-tree validation shared between FE and BE via `@shared/` alias
