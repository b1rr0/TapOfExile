# Server-Authoritative Combat

## Design Principle

The server is the sole authority for all combat math. The client is a rendering layer only.

**Client NEVER sends**: damage values, gold earned, XP gained, monster HP.
**Client ONLY sends**: `sessionId` + the fact that a tap happened (via WebSocket).

## Architecture

Combat uses **Socket.IO WebSocket** (namespace `/combat`) instead of REST endpoints.

```
combat.gateway.ts  — WebSocket event handlers, combat loop management
combat.service.ts  — All damage/reward calculations
elemental-damage.ts — Elemental damage breakdown
```

### In-Memory State (Gateway)

```
combatLoops     — sessionId → setInterval ID (200ms tick)
disconnectTimers — telegramId → setTimeout ID (30s grace)
socketUsers     — socketId → telegramId
userSockets     — telegramId → socketId
userSessions    — telegramId → sessionId
```

## Combat Session Flow

```
1. Client: emit "combat:tap" {sessionId}
   └── no damage/hp values sent

2. Server:
   ├── Load session from Redis
   ├── Load character stats from PostgreSQL
   ├── Roll crit (Math.random() < critChance)
   ├── Calculate damage = tapDamage * (isCrit ? critMultiplier : 1)
   ├── Apply elemental damage split (computeElementalDamage)
   ├── Subtract from monster: monster.currentHp -= breakdown.total
   ├── If killed: add gold/xp rewards, advance queue
   ├── Save session to Redis
   └── Emit: "combat:tap-result" {damage, isCrit, monsterHp, killed, ...}

3. Client: renders the result (damage number, HP bar, death anim)
```

## Session Lifecycle

```
combat:start-location / combat:start-map
  │
  ├── Validate access (location prereqs / consume map key)
  ├── Create monster queue (server-side generation)
  ├── Store in Redis (TTL 30min)
  └── Emit "combat:started" with sessionId + first monster
        │
combat:entrance-done (client signals animation complete)
  │
  ├── Start combat loop (200ms setInterval)
  └── Begin enemy attacks via processEnemyTick()
        │
        ▼
  ┌─── combat:tap (repeat) ─────────────┐
  │                                       │
  │  Each tap:                            │
  │  - Rate limit check (50ms min)        │
  │  - Read char stats from DB            │
  │  - Calculate elemental damage         │
  │  - Update monster HP in Redis         │
  │  - If killed: stop loop, wait for     │
  │    entrance-done before resuming      │
  │                                       │
  └───────────────────────────────────────┘
        │
        ▼ (all monsters killed)
  combat:complete
  │
  ├── Award gold to PlayerLeague (per-league)
  ├── Award XP to Character (with daily bonus)
  ├── Update Player meta stats (lifetime)
  ├── Check level-ups (statsAtLevel recalculation)
  ├── Roll drops (server-side RNG) → BagItem
  ├── Save audit to combat_sessions table
  ├── Delete session from Redis
  └── Emit "combat:completed" with rewards
```

## Enemy Attack System

Server-driven combat loop (200ms tick):

```
setInterval(async () => {
  result = combatService.processEnemyTick(sessionId)
  if (result.attacks.length > 0) → emit "combat:enemy-attack"
  if (result.playerDead) → stopLoop + emit "combat:player-died"
}, 200)
```

### TimeBank System

```
elapsed = now - lastEnemyAttackTime
timeBank = elapsed

while (timeBank >= nextAttackIn && attackCount < MAX_PENDING_ATTACKS) {
  timeBank -= nextAttackIn
  1. pickRandomAttack (weighted random)
  2. Dodge check (Math.random() < dodgeChance)
  3. Block check (Warrior: Math.random() < specialValue)
  4. Elemental damage calculation
  5. playerCurrentHp -= damage
  6. Calculate nextAttackIn for next attack
}

lastEnemyAttackTime = now - timeBank  // preserve remainder
```

## Disconnect / Reconnect

- **Disconnect**: Stop combat loop, start 30s grace timer
- **Grace timeout**: Auto-flee (session lost, no rewards)
- **Reconnect**: Cancel timer, forgive missed attacks (`lastEnemyAttackTime = now`), resume loop

## Anti-Cheat Measures

1. **Tap rate limiting**: Min 50ms between taps
2. **Server-side stats**: Damage from DB, not from client
3. **Session timeout**: Auto-expire after 30min (Redis TTL)
4. **Session ownership**: telegramId check on every action
5. **Audit trail**: All sessions saved to PostgreSQL
6. **No client-side rewards**: Gold/XP only applied in completeSession
7. **MAX_PENDING_ATTACKS = 10**: Cap accumulated attacks per tick

## Redis Session Structure

Key: `combat:session:{uuid}`
TTL: 1800 seconds (30 minutes)

```typescript
interface RedisCombatSession {
  id: string;                    // UUID v4
  playerId: string;              // telegramId
  characterId: string;
  leagueId: string;
  playerLeagueId: string;
  mode: 'location' | 'map' | 'boss_map';
  monsterQueue: ServerMonster[];
  currentIndex: number;
  totalGoldEarned: number;
  totalXpEarned: number;
  totalTaps: number;
  lastTapTime: number;
  startedAt: number;
  locationId?: string;
  mapTier?: number;
  bossId?: string;
  direction?: string;
  playerLevel: number;
  playerCurrentHp: number;
  playerMaxHp: number;
  lastEnemyAttackTime: number;
  nextAttackIn: number;
}
```
