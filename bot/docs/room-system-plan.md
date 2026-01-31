# Transition to Room System — Implementation Plan

> Each phase is a separate task. After each phase the game remains functional.
> Locations can be replayed. The old upgrade system is removed. 8-10 locations for chapter 1.

---

## Decisions (from discussion with the user)

- **Replayability:** locations can be replayed for full rewards (gold/loot farming)
- **Upgrades:** the old system (Tap DMG, Crit, DPS) is completely removed. A different progression system will come later
- **Count:** 8-10 locations for the first version of the map (first chapter)

---

## Phase 1: SceneManager + CombatScene + remove upgrades

**Goal:** Introduce a scene router. Wrap the current combat in `CombatScene`. Remove the old upgrade system.

**Create:**
- `src/scenes/scene-manager.js` — router: `register(name, SceneClass)`, `switchTo(name, params)`, manages `mount()`/`unmount()` of scenes
- `src/scenes/combat-scene.js` — wraps the current combat: creates DOM (HUD, battle-scene, tap-zone), wires BattleScene, Effects, HUD, tap-handler, passive DPS interval. `mount()` / `unmount()` with full cleanup

**Modify:**
- `index.html` — remove contents of `#game-screen`, add `<div id="scene-container"></div>`. Keep `#loading-screen`, `#offline-popup`
- `src/main.js` — instead of directly creating HUD/BattleScene/Effects → create SceneManager, register CombatScene, call `switchTo("combat")`
- `src/style.css` — add styles for `#scene-container`, remove `.upgrade-*` styles

**Delete:**
- `src/ui/upgrade-panel.js` — entirely
- `src/game/upgrades.js` — entirely
- All `import`/usages of UpgradeManager and UpgradePanel from `main.js`

**Test:** `npm run dev` → combat works (taps, monsters, effects), no upgrade panel. In console: `[SceneManager] switched to combat`.

---

## Phase 2: Location Data Model + State Extension

**Goal:** Catalog of 8-10 locations and new fields in GameState.

**Create:**
- `src/data/locations.js` — catalog:
  ```js
  { id, name, description, order,
    requiredLocationId, // null = always unlocked
    background,         // background file for combat
    waves: [{ monsters: [{type, count}] }],
    rewards: { gold, xp } }
  ```
  Locations: 1) Forest Road 2) Mountain Pass 3) Dark Cave 4) Swamp 5) Abandoned Village 6) Cursed Temple 7) Dragon's Lair 8) Shogun Castle 9-10) bonus

**Modify:**
- `src/game/state.js` — add to `createDefault()`:
  ```js
  locations: { completed: [], current: null },
  inventory: { items: [], equipment: {} }
  ```
  Remove `upgrades` from defaults.

**Test:** DevTools → localStorage → `locations`, `inventory` fields are present. Old saves don't break (`_merge` adds defaults).

---

## Phase 3: Finite Combat (location-based)

**Goal:** CombatManager — finite monster queue from a location. All killed → `locationComplete`.

**Modify:**
- `src/game/combat.js`:
  - `startLocation(location)` — builds monster queue
  - `_onMonsterDeath()` — next monster or `emit("locationComplete", {locationId, rewards})`
  - Remove infinite stage/wave logic
  - New event `locationWaveProgress` → `{current, total}`
- `src/game/monsters.js`:
  - `createMonsterForLocation(typeName, locationOrder)` — scaling by location order
- `src/scenes/combat-scene.js`:
  - `mount({location})` → `combat.startLocation(location)`
  - Listens for `locationComplete`

**Delete:**
- From `state.js` — `combat.currentStage`, `combat.currentWave`, `combat.wavesPerStage`

**Test:** Hardcode a location → combat with N monsters → after the last one `locationComplete` in console.

---

## Phase 4: Hideout Scene (hub)

**Goal:** Home screen: level, gold, navigation (Map, Inventory).

**Create:**
- `src/scenes/hideout-scene.js`:
  - Top: level, gold
  - Center: hero idle image
  - Buttons: "Map" → map-scene, "Inventory" → overlay

**Modify:**
- `src/main.js` — register HideoutScene, starting scene = `"hideout"`
- `src/style.css` — `.hideout-*` styles

**Test:** Start → hideout. Gold, level visible. Inventory works. Map → alert.

---

## Phase 5: Map + Victory + full cycle

**Goal:** Map with location selection + victory screen. Full game cycle: hideout → map → combat → victory → hideout.

**Create:**
- `src/scenes/map-scene.js`:
  - Scroll-list of 8-10 cards from `LOCATIONS`
  - Statuses: 🔒 locked / ✅ completed / ▶ available
  - Tap → `switchTo("combat", {location})`
  - "Back" button → hideout
  - Completed locations can be replayed (full rewards)
- `src/scenes/victory-scene.js`:
  - "Victory!", gold, XP
  - "Continue" → hideout

**Modify:**
- `src/main.js` — register MapScene, VictoryScene
- `src/scenes/combat-scene.js` — on `locationComplete`: update `state.data.locations.completed`, → victory-scene
- `src/style.css` — `.map-*`, `.victory-*`, `.location-card--*` styles

**Test:** Full cycle: hideout → map → Forest Road → combat → victory → hideout → map → Forest Road ✅, Mountain Pass unlocked. Reload — progress saved.

---

## Phase 6: Cleanup and Polish

**Delete:**
- `src/ui/screens.js` — replaced by SceneManager
- Dead styles, unused events

**Test:** Full playthrough of all locations. Mobile layout on iPhone 13 mini.

---

## Phase Dependencies

```
Phase 1 (SceneManager) ──┐
Phase 2 (Data model)  ───┤── Phase 3 (Finite combat) ──┐
                          └── Phase 4 (Hideout) ────────┤── Phase 5 (Map+Victory) ── Phase 6 (Polish)
```

## Key Files

| File | Action |
|------|--------|
| `src/scenes/scene-manager.js` | CREATE (P1) |
| `src/scenes/combat-scene.js` | CREATE (P1), MODIFY (P3, P5) |
| `src/scenes/hideout-scene.js` | CREATE (P4) |
| `src/scenes/map-scene.js` | CREATE (P5) |
| `src/scenes/victory-scene.js` | CREATE (P5) |
| `src/data/locations.js` | CREATE (P2) |
| `src/game/state.js` | MODIFY (P2, P3) |
| `src/game/combat.js` | MODIFY (P3) |
| `src/game/monsters.js` | MODIFY (P3) |
| `src/main.js` | MODIFY (P1, P4, P5) |
| `index.html` | MODIFY (P1) |
| `src/style.css` | MODIFY (all phases) |
| `src/ui/upgrade-panel.js` | DELETE (P1) |
| `src/game/upgrades.js` | DELETE (P1) |
| `src/ui/screens.js` | DELETE (P6) |

---

**Starting with Phase 1:** SceneManager + CombatScene + remove upgrades.
