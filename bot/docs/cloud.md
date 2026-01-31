# 33Metro Bot — Architecture Overview

## Stack
- **Runtime:** Browser (Telegram Web App)
- **Build:** Vite
- **Language:** Vanilla JS (ES modules, no framework)
- **Rendering:** Canvas 2D (sprites) + DOM (HUD, HP bar, effects)
- **Persistence:** localStorage
- **Assets:** Aseprite JSON atlases + PNG sprite strips

## Project Structure

```
src/
├── assets/
│   ├── background/        # Battle scene backgrounds (PNG)
│   ├── characters/        # Hero skins (each subfolder = one skin)
│   │   └── samurai_1/     # IDLE/ATTACK/HURT/RUN .json + .png
│   └── enemy/             # Enemy skins (each subfolder = one skin)
│       └── goblin_black/  # idle/run/death .json + .png
├── data/
│   ├── sprite-registry.js # Central catalogue of all skins
│   └── monster-types.js   # Monster stat definitions
├── game/
│   ├── events.js          # EventBus (pub/sub)
│   ├── state.js           # GameState (localStorage persistence)
│   ├── combat.js          # CombatManager (tap damage, monster lifecycle)
│   ├── monsters.js        # Monster creation + HP/gold/XP scaling
│   ├── progression.js     # XP → level-up logic
│   └── upgrades.js        # Upgrade purchase + stat recalculation
├── ui/
│   ├── characters/
│   │   ├── character.js       # Base class: SpriteEngine + position + animations
│   │   ├── hero-character.js  # HeroCharacter extends Character
│   │   └── enemy-character.js # EnemyCharacter extends Character
│   ├── battle-scene.js    # Scene orchestrator (bg + hero + enemy)
│   ├── sprite-engine.js   # JSON atlas animation player (low-level)
│   ├── background-renderer.js # Background image renderer
│   ├── effects.js         # Floating damage numbers, gold drops
│   ├── hud.js             # Top bar (stage, level, gold, DPS)
│   ├── upgrade-panel.js   # Upgrade shop buttons
│   └── screens.js         # Screen transitions
├── utils/
│   ├── format.js          # Number formatting (K/M/B)
│   └── haptic.js          # Telegram haptic feedback
├── main.js                # Entry point
└── style.css              # All styling
```

## Class Hierarchy (Characters)

```
Character (base)
  ├── HeroCharacter    — left side, attack() → idle
  └── EnemyCharacter   — right side, spawn()/die()/hit()
        └── uses SpriteEngine internally
```

### Character (base class)
Encapsulates everything a sprite-based entity needs:
- **SpriteEngine** — animation playback
- **Position** — x (absolute or ratio), y (ground line), w, h
- **Entrance** — slide from offset at speed
- **Death** — play death anim → alpha fade to 0
- **Shake** — pixel offset with decay
- **update(dt)** / **draw(ctx, w, h, dpr)**

### HeroCharacter
- Default position: left edge (x=0)
- `attack(animName)` — plays attack animation, auto-returns to idle

### EnemyCharacter
- Default position: 62% width, -15px offset, flipped
- `spawn()` — reset + slide in from right + run → idle
- `die()` — death animation + fade out
- `hit()` — shake on damage

## Sprite Registry
`src/data/sprite-registry.js` is the single source of truth for all skins.

Each skin entry:
```js
{
  id: "samurai_1",          // unique key
  name: "Samurai",          // display name
  basePath: "/src/assets/characters/samurai_1",
  animations: { ... },      // SpriteEngine config
  defaultSize: { w, h },    // CSS px
}
```

## Event Flow
```
User Tap → combat.handleTap()
  → emit("damage")
    → hero.attack()
    → enemy.hit()
    → effects.showDamageNumber()

Monster HP ≤ 0 → emit("monsterDied")
  → enemy.die() (death anim → fade)
  → 1200ms later → emit("monsterSpawned")
    → enemy.spawn() (slide in → idle)
```

## Adding New Content
- **New hero skin:** see `docs/adding-sprites.md`
- **New enemy skin:** see `docs/adding-enemies.md`
