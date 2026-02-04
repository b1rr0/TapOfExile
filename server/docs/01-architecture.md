# Architecture Overview

## Stack
- **Runtime**: Node.js 20
- **Framework**: NestJS 10
- **Database**: PostgreSQL 16 (TypeORM)
- **Cache**: Redis 7 (ioredis)
- **Auth**: Telegram initData + JWT (Passport)
- **Containers**: Docker Compose

## Project Structure

```
server/
  src/
    main.ts                    # NestJS bootstrap, CORS, Swagger, validation
    app.module.ts              # Root module, imports all feature modules

    auth/                      # Telegram auth + JWT tokens
    player/                    # Player CRUD, gold management
    character/                 # Character CRUD, activate, skin
    combat/                    # Server-authoritative combat sessions
    level-gen/                 # Monster factory (ported from client)
    loot/                      # Bag management, map key drops
    skill-tree/                # Skill tree allocations, bonus compute
    endgame/                   # Endgame status, unlock logic
    game-data/                 # Balance, classes, version (cached)
    rewards/                   # Daily rewards, achievements (future)
    migration/                 # Import localStorage saves to DB

    shared/
      entities/                # TypeORM entities (6 tables)
      constants/               # Balance constants, game version
      decorators/              # @CurrentUser param decorator

    database/                  # TypeORM config, migrations
    redis/                     # Redis client wrapper (global)
```

## Module Dependency Graph

```
AppModule
  ├── AuthModule         → Player entity, Redis
  ├── PlayerModule       → Player entity
  ├── CharacterModule    → Character, Player entities
  ├── CombatModule       → Character, Player, CombatSession entities, LevelGenModule
  ├── LevelGenModule     → (standalone, no DB)
  ├── LootModule         → BagItem, Character entities
  ├── SkillTreeModule    → SkillAllocation, Character, Player entities
  ├── EndgameModule      → Character entity, LootModule
  ├── GameDataModule     → Redis (cache)
  ├── RewardsModule      → DailyReward, Player entities, Redis
  ├── MigrationModule    → Player, Character, BagItem entities
  ├── DatabaseModule     → TypeORM PostgreSQL connection
  └── RedisModule        → ioredis (global)
```

## Data Flow

```
Client (Telegram WebApp)
  │
  ├── POST /auth/telegram {initData}     → JWT tokens
  │
  ├── GET  /player                        → Full game state
  ├── GET  /characters                    → Character list
  ├── POST /characters {nickname, classId}→ New character
  │
  ├── POST /combat/tap {sessionId}        → Server calculates damage
  ├── POST /combat/complete {sessionId}   → Awards gold/xp/drops
  │
  ├── GET  /skill-tree?characterId=       → Tree + allocations
  ├── POST /skill-tree/allocate           → Validate + save node
  │
  ├── GET  /game-data/balance             → Balance constants
  ├── GET  /game-data/version             → Version check
  │
  ├── GET  /rewards/daily                 → Daily reward info
  ├── POST /rewards/daily/claim           → Claim reward
  │
  └── POST /migration/import-local        → Import localStorage
```
