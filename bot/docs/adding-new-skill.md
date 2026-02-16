# Adding a New Skill

## Quick Checklist

| # | Action | File |
|---|--------|------|
| 1 | Create v0 sprite (Aseprite JSON + PNG) | `bot/public/assets/skils_sprites/<name>/v0/` |
| 2 | Add `meta.skill` to JSON atlas | same JSON file |
| 3 | Generate 7 color variants | `node scripts/recolor-enemies.js` |
| 4 | Copy JSON with `meta.skill` into each variant folder | v1..v7 JSON files |
| 5 | Add skill definition | `shared/active-skills.ts` |

Everything else is auto-discovered (storybook, combat service, projectile layer).

---

## Step 1: Create Sprite Assets

Export from Aseprite as **JSON Array + PNG Spritesheet**.

Place into:
```
bot/public/assets/skils_sprites/<skill_name>/v0/
  <sprite_name>.json
  <sprite_name>.png
```

Naming conventions:
- Folder name = snake_case skill id (e.g. `ice_nova`, `chain_lightning`)
- File names can be anything, just keep consistent with `meta.image` in JSON

---

## Step 2: Add `meta.skill` to JSON Atlas

Inside the JSON's `"meta"` object, add a `"skill"` section:

```json
{
  "frames": [ ... ],
  "meta": {
    "app": "https://www.aseprite.org/",
    "image": "sprite_name.png",
    "format": "RGBA8888",
    "size": { "w": 1024, "h": 1024 },
    "scale": "1",
    "skill": {
      "renderType": "projectile",
      "renderDurationMs": 800,
      "drawW": 220,
      "drawH": 110
    }
  }
}
```

### `renderType` options

| Type | Behavior | Example |
|------|----------|---------|
| `"projectile"` | Flies from hero to enemy | fireball, sword throw |
| `"spawn_at_hero"` | Appears at hero, plays once | buff, aura, shield |
| `"spawn_at_enemy"` | Appears at enemy, plays once | lightning strike, trap |
| `"fullscreen"` | Covers entire canvas, plays once | ultimate, screen-wide explosion |

### `renderDurationMs`

- For `projectile`: flight time in ms (how long it takes to reach the enemy)
- For `spawn_*` / `fullscreen`: total display time (animation removed after this)
- Typical values: 400-1200ms

### `drawW` / `drawH`

Canvas display size in CSS pixels (before DPR scaling). This is NOT the frame size from the spritesheet. Choose values that look good on screen:

| Sprite Type | Typical drawW | Typical drawH |
|-------------|--------------|--------------|
| Large projectile (fireball) | 200-250 | 100-130 |
| Small projectile (sword) | 60-100 | 60-100 |
| Spawn effects | 150-300 | 150-300 |
| Fullscreen | ignored (auto-fills canvas) | ignored |

---

## Step 3: Generate Color Variants

Run the recolor script from project root:

```bash
node scripts/recolor-enemies.js --dir bot/public/assets/skils_sprites/<skill_name>
```

This creates 7 recolored PNGs in subfolders:
- `v1_crimson/`, `v2_emerald/`, `v3_azure/`, `v4_golden/`, `v5_violet/`, `v6_frost/`, `v7_shadow/`

The script auto-detects sprite brightness:
- **Colorful sprites** -> HSL hue-shift
- **Dark sprites** (>70% low-chroma) -> full tinting + colored outline

---

## Step 4: Copy JSON with `meta.skill` into Variant Folders

The recolor script generates PNGs only, not JSON files. You need to copy the v0 JSON into each variant folder.

Quick way (from project root):

```bash
node -e "
const fs = require('fs');
const path = require('path');
const base = 'bot/public/assets/skils_sprites/<SKILL_NAME>';
const v0Json = fs.readdirSync(path.join(base, 'v0')).find(f => f.endsWith('.json'));
const src = path.join(base, 'v0', v0Json);
const variants = ['v1_crimson','v2_emerald','v3_azure','v4_golden','v5_violet','v6_frost','v7_shadow'];
for (const v of variants) {
  const dest = path.join(base, v, v0Json);
  fs.copyFileSync(src, dest);
  console.log('Copied to', dest);
}
"
```

The JSON content is identical across variants (same frame layout, same `meta.skill`). Only the PNG pixels differ.

---

## Step 5: Add Skill Definition

Edit `shared/active-skills.ts`:

### 5a. Add to `ActiveSkillId` type:

```typescript
export type ActiveSkillId = "fireball" | "sword_throw" | "ice_nova";
```

### 5b. Add to `ACTIVE_SKILLS` object:

```typescript
ice_nova: {
  id: "ice_nova",
  name: "Ice Nova",
  cooldownMs: 4000,
  damageMultiplier: 3,
  elementalProfile: { cold: 1.0 },
  spritePath: "skils_sprites/ice_nova/ice_nova.json",
},
```

### Fields explained:

| Field | Description |
|-------|-------------|
| `id` | Must match the `ActiveSkillId` union member |
| `name` | Display name |
| `cooldownMs` | Server-enforced cooldown between casts |
| `damageMultiplier` | `tapDamage * multiplier` = skill damage |
| `elementalProfile` | Damage type weights. Keys: `physical`, `fire`, `lightning`, `cold`, `pure` |
| `iconPath` | (optional) Fallback static icon. Prefer omitting — first sprite frame is used |
| `spritePath` | Path to v0 JSON atlas relative to `/assets/` |

### Elemental profile examples:

```typescript
{ fire: 1.0 }                    // 100% fire
{ physical: 0.5, lightning: 0.5 } // 50/50 split
{ pure: 1.0 }                    // Bypasses all resistance
{ cold: 0.7, physical: 0.3 }     // Mostly cold
```

---

## What Happens Automatically

### Storybook
`_buildSkillEntries()` iterates `Object.values(ACTIVE_SKILLS)` and derives variant paths from `spritePath`. New skills appear instantly in the Skills category.

### ProjectileLayer
`load(key, jsonPath)` reads `meta.skill` from any JSON atlas. No skill-specific code exists — it's fully data-driven.

### Combat Server
`castSkill()` in `combat.service.ts` looks up `ACTIVE_SKILLS[skillId]` dynamically. New skills work without server code changes.

### BattleScene
Currently loads fireball + sword_throw by name in `_tryLoadSprites()`. To add new skills to combat, add another `projectileLayer.load(...)` line there:

```typescript
// bot/src/ui/battle-scene.ts, inside _tryLoadSprites()
this.projectileLayer.load("ice_nova", "/assets/skils_sprites/ice_nova/v0/ice_nova.json"),
```

---

## Validation

After adding, verify:

1. **TypeScript compiles**: `cd bot && npx tsc --noEmit`
2. **All 8 variant folders exist** with JSON + PNG
3. **Storybook works**: Hideout -> Storybook -> Skills -> new skill visible with all 8 variants
4. **Icon renders**: Slot 0 shows first frame of current variant, changes on variant switch

---

## File Structure Reference

```
bot/public/assets/skils_sprites/
  fire_srpite/              # Fireball (note: legacy typo in folder name)
    v0/fire_sprite.json     # Original
    v0/fire_sprite.png
    v1_crimson/fire_sprite.json
    v1_crimson/fire_sprite.png
    ...
    v7_shadow/fire_sprite.json
    v7_shadow/fire_sprite.png
  sword_throw/              # Sword Throw
    v0/Sword_sprite.json
    v0/Sword_sprite.png
    ...
  <new_skill>/              # Your new skill
    v0/<name>.json
    v0/<name>.png
    v1_crimson/<name>.json
    v1_crimson/<name>.png
    ...
    v7_shadow/<name>.json
    v7_shadow/<name>.png
```

Each skill: **2 files x 8 variants = 16 files** (8 JSON + 8 PNG).
