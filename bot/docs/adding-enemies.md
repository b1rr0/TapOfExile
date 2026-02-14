# Adding a New Enemy Skin

## Requirements

An enemy skin needs these animations (Aseprite JSON atlas + PNG):

| Animation | Filename example | Loop | Required |
|-----------|-----------------|------|----------|
| `idle`    | idle.json + idle.png | yes | yes |
| `run`     | run.json + run.png | no | yes |
| `death`   | death.json + death.png | no | yes |

All three are required for the full battle lifecycle:
- `run` — played during entrance (slide onto screen)
- `idle` — played during combat (waiting for hits)
- `death` — played when HP reaches 0 (before fade out)

## Step-by-Step

### 1. Export sprites from Aseprite

- Open your enemy character in Aseprite
- For each animation: File → Export Sprite Sheet
  - Layout: **Horizontal Strip**
  - Output: check **JSON data** + **PNG image**
  - JSON style: **Array** (not Hash)
- You'll get pairs: `animation.json` + `animation.png`

### 2. Create asset folder

Place files in a new folder under `public/assets/enemy/`:

```
public/assets/enemy/your_enemy_id/v0/
  ├── idle.json
  ├── idle.png
  ├── run.json
  ├── run.png
  ├── death.json
  └── death.png
```

The folder name becomes the skin ID. Use `v0/` subfolder for the base variant.

### 3. Register the skin

Open `src/data/sprite-registry.ts` and add an entry to `ENEMY_SKINS`:

```ts
export const ENEMY_SKINS: Record<string, SkinConfig> = {
  // ... existing skins ...

  your_enemy_id: {
    id: "your_enemy_id",
    name: "Your Enemy Display Name",
    basePath: "/assets/enemy/your_enemy_id/v0",
    animations: {
      idle:  { json: "idle.json",  fps: 8,  loop: true },
      run:   { json: "run.json",   fps: 10, loop: false },
      death: { json: "death.json", fps: 10, loop: false },
    },
    defaultSize: { w: 210, h: 210 },  // adjust to your sprite
    anchorOffsetY: 0,
    scale: 1,
  },
};
```

### 4. Generate color variants

Run the recolor script to auto-generate 7 color variants:

```bash
node scripts/recolor-enemies.js
```

This creates `v1_crimson/`, `v2_emerald/`, etc. next to `v0/`.

Then add your skin ID to `VARIANT_BASES` in `sprite-registry.ts` so variants are registered automatically.

### 5. Use the skin

Map your monster type to the skin ID in `monster-types.ts` (server) and `MONSTER_SKIN_MAP` (client):

```ts
// server/src/level-gen/monster-types.ts
{ name: 'YourMonster', skinId: 'your_enemy_id', ... }

// bot/src/data/sprite-registry.ts → MONSTER_SKIN_MAP
YourMonster: "your_enemy_id",
```

### 6. Adjust size and position (optional)

The `defaultSize` in the registry controls how big the enemy is drawn.
- `w` and `h` are in CSS pixels (before DPR scaling)
- The original goblin uses `210x210`

You can also pass overrides when creating EnemyCharacter:
```ts
const enemy = new EnemyCharacter(skin, {
  w: 180,           // custom width
  h: 240,           // custom height
  xRatio: 0.65,     // position at 65% of screen width
  xOffset: -20,     // nudge 20px left
  entranceOffset: 500, // start further offscreen
  entranceSpeed: 800,  // slide in faster
});
```

## Animation Lifecycle

When a monster spawns:
```
spawn() → resetState()
       → startEntrance(400px offset, 700px/s speed)
       → play("run") → on complete → play("idle")
```

When a monster dies:
```
die() → play("death") → on complete → startDeath()
     → alpha fades 1.0 → 0.0 (over ~0.4s)
     → character becomes invisible
```

When a monster takes damage:
```
hit() → shake(6px) → decays at 80px/s
```

## Sprite Design Guidelines

- **Facing direction:** Design your enemy facing RIGHT. The engine flips it horizontally (flipX=true) so it faces the hero on the left.
- **Frame size:** Keep consistent frame sizes across all animations (e.g., all 64x64 or all 128x128).
- **Transparent background:** Use transparent PNG backgrounds (no solid color backgrounds).
- **Animation speed:** `fps` in the config overrides Aseprite's `duration` field. Typical values: idle 6-10, run 8-12, death 8-12.

## Checklist

- [ ] Aseprite export: JSON Array + PNG for `idle`, `run`, `death`
- [ ] Folder created: `public/assets/enemy/<skin_id>/v0/`
- [ ] Entry added to `ENEMY_SKINS` in `sprite-registry.ts`
- [ ] Skin ID added to `VARIANT_BASES` for auto color variants
- [ ] `node scripts/recolor-enemies.js` run to generate variants
- [ ] All 3 required animations defined
- [ ] `defaultSize` set to match your sprite proportions
- [ ] Enemy faces RIGHT in the source sprites (flipped in-game)
- [ ] Tested in browser — entrance, idle, death, fade all work
