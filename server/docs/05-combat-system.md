# Server-Authoritative Combat

## Design Principle

The server is the sole authority for all combat math. The client is a rendering layer only.

**Client NEVER sends**: damage values, gold earned, XP gained, monster HP.
**Client ONLY sends**: `sessionId` + the fact that a tap happened.

## Combat Session Flow

```
1. Client: POST /combat/tap {sessionId}
   └── no damage/hp values sent

2. Server:
   ├── Load session from Redis
   ├── Load character stats from PostgreSQL
   ├── Roll crit (Math.random() < critChance)
   ├── Calculate damage = tapDamage * (isCrit ? critMultiplier : 1)
   ├── Apply to monster: monster.currentHp -= damage
   ├── If killed: add gold/xp rewards, advance queue
   ├── Save session to Redis
   └── Return: {damage, isCrit, monsterHp, killed, isComplete}

3. Client: renders the result (damage number, HP bar, death anim)
```

## Session Lifecycle

```
startLocation/startMap
  │
  ├── Create monster queue (server-side generation)
  ├── Store in Redis (TTL 30min)
  └── Return sessionId + first monster
        │
        ▼
  ┌─── tap / passive-tick (repeat) ───┐
  │                                     │
  │  Each tap:                          │
  │  - Rate limit check (50ms min)      │
  │  - Read char stats from DB          │
  │  - Calculate damage server-side     │
  │  - Update monster HP in Redis       │
  │  - Check if monster/session done    │
  │                                     │
  └─────────────────────────────────────┘
        │
        ▼ (all monsters killed)
  complete
  │
  ├── Award gold to Player (DB)
  ├── Award XP to Character (DB)
  ├── Check level-ups
  ├── Roll drops (server-side RNG)
  ├── Save audit to combat_sessions table
  └── Delete session from Redis
```

## Anti-Cheat Measures

1. **Tap rate limiting**: Max 20 taps/sec (50ms minimum interval)
2. **Server-side stats**: Damage from DB, not from client
3. **Session timeout**: Auto-expire after 30min inactive
4. **Audit trail**: All completed sessions saved to PostgreSQL
5. **No client-side rewards**: Gold/XP only applied in completeSession

## Redis Session Structure

Key: `combat:session:{uuid}`
TTL: 1800 seconds (30 minutes)

```json
{
  "id": "uuid",
  "playerId": "123456789",
  "characterId": "char_xxx",
  "mode": "location",
  "monsterQueue": [
    {"name": "Bandit", "maxHp": 15, "currentHp": 15, "goldReward": 3, "xpReward": 5},
    {"name": "Oni", "maxHp": 40, "currentHp": 40, "goldReward": 10, "xpReward": 14}
  ],
  "currentIndex": 0,
  "totalGoldEarned": 0,
  "totalXpEarned": 0,
  "totalTaps": 0,
  "lastTapTime": 1706000000000,
  "startedAt": 1706000000000
}
```
