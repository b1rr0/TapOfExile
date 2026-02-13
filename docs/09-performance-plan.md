# Performance Improvement Plan

## Overview

Analysis of the codebase identified performance bottlenecks across backend (combat hot path, DB queries, Redis serialization) and frontend (rendering loop, SVG skill tree, memory management). Issues are prioritized by impact and grouped into phases.

---

## Phase 1: Critical — Combat Hot Path (Server)

### 1.1 DB Query in Every Enemy Tick

**Problem**: `processEnemyTick()` (`combat.service.ts:531-534`) runs a PostgreSQL `findOne` to load character stats every 200ms per active session. At 50 concurrent sessions this produces 250 QPS of identical reads.

**Fix**: Cache character stats in the Redis session at combat start. Character stats don't change mid-combat (skill tree and equipment are locked during combat).

```
// In startCombat(), after loading character:
session.cachedStats = {
  tapDamage: char.tapDamage,
  critChance: char.critChance,
  critMultiplier: char.critMultiplier,
  dodgeChance: char.dodgeChance,
  specialValue: char.specialValue,
  elementalDamage: char.elementalDamage,
  resistance: char.resistance,
  maxHp: char.maxHp,
};
```

Then use `session.cachedStats` in `processEnemyTick()` and `processTap()` instead of querying the DB.

**Impact**: Eliminates ~100% of PostgreSQL reads during combat. From potentially thousands of QPS → 0 during active sessions.

### 1.2 Duplicate Character Lookup in processTap()

**Problem**: `processTap()` (`combat.service.ts:586-589`) also does `charRepo.findOne()` on every tap. Players tap 5-10 times/sec, so this is another 250-500 QPS per 50 sessions.

**Fix**: Same as 1.1 — use `session.cachedStats` from Redis.

### 1.3 Full Session JSON Serialization Every 200ms

**Problem**: `this.redis.setJson(sessionKey, session, TTL)` (`combat.service.ts:539`) serializes the entire session (including `monsterQueue` with all monsters) on every enemy tick.

**Fix**:
- Store `monsterQueue` separately in Redis (`combat:monsters:{sessionId}`) at combat start — it changes rarely (only on monster kill).
- The main session key stores only mutable state (currentIndex, playerHp, lastEnemyAttackTime, etc.).
- Only write `monsterQueue` key when `currentIndex` changes.

**Impact**: Reduces serialization payload from ~2-5KB to ~200 bytes per tick.

---

## Phase 2: High — Memory & Query Efficiency

### 2.1 Unbounded Maps in Gateway

**Problem**: `combat.gateway.ts:29-37` has 5 `Map` instances (`combatLoops`, `disconnectTimers`, `socketUsers`, `userSockets`, `userSessions`) that only clean up on disconnect or session end. Edge cases (server restart without clean disconnect, crashed sessions) could leak entries.

**Fix**:
- Add periodic cleanup sweep (every 5 min): iterate maps, check if session still exists in Redis.
- Add `onModuleDestroy()` lifecycle hook to clear all intervals and timeouts.
- Log map sizes periodically for monitoring.

```typescript
@Interval(300_000) // 5 min
cleanupStaleMaps() {
  for (const [sessionId, interval] of this.combatLoops) {
    // check Redis session exists, if not — clearInterval + delete
  }
}
```

### 2.2 N+1 Query in getPlayerState()

**Problem**: `player.service.ts:74-77` makes 3 sequential DB calls: `getPlayer()`, `getActivePlayerLeague()`, `getAllPlayerLeagues()`. The `getAllPlayerLeagues()` call with `relations: ['league', 'characters', 'bag']` is already well-optimized (one query with JOINs), but the first two calls are redundant.

**Fix**:
- `getPlayer()` is a standalone query — necessary.
- `getActivePlayerLeague()` fetches one PlayerLeague — this data is already inside `getAllPlayerLeagues()` result.
- Combine into 2 queries: `getPlayer()` + `getAllPlayerLeagues()`, then find activePlayerLeague from the result.

```typescript
async getPlayerState(telegramId: string) {
  const [player, allPlayerLeagues] = await Promise.all([
    this.getPlayer(telegramId),
    this.getAllPlayerLeagues(telegramId),
  ]);
  const pl = allPlayerLeagues.find(l => l.leagueId === player.activeLeagueId);
  // ...
}
```

**Impact**: 3 queries → 2 queries (parallel), saves ~one DB round-trip.

### 2.3 Socket.IO Event Listener Cleanup

**Problem**: CombatManager on the frontend registers socket event listeners. If combat scenes are re-entered without proper cleanup, listeners can stack.

**Fix**: Ensure `destroy()` / `cleanup()` removes all listeners registered during combat. Use named functions instead of anonymous arrows for `socket.off()` calls.

---

## Phase 3: Medium — Frontend Rendering

### 3.1 Battle Scene: setTimeout → requestAnimationFrame

**Problem**: `battle-scene.ts:255` uses `setTimeout(tick, 80)` (fixed 12.5 FPS) for the render loop. This is:
- Not synced with display refresh (stuttering on 60/120Hz screens)
- Lower FPS than the display can show
- Still runs even when the tab is backgrounded (setTimeout isn't throttled as aggressively)

**Current mitigations**: The code already has dirty-flag checks (line 294: only redraws when `needsRedraw` or `panning` is true). This is good.

**Fix**: Switch to `requestAnimationFrame` with delta-time accumulator. Keep the same dirty-flag logic.

```typescript
_startTick(): void {
  let lastTime = performance.now();
  const tick = (now: number): void => {
    const dt = Math.min((now - lastTime) / 1000, 0.2);
    lastTime = now;
    // ... same update logic ...
    this._rafId = requestAnimationFrame(tick);
  };
  this._rafId = requestAnimationFrame(tick);
}
```

**Impact**: Smoother animation on all refresh rates, better battery on mobile (auto-pauses in background tab).

### 3.2 Skill Tree: Full DOM Update on Every Click

**Problem**: `skill-tree-scene.ts:302-313` `_updateAllNodes()` iterates all ~256 SVG nodes and all edges on every click, toggling CSS classes.

**Fix**: Track which nodes actually changed and only update those + their immediate neighbors.

```typescript
_updateChangedNodes(changedIds: Set<number>): void {
  const toUpdate = new Set(changedIds);
  // Add neighbors of changed nodes (edge state might change)
  for (const id of changedIds) {
    for (const neighbor of this._graph.neighbors(id)) {
      toUpdate.add(neighbor);
    }
  }
  for (const id of toUpdate) {
    const g = this._graphG.querySelector(`[data-node-id="${id}"]`);
    if (!g) continue;
    g.classList.toggle("st-node--allocated", this._allocated.has(id));
    g.classList.toggle("st-node--reachable", !this._allocated.has(id) && this._isReachable(id));
  }
  // Edges: only check edges touching changed nodes
  for (const id of toUpdate) {
    for (const line of this._graphG.querySelectorAll(`[data-edge*="${id}"]`)) {
      const [a, b] = (line as SVGLineElement).dataset.edge!.split("-").map(Number);
      line.classList.toggle("st-edge--active", this._allocated.has(a) && this._allocated.has(b));
    }
  }
}
```

**Impact**: From O(256 + edges) DOM operations per click → O(~10-20). Noticeable on low-end phones.

### 3.3 Hero Sprite RAF in Non-Combat Scenes

**Problem**: `hideout-scene.ts:385-388` runs a `requestAnimationFrame` loop for the hero sprite even when the player is in menus or navigating other UI.

**Fix**: Use `IntersectionObserver` or a visibility flag to pause the RAF loop when the hideout canvas is not visible.

---

## Phase 4: Low — Future Optimizations

### 4.1 Redis Connection Pooling

Currently using a single ioredis connection. Under high concurrent load, commands queue up.

**Fix**: Use `ioredis` Cluster or create a small pool (3-5 connections) with a round-robin wrapper.

### 4.2 Combat Session Compression

Monster queue data includes redundant fields. Could compress with msgpack or a custom binary format instead of JSON.

**Fix**: Use `msgpack` for Redis session serialization (2-3x smaller than JSON, faster parse).

### 4.3 Batch Enemy Attack Results

Currently the 200ms tick emits `combat:enemy-attack` on every tick even with 0 attacks. Could skip empty ticks.

**Current behavior**: Already checks `result.attacks.length > 0` before emitting (gateway). This is fine. But could batch multiple ticks if network is slow.

### 4.4 SVG Skill Tree → Canvas

If the skill tree grows beyond ~300 nodes, SVG DOM manipulation becomes a bottleneck. Could migrate to Canvas2D rendering with hit-testing.

**Defer**: Only if tree size increases significantly.

---

## Implementation Priority

| # | Task | Impact | Effort | Phase |
|---|------|--------|--------|-------|
| 1 | Cache char stats in Redis session | Critical | Small (1-2h) | 1 |
| 2 | Split monsterQueue to separate Redis key | Critical | Medium (2-3h) | 1 |
| 3 | Gateway map cleanup sweep | High | Small (1h) | 2 |
| 4 | Parallel getPlayerState queries | High | Small (30min) | 2 |
| 5 | Socket listener cleanup audit | High | Small (1h) | 2 |
| 6 | Battle scene → RAF | Medium | Small (30min) | 3 |
| 7 | Skill tree partial DOM update | Medium | Medium (1-2h) | 3 |
| 8 | Pause hero RAF when hidden | Low | Small (30min) | 3 |
| 9 | Redis connection pool | Low | Medium (1-2h) | 4 |
| 10 | Session msgpack compression | Low | Medium (2h) | 4 |

**Recommended start**: Tasks 1 + 4 (biggest impact, smallest effort). Then task 6 for FE smoothness.
