# 08 — Combat Flow (full combat cycle)

> Description of the entire combat system: client (bot), server (NestJS + Redis),
> WebSocket events, animations, timings.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Socket connection](#2-socket-connection)
3. [Combat start](#3-combat-start)
4. [Loading Run → Combat Ready](#4-loading-run--combat-ready)
5. [Entrance (monster appearance)](#5-entrance-monster-appearance)
6. [Server Combat Loop](#6-server-combat-loop)
7. [Player tap (attack)](#7-player-tap-attack)
8. [Monster death → Next monster](#8-monster-death--next-monster)
9. [Combat completion (Complete)](#9-combat-completion-complete)
10. [Player death](#10-player-death)
11. [Flee](#11-flee)
12. [Disconnect / Reconnect](#12-disconnect--reconnect)
13. [Monster attack system](#13-monster-attack-system)
14. [Elemental damage](#14-elemental-damage)
15. [Animations and rendering](#15-animations-and-rendering)
16. [Socket Events — full list](#16-socket-events--full-list)
17. [Key timings](#17-key-timings)
18. [Redis session (structure)](#18-redis-session-structure)
19. [Timeline diagrams](#19-timeline-diagrams)

---

## 1. Architecture

```
┌──────────────┐  Socket.IO /combat   ┌──────────────────┐
│   Bot (Vite) │ ◄──────────────────► │  Server (NestJS) │
│              │                       │                  │
│ combat.ts    │                       │ combat.gateway   │
│ battle-scene │                       │ combat.service   │
│ characters/* │                       │ level-gen        │
│              │                       │ elemental-damage │
└──────────────┘                       └────────┬─────────┘
                                                │
                                       ┌────────▼─────────┐
                                       │   Redis (ioredis) │
                                       │  combat:session:* │
                                       │  TTL = 30 min     │
                                       └──────────────────┘
```

**Key principle**: the server is authoritative. All damage (from both player and monster)
is calculated on the server. The client is a thin visualization layer.

### Files

| Role | Path |
|------|------|
| Client: combat manager | `bot/src/game/combat.ts` |
| Client: scene + sprites | `bot/src/ui/battle-scene.ts` |
| Client: hero | `bot/src/ui/characters/hero-character.ts` |
| Client: enemy | `bot/src/ui/characters/enemy-character.ts` |
| Client: base character | `bot/src/ui/characters/character.ts` |
| Client: socket connection | `bot/src/combat-socket.ts` |
| Server: gateway (WS) | `server/src/combat/combat.gateway.ts` |
| Server: service (logic) | `server/src/combat/combat.service.ts` |
| Server: elemental damage | `server/src/combat/elemental-damage.ts` |
| Server: monster generation | `server/src/level-gen/level-gen.service.ts` |
| Shared: balance | `shared/balance.ts` |
| Shared: monster attacks | `shared/monster-attacks.ts` |
| Shared: class stats | `shared/class-stats.ts` |

---

## 2. Socket connection

**File**: `bot/src/combat-socket.ts`

```
getSocket() → io(WS_URL/combat, { auth: { token: JWT }, transports: ["polling","websocket"] })
waitForConnection(socket, 8000ms) → Promise<void>
```

- Singleton socket — reused between combats
- `transports: ["polling", "websocket"]` + `upgrade: true`
- Reconnect: 5 attempts with 500ms delay
- Connection timeout: 5000ms

**Server (auth)**: `combat.gateway.ts` → `handleConnection()`
- Extracts JWT from `client.handshake.auth.token`
- Verifies: `payload.type === 'access'`
- Maps: `socketId ↔ telegramId`
- Disconnects on authorization error

---

## 3. Combat start

### Client → Server

```
socket.emit("combat:start-location", {
  locationId, waves, order, act
})
```

or for a map:

```
socket.emit("combat:start-map", {
  mapKeyItemId, direction?
})
```

### Server (combat.service.ts → startLocation / startMapByDto)

1. Stale session cleanup (`cleanupStaleSession`)
2. Location access validation (prerequisite)
3. Monster queue generation: `levelGen.buildMonsterQueue(waves, order, act)`
4. Redis session creation (see [structure](#18-redis-session-structure))
5. `lastEnemyAttackTime = Date.now()`
6. `nextAttackIn = getFirstAttackDelay(queue[0])`
7. Save to Redis (TTL = 1800s = 30 min)

### Server → Client

```
socket.emit("combat:started", {
  sessionId,
  totalMonsters,
  currentMonster,    // first monster
  playerHp,
  playerMaxHp,
})
```

**Important**: combat loop does NOT start here. It starts only after `combat:entrance-done`.

### Client (combat.ts → startLocation callback)

1. Saves `_sessionId`, `_totalMonsters`, `_playerHp`
2. Emits `"playerHpChanged"` → UI updates HP bar
3. Emits `"locationWaveProgress"` → `{ current: 0, total }`
4. Emits `"combatReady"` → battle-scene calls `stopLoadingRun()`
5. Calls `_setMonsterFromServer(result.currentMonster)` → emits `"monsterSpawned"`

---

## 4. Loading Run → Combat Ready

### Loading Run (before server connection)

**File**: `battle-scene.ts`

While WebSocket connects and server creates session, the hero runs:

- `_loadingRunActive = true` (on BattleScene creation)
- Hero plays `"run"` animation
- Enemy is hidden (`_visible = false`)
- Background scrolls forward: 120 px/s
- "Loading..." text with animated dots
- Auto-stop after 10 seconds

### Combat Ready

When `"combat:started"` arrives:
1. `"combatReady"` is emitted
2. `stopLoadingRun()`:
   - `_loadingRunActive = false`
   - Hero → `play("idle")`
   - Enemy → `resetState()`
   - Camera → `snapCamera(0)`

---

## 5. Entrance (monster appearance)

### Trigger

Event `"monsterSpawned"` → `_onMonsterSpawned()`:

1. Updates monster name + rarity
2. Updates HP bar
3. Shows monster-info
4. **If sprites are loaded**: `enemy.spawn()` + `_startEntrance()`
5. **If no sprites**: immediately `emit("entranceDone")`

### Entrance animation

**Enemy (enemy-character.ts → spawn)**:
- Position reset
- Slide from right edge: offset=400px, speed=700 px/s
- Slide duration: `400 / 700 ≈ 571ms`
- Animation: `"idle"` (plays while sliding)

**Hero (battle-scene.ts → _startEntrance)**:
- `hero.runEntrance()` → `"run"` animation
- Camera pans by wave progress

**Choreography duration**: `_entranceDuration = 1.2s`

Entrance completes when: `elapsed >= 1.2s` **AND** camera has stopped panning.

### Entrance cancellation by tap

If the player taps during entrance:
1. `_entranceActive = false`
2. Camera snaps to target position
3. Immediately emits `"entranceDone"`

### entranceDone → Server

```
Client: events.emit("entranceDone")
  → combat.ts: signalEntranceDone()
    → socket.emit("combat:entrance-done", { sessionId })
```

**Server (handleEntranceDone)**:
1. Checks `combatLoops.has(sessionId)` — if loop is already running, ignores
2. Resets `session.lastEnemyAttackTime = Date.now()`
3. Starts `startCombatLoop(sessionId, telegramId)`

**This means**: the first monster attack will happen `nextAttackIn` ms
after entrance ends (typically ~1000ms).

---

## 6. Server Combat Loop

**File**: `combat.gateway.ts → startCombatLoop()`

```
setInterval(async () => {
  result = combatService.processEnemyTick(sessionId)
  if (result.attacks.length > 0) → emit "combat:enemy-attack"
  if (result.playerDead) → stopLoop + emit "combat:player-died"
}, 200)  // 200ms tick = 5 ticks/sec
```

### processEnemyTick (combat.service.ts)

1. Loads session from Redis
2. Loads Character from PostgreSQL (for dodge/block/resistance)
3. Calls `processEnemyAttacks(session, char, Date.now())`
4. Saves session back to Redis
5. Returns array of attacks + current player HP

### processEnemyAttacks — timeBank system

```
elapsed = now - lastEnemyAttackTime
timeBank = elapsed

while (timeBank >= nextAttackIn && attackCount < MAX_PENDING_ATTACKS) {
  timeBank -= nextAttackIn

  1. Pick attack from pool (pickRandomAttack by weights)
  2. Dodge check (Math.random() < char.dodgeChance)
  3. Block check (Warrior special: Math.random() < char.specialValue)
  4. Calculate damage (elemental system)
  5. Apply damage: session.playerCurrentHp -= damage
  6. Calculate nextAttackIn for the next attack
}

lastEnemyAttackTime = now - timeBank  // save remainder
```

**MAX_PENDING_ATTACKS = 10** — anti-AFK cap (no more than 10 attacks per tick).

---

## 7. Player tap (attack)

### Client (combat.ts → handleTap)

Guard conditions:
- `_deathCooldown` — between monster death and new spawn
- `!monster` — no current monster
- `!_sessionId` — no session
- `_tapping` — previous tap not yet processed
- `!_socket` — no connection

```
socket.emit("combat:tap", { sessionId })
```

Fallback: `_tapping` resets after 2000ms if no response.

### Server (handleTap → processTap)

1. **Rate limit**: min 50ms between taps (MIN_TAP_INTERVAL_MS)
2. Load Character from DB (server-authoritative)
3. **Crit**: `Math.random() < char.critChance` → `rawDamage *= critMultiplier`
4. **Elemental damage**: `computeElementalDamage(rawDamage, damageProfile, monsterResistance)`
5. `monster.currentHp -= breakdown.total`
6. If `currentHp <= 0`:
   - `killed = true`
   - Gold credited to session (session.totalGoldEarned)
   - **XP is credited immediately to Character** (level-scaling, level up inline)
   - `char.xp += scaledXp` → while loop level up → `charRepo.save(char)`
   - `currentIndex++`
   - `lastEnemyAttackTime = now` (reset for new monster)
   - `nextAttackIn = getFirstAttackDelay(nextMonster)`
7. Save session to Redis

### Server → Client

```
socket.emit("combat:tap-result", {
  damage, damageBreakdown, isCrit,
  monsterHp, monsterMaxHp,
  killed, isComplete,
  currentMonster,       // next monster (if killed)
  monstersRemaining,
  playerHp, playerMaxHp, playerDead,
  // Per-kill XP (only when killed=true):
  xpGained,             // how much XP gained for this monster
  leveledUp,            // true if level up occurred
  level, xp, xpToNext,  // current values after crediting
})
```

### Gateway after tap-result

```
if (playerDead)     → stopCombatLoop + emit "combat:player-died"
if (killed && !isComplete) → stopCombatLoop  // ← pause until entrance-done
```

### Client after tap-result

1. `_tapping = false`
2. `monster.currentHp = result.monsterHp`
3. Emit `"damage"` → battle-scene: hero attack anim + enemy shake + HP bar update
4. Emit `"playerHpChanged"` → UI updates player HP
5. If `killed`:
   - Updates local char (level, xp, xpToNext) from server response
   - → `_onMonsterDeath(result)`

---

## 8. Monster death → Next monster

### Client (_onMonsterDeath)

```
1. _deathCooldown = true         // block taps
2. _monstersKilled++
3. emit "monsterDied"            // → battle-scene: enemy.die() + gold floater
4. emit "xpGained" { xp }       // → effects: purple "+N XP" floater
                                 // → combat-log: purple entry "+N XP"
5. if (leveledUp):
     emit "levelUp" { level }    // → effects: "LEVEL N!" announce
                                 // → HUD: update Lv.N
6. emit "xpChanged" { xp, xpToNext }  // → HUD: update XP bar
7. emit "locationWaveProgress"

8. setTimeout(SPAWN_DELAY_MS) {  // 1200ms
     if (isComplete) {
       complete()                // finish combat → gold + loot
     } else {
       _setMonsterFromServer()   // spawn new
       _deathCooldown = false    // unblock taps
     }
   }
```

### Enemy death animation

```
enemy.die():
  1. Plays "death" animation
  2. onComplete → startDeath():
     - _deathAlpha decreases: dt * 2.5 (≈ 400ms to full fade)
     - When alpha = 0 → _visible = false
```

### Server (on handleTap)

When `result.killed && !result.isComplete`:
- **stopCombatLoop(sessionId)** — attack loop stops
- Waits for `combat:entrance-done` from client

### Monster transition timeline

```
T=0ms     Last tap kills the monster
          Server: stopCombatLoop()
          Client: emit "monsterDied" → death animation

T=0-400ms Enemy death animation (death anim + fade)

T=1200ms  Client: _setMonsterFromServer() → emit "monsterSpawned"
          → _onMonsterSpawned() → enemy.spawn() + _startEntrance()
          _deathCooldown = false (can tap!)

T=1200ms+ New monster entrance (slide: ~571ms, choreography: 1200ms)
          Player CAN tap the monster during entrance

T=2400ms  Entrance completes (1200ms choreography)
          emit "entranceDone" → server: startCombatLoop()
          lastEnemyAttackTime = Date.now()

T=3400ms  First attack of new monster (≈1000ms after entrance)
```

**Total**: ~2 seconds from death to new monster's first attack
(1200ms spawn delay + 1200ms entrance). Matches the requirement
of "2 seconds after previous death".

---

## 9. Combat completion (Complete)

### Client

```
socket.emit("combat:complete", { sessionId })
// waiting for "combat:completed" (timeout 10s)
```

### Server (completeSession)

1. `stopCombatLoop(sessionId)`
2. Check: all monsters killed (`currentIndex >= monsterQueue.length`)
3. **Gold → `PlayerLeague.gold`** (per-league pool, credited ONLY here)
4. **XP already credited per-kill** in `processTap()` — NOT duplicated
5. **Meta stats** → Player (`totalGold, totalKills, totalTaps`)
6. **Location completion** → `char.completedLocations`
7. **Map drops** (for endgame maps): `lootService.rollMapDrops()`
8. **Audit record** → PostgreSQL (`CombatSession` entity, status='completed')
9. **Cleanup Redis**: delete session

### Server → Client

```
socket.emit("combat:completed", {
  totalGold, totalXp,
  totalTaps, monstersKilled,
  level, xp, xpToNext, gold,
  mapDrops, locationId,
  dailyBonusRemaining,
})
```

---

## 10. Player death

### Trigger

Server combat loop detects `playerCurrentHp <= 0`:

```
gateway: stopCombatLoop() → combatService.playerDeath() → emit "combat:player-died"
```

Or tap-result with `playerDead = true`:

```
gateway: stopCombatLoop() → playerDeath() → emit "combat:player-died"
```

### playerDeath (combat.service.ts)

1. Saves audit record: `status = 'died'`, `monstersKilled = currentIndex`
2. Deletes Redis session
3. **Gold lost** — not written to DB (was only in Redis session)
4. **Loot lost** — drops are not rolled
5. **XP preserved** — already credited per-kill in `processTap()`
6. **XP Loss** — XP penalty on death (lvl 40+, see [02-rewards-after-map.md](./02-rewards-after-map.md))

### Client

```
_onPlayerDeath():
  _playerDead = true (guard against double-fire)
  emit "playerDied" → battle-scene: hero death animation
  _sessionId = null
```

---

## 11. Flee

```
Client: socket.emit("combat:flee", { sessionId })
Server: stopCombatLoop() → fleeCombat() → delete Redis → emit "combat:fled"
```

**Gold lost, loot lost. XP preserved** (already credited per-kill).
**XP Loss is NOT applied** — penalty only on death.

---

## 12. Disconnect / Reconnect

### Disconnect (gateway → handleDisconnect)

1. `stopCombatLoop(sessionId)` — pause attacks
2. Start grace timer: **30 000ms** (30 seconds)
3. If timer expires → `fleeCombat()` (combat lost)

### Reconnect (gateway → handleReconnect)

1. Cancel grace timer
2. `session.lastEnemyAttackTime = Date.now()` — **forgiveness** for missed attacks
3. `startCombatLoop()` — resume
4. Send current state to client:

```
socket.emit("combat:reconnected", {
  sessionId, currentMonster,
  playerHp, playerMaxHp,
  monstersRemaining, totalMonsters,
})
```

### Client (auto-reconnect)

```
socket.on("connect", () => {
  if (_sessionId) socket.emit("combat:reconnect", { sessionId })
})
```

Socket.IO automatically attempts 5 times with 500ms delay.

---

## 13. Monster attack system

### Attack Pool

Each monster type has 5 attacks (`shared/monster-attacks.ts`):

```typescript
interface MonsterAttack {
  name: string;           // "Slash", "Fire Breath"
  damage: ElementalDamage; // { physical: 0.8, fire: 0.2 }
  damageMul: number;       // 0.3 — 2.5 (multiplier to scaledDamage)
  speed: number;           // 0.3 — 3.0 seconds (charge-up time)
  pauseAfter: number;      // 0.2 — 2.0 seconds (pause after hit)
  weight: number;          // 5 — 40 (weight for random selection)
}
```

### Attack selection (pickRandomAttack)

Weighted random:
```
totalWeight = sum(attack.weight)
roll = random() * totalWeight
iterate attacks: roll -= weight → if roll <= 0, selected
```

### nextAttackIn calculation

```
nextAttackIn = (current_attack.pauseAfter + next_attack.speed) * 1000 ms
```

Example: `pauseAfter=0.5s`, `nextSpeed=1.0s` → `nextAttackIn = 1500ms`

### First attack (getFirstAttackDelay)

```
avg = average(speed of all attacks in pool) * 1000
```

Fallback (no attacks in pool): `ENEMY_ATTACK_INTERVAL_MS = 1000ms`

### Dodge / Block

- **Dodge**: `Math.random() < char.dodgeChance` → 0 damage, `nextAttackIn` reduced
- **Block** (Warrior special): `Math.random() < char.specialValue` → 0 damage

On dodge/block: `nextAttackIn = (pauseAfter + 0.3) * 1000` (quick re-attack)

---

## 14. Elemental damage

**File**: `server/src/combat/elemental-damage.ts`

### Elements

| Element | Description |
|---------|------------|
| physical | Base physical |
| fire | Fire |
| lightning | Lightning |
| cold | Cold/ice |
| pure | Pure (ignores resistances) |

### Formula

```
For each element:
  rawElemDmg = rawDamage * fraction

  if pure:
    finalDmg = floor(rawElemDmg)
  else:
    finalDmg = floor(rawElemDmg * (1 - resistance * 0.01))

total = sum(all elements)
Minimum 1 damage if rawDamage > 0
```

### Resistance cap

`RESISTANCE_CAP = 0.75` (75%) — no element can be resisted more than 75%.

### Rarity resistance bonus

| Rarity | Bonus to all resistances |
|--------|--------------------------|
| common | +0% |
| rare | +5% |
| epic | +10% |
| boss | +15% |

---

## 15. Animations and rendering

### Render Loop (battle-scene.ts)

- **Tick**: `setTimeout` every **80ms** (~12.5 FPS)
- **Delta time**: `dt = (now - lastTime) / 1000`, cap 0.2s
- **Draw order**: background → hero → enemy

### Character animations

| Animation | Description | Duration |
|-----------|------------|----------|
| idle | Idle | loop |
| run | Running (entrance) | loop |
| attack1 | Attack | one-shot → idle |
| death | Death | one-shot → fade |

### Effects

| Effect | Description | Timing |
|--------|------------|--------|
| Enemy slide-in | Enter from right | 400px / 700px/s ≈ 571ms |
| Enemy shake | On taking damage | decay: 80 px/s |
| Hero shake | On taking damage | shake(4) |
| Death fade | Opacity → 0 | dt * 2.5 ≈ 400ms |
| Entrance choreography | Hero run + camera pan | 1200ms |

### Monster HP bar

```
_updateHp(monster):
  pct = (currentHp / maxHp) * 100
  hpBarFill.style.width = pct%
  hpText = "currentHp / maxHp"
```

Styled by rarity: `hp-rarity-{common|rare|epic|boss}`

### Player HP bar

```
_updatePlayerHp(hp, maxHp):
  #player-hp-fill.width = (hp/maxHp * 100)%
  #player-hp-text = "hp / maxHp"
```

---

## 16. Socket Events — full list

### Client → Server

| Event | Data | When |
|-------|------|------|
| `combat:start-location` | `{locationId, waves, order, act}` | Combat start (location) |
| `combat:start-map` | `{mapKeyItemId, direction?}` | Combat start (map) |
| `combat:tap` | `{sessionId}` | Tap on monster |
| `combat:entrance-done` | `{sessionId}` | Monster entrance finished |
| `combat:complete` | `{sessionId}` | Complete and receive rewards |
| `combat:flee` | `{sessionId}` | Flee without rewards |
| `combat:reconnect` | `{sessionId}` | Restore session |

### Server → Client

| Event | Data | When |
|-------|------|------|
| `combat:started` | `{sessionId, totalMonsters, currentMonster, playerHp, playerMaxHp}` | Combat created |
| `combat:tap-result` | `{damage, isCrit, monsterHp, killed, isComplete, currentMonster, playerHp, xpGained, leveledUp, level, xp, xpToNext, ...}` | Tap result (xp per-kill) |
| `combat:enemy-attack` | `{attacks[], playerHp, playerMaxHp, playerDead}` | Enemy attacks (every ~200ms tick) |
| `combat:player-died` | `{sessionId}` | Player died |
| `combat:completed` | `{totalGold, totalXp, level, xp, xpToNext, gold, mapDrops, dailyBonusRemaining}` | Combat complete, gold + loot |
| `combat:fled` | `{success}` | Flee confirmed |
| `combat:reconnected` | `{sessionId, currentMonster, playerHp, ...}` | Session restored |
| `combat:error` | `{message}` | Error |

---

## 17. Key timings

| Parameter | Value | File |
|-----------|-------|------|
| Socket connect timeout | 5000ms | combat-socket.ts |
| waitForConnection timeout | 8000ms | combat-socket.ts |
| Start location/map timeout | 10000ms | combat.ts |
| Complete session timeout | 10000ms | combat.ts |
| Flee timeout | 5000ms | combat.ts |
| **Server combat loop tick** | **200ms** | combat.gateway.ts |
| **ENEMY_ATTACK_INTERVAL_MS** (fallback) | **1000ms** | balance.ts |
| **SPAWN_DELAY_MS** | **1200ms** | balance.ts |
| **Entrance duration** | **1200ms** | battle-scene.ts |
| Enemy slide-in | ~571ms (400px / 700px/s) | enemy-character.ts |
| Death fade | ~400ms (alpha * 2.5/s) | character.ts |
| Render tick | 80ms (~12.5 FPS) | battle-scene.ts |
| Tap rate limit | 50ms min | combat.service.ts |
| Disconnect grace period | 30000ms | combat.gateway.ts |
| Socket reconnect delay | 500ms | combat-socket.ts |
| Redis session TTL | 1800s (30 min) | combat.service.ts |
| MAX_PENDING_ATTACKS | 10 | balance.ts |
| Loading run auto-stop | 10s | battle-scene.ts |
| Loading bg scroll speed | 120 px/s | battle-scene.ts |

---

## 18. Redis session (structure)

**Key**: `combat:session:{uuid}`
**TTL**: 1800 seconds (30 minutes)

```typescript
interface RedisCombatSession {
  id: string;                    // UUID v4
  playerId: string;              // telegramId
  characterId: string;           // Character entity ID
  leagueId: string;
  playerLeagueId: string;
  mode: 'location' | 'map' | 'boss_map';

  monsterQueue: ServerMonster[]; // full monster queue
  currentIndex: number;          // index of current monster (0-based)

  totalGoldEarned: number;       // accumulated gold for the combat
  totalXpEarned: number;         // accumulated XP for the combat
  totalTaps: number;             // number of taps
  lastTapTime: number;           // timestamp of last tap (rate limit)
  startedAt: number;             // combat start timestamp

  locationId?: string;           // location ID
  mapTier?: number;              // map level (endgame)
  bossId?: string;               // boss ID
  direction?: string;            // map direction

  playerLevel: number;           // player level at start (for XP scaling)
  playerCurrentHp: number;       // current player HP
  playerMaxHp: number;           // maximum player HP
  lastEnemyAttackTime: number;   // timestamp of last attack processing
  nextAttackIn: number;          // ms until next monster attack
}
```

---

## 19. Timeline diagrams

### Full combat (2 monsters)

```
Client                              Server                    Redis
  │                                    │                         │
  ├─ emit "start-location" ──────────►│                         │
  │                                    ├─ buildMonsterQueue()   │
  │                                    ├─ create session ──────►│ SET
  │                                    │                         │
  │◄── "combat:started" ──────────────┤                         │
  │                                    │                         │
  ├─ stopLoadingRun()                  │                         │
  ├─ _setMonsterFromServer()           │                         │
  ├─ enemy.spawn() + _startEntrance()  │                         │
  │                                    │                         │
  │  ~~~ entrance animation (1.2s) ~~~ │                         │
  │  (player can tap!)                 │                         │
  │                                    │                         │
  ├─ emit "entrance-done" ───────────►│                         │
  │                                    ├─ lastEnemyAttackTime=now│
  │                                    ├─ startCombatLoop() ────│─► GET/SET
  │                                    │  (200ms interval)       │
  │                                    │                         │
  │  ~~~ combat: taps + enemy attacks ~│                         │
  │                                    │                         │
  ├─ emit "tap" ─────────────────────►│                         │
  │                                    ├─ processTap()          │
  │◄── "tap-result" {killed:true} ────┤                         │
  │                                    ├─ stopCombatLoop() ◄────│
  │                                    │  (pause!)              │
  ├─ emit "monsterDied"                │                         │
  │                                    │                         │
  │  ~~~ SPAWN_DELAY (1200ms) ~~~~~~~~ │                         │
  │                                    │                         │
  ├─ _setMonsterFromServer(next)       │                         │
  ├─ enemy.spawn() + _startEntrance()  │                         │
  │                                    │                         │
  │  ~~~ entrance animation (1.2s) ~~~ │                         │
  │                                    │                         │
  ├─ emit "entrance-done" ───────────►│                         │
  │                                    ├─ lastEnemyAttackTime=now│
  │                                    ├─ startCombatLoop() ────│─► GET/SET
  │                                    │                         │
  │  ~~~ combat: taps + enemy attacks ~│                         │
  │                                    │                         │
  ├─ emit "tap" {killed, isComplete}──►│                         │
  │                                    ├─ XP → char (per-kill)   │
  │                                    ├─ charRepo.save()        │
  │◄── "tap-result" {xpGained,level}──┤                         │
  │                                    ├─ stopCombatLoop()       │
  ├─ "+N XP" floater (purple)         │                         │
  │                                    │                         │
  │  ~~~ SPAWN_DELAY (1200ms) ~~~~~~~~ │                         │
  │                                    │                         │
  ├─ emit "complete" ────────────────►│                         │
  │                                    ├─ award gold (only)      │
  │                                    ├─ save audit ───────────►│ DEL
  │◄── "combat:completed" ────────────┤                         │
  │                                    │                         │
```

### Disconnect / Reconnect

```
Client                              Server
  │                                    │
  X  (connection lost)                 │
  │                                    ├─ handleDisconnect()
  │                                    ├─ stopCombatLoop()
  │                                    ├─ start 30s grace timer
  │                                    │
  │  ~~~ up to 30 seconds ~~~~~~~~~~~~ │
  │                                    │
  ├─ (reconnected) ──────────────────►│
  ├─ emit "reconnect" ──────────────►│
  │                                    ├─ cancel grace timer
  │                                    ├─ lastEnemyAttackTime = now (forgive)
  │                                    ├─ startCombatLoop()
  │◄── "combat:reconnected" ──────────┤
  │                                    │
```
