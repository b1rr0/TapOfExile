# Sprites Guide

## Directory Structure

All sprite assets follow a strict two-level nesting convention:

```
assets/
  characters/
    <type>/              # e.g. samurai, knight, wizard, archer
      <variant>/         # e.g. samurai_1, knight_1, wizard_1
        idle.png
        idle.json        # Aseprite JSON atlas
        attack_1.png
        attack_1.json
        ...
  enemy/
    <type>/              # e.g. goblin, ninja, necromancer, night_born
      <variant>/         # e.g. goblin_black, yellow_ninja, necromancer_1
        idle.png
        idle.json
        run.png
        run.json
        death.png
        death.json
        ...
```

### Naming Rules

- Folders and files use **snake_case** only (lowercase, underscores)
- No spaces, no CamelCase, no UPPERCASE in filenames
- Animation names map directly to filenames: `idle`, `run`, `attack_1`, `hurt`, `death`
- Each JSON atlas file references its PNG via `meta.image` (same folder)

---

## Current Assets

### Characters (Heroes)

| Type     | Variant    | Frame Size | Animations                                     |
|----------|------------|------------|-------------------------------------------------|
| samurai  | samurai_1  | 96x96      | idle, attack_1, hurt, run                       |
| knight   | knight_1   | 96x84      | idle, attack_1, hurt, death, walk               |
| wizard   | wizard_1   | 128x128    | idle, attack_1, attack_2, charge_1 (64x128), charge_2, dead, run, walk, magic_arrow, magic_sphere |
| archer   | archer_1   | 92x120     | idle, walk, attack_1, attack_2, hurt, run, death (multi-row spritesheet) |

### Enemies

| Type        | Variant       | Frame Size | Animations                          |
|-------------|---------------|------------|-------------------------------------|
| goblin      | goblin_black  | 64x64      | idle, run, death, hit, walk         |
| ninja       | yellow_ninja  | 128x128    | idle, attack, death, hit, walk, white_hit |
| necromancer | necromancer_1 | 160x128    | idle, run, attack, cast, death (multi-row spritesheet) |
| night_born  | night_born_1  | 80x80      | idle, run, attack, hurt, death (multi-row spritesheet) |

All sprites have JSON atlas files. Multi-row spritesheets (archer, necromancer, night_born) use
a single `spritesheet.png` referenced by all their animation JSONs via different `frame.y` offsets.

---

## Adding a New Hero Character

### Step 1: Prepare Sprite Files

Export animations from Aseprite as JSON + PNG pairs:
- File > Export Sprite Sheet
- Format: JSON Array
- Output: `{animation_name}.json` + `{animation_name}.png`

Required animations:
- **idle** (loop) -- standing animation
- **attack1** (one-shot) -- attack animation

Optional animations:
- **hurt** (one-shot) -- damage reaction
- **run** (loop) -- movement animation

### Step 2: Place Files

Create the folder structure:

```
bot/src/assets/characters/<type>/<variant>/
```

Example for a new ronin character:

```
bot/src/assets/characters/ronin/ronin_1/
  idle.json
  idle.png
  attack_1.json
  attack_1.png
  hurt.json
  hurt.png
  run.json
  run.png
```

Make sure the `meta.image` field inside each JSON file matches the PNG filename:

```json
{
  "meta": {
    "image": "idle.png"
  }
}
```

### Step 3: Register in sprite-registry.js

Add an entry to `HERO_SKINS` in `bot/src/data/sprite-registry.js`:

```javascript
export const HERO_SKINS = {
  // ... existing skins ...

  ronin_1: {
    id: "ronin_1",
    name: "Ronin",
    basePath: "/src/assets/characters/ronin/ronin_1",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 14, loop: false },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      run:     { json: "run.json",       fps: 12, loop: true },
    },
    defaultSize: { w: 252, h: 336 },
  },
};
```

### Step 4: Use in Game

The skin is now available via `getHeroSkin("ronin_1")`. To make it the default hero, change the default in `battle-scene.js`:

```javascript
this._heroSkinId = opts.heroSkin || "ronin_1";
```

---

## Adding a New Enemy

### Step 1: Prepare Sprite Files

Required animations:
- **idle** (loop) -- standing animation
- **run** (one-shot) -- entrance animation
- **death** (one-shot) -- death animation

### Step 2: Place Files

```
bot/src/assets/enemy/<type>/<variant>/
```

Example for a skeleton enemy:

```
bot/src/assets/enemy/skeleton/skeleton_warrior/
  idle.json
  idle.png
  run.json
  run.png
  death.json
  death.png
```

### Step 3: Register in sprite-registry.js

Add an entry to `ENEMY_SKINS`:

```javascript
export const ENEMY_SKINS = {
  // ... existing skins ...

  skeleton_warrior: {
    id: "skeleton_warrior",
    name: "Skeleton Warrior",
    basePath: "/src/assets/enemy/skeleton/skeleton_warrior",
    animations: {
      run:   { json: "run.json",   fps: 10, loop: false },
      idle:  { json: "idle.json",  fps: 8,  loop: true },
      death: { json: "death.json", fps: 10, loop: false },
    },
    defaultSize: { w: 210, h: 210 },
  },
};
```

### Step 4: Use in Game

The skin is available via `getEnemySkin("skeleton_warrior")`. To use for a specific monster, pass the skin ID when creating a BattleScene:

```javascript
new BattleScene(container, events, { enemySkin: "skeleton_warrior" });
```

---

## Aseprite JSON Atlas Format

Each JSON file follows the Aseprite export format:

```json
{
  "frames": [
    {
      "filename": "sprite_name #animation 0",
      "frame": { "x": 0, "y": 0, "w": 96, "h": 96 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 96, "h": 96 },
      "sourceSize": { "w": 96, "h": 96 },
      "duration": 125
    }
  ],
  "meta": {
    "app": "https://www.aseprite.org/",
    "image": "idle.png",
    "format": "RGBA8888",
    "size": { "w": 960, "h": 96 },
    "scale": "1"
  }
}
```

Key fields used by the engine:
- `frames[].frame` -- source rectangle on the sprite sheet (x, y, w, h)
- `frames[].duration` -- frame duration in ms (used as fallback if fps not set in registry)
- `meta.image` -- PNG filename (must match the actual file in the same directory)

---

## Sprite Storybook (Preview Mode)

When `IS_TESTING = true` in `bot/src/main.js`, a **Storybook** button appears on the
hideout screen. It opens a preview page showing all registered hero and enemy skins
playing their demo animation sequence.

- **Heroes**: run -> idle -> attack -> idle (loop)
- **Enemies**: run -> idle -> death (loop)

When adding a new sprite, registering it in `sprite-registry.js` is enough --
the Storybook automatically picks up all entries from `HERO_SKINS` and `ENEMY_SKINS`.

File: `bot/src/scenes/storybook-scene.js`

---

## Checklist for Adding Sprites

- [ ] Files are in `<type>/<variant>/` folder structure
- [ ] All filenames are snake_case (lowercase + underscores)
- [ ] JSON `meta.image` matches the actual PNG filename
- [ ] Entry added to `HERO_SKINS` or `ENEMY_SKINS` in `sprite-registry.js`
- [ ] `basePath` points to the correct folder
- [ ] `animations` object maps animation names to JSON filenames
- [ ] `defaultSize` is set to reasonable pixel dimensions
- [ ] Hero has at minimum: `idle` + `attack1` animations
- [ ] Enemy has at minimum: `idle` + `run` + `death` animations
- [ ] Verify new sprite appears in Storybook (`IS_TESTING = true`)
