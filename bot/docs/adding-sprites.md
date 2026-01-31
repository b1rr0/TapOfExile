# Adding a New Hero Skin

## Requirements

A hero skin needs these animations (Aseprite JSON atlas + PNG):

| Animation | Filename example | Loop | Required |
|-----------|-----------------|------|----------|
| `idle`    | IDLE.json + IDLE.png | yes | yes |
| `attack1` | ATTACK 1.json + ATTACK 1.png | no | yes |
| `hurt`    | HURT.json + HURT.png | no | optional |
| `run`     | RUN.json + RUN.png | yes | optional |

## Step-by-Step

### 1. Export sprites from Aseprite

- Open your character in Aseprite
- For each animation: File → Export Sprite Sheet
  - Layout: **Horizontal Strip**
  - Output: check **JSON data** + **PNG image**
  - JSON style: **Array** (not Hash)
- You'll get pairs: `ANIMATION.json` + `ANIMATION.png`

### 2. Create asset folder

Place files in a new folder under `src/assets/characters/`:

```
src/assets/characters/your_skin_id/
  ├── IDLE.json
  ├── IDLE.png
  ├── ATTACK 1.json
  ├── ATTACK 1.png
  ├── HURT.json       (optional)
  ├── HURT.png        (optional)
  ├── RUN.json        (optional)
  └── RUN.png         (optional)
```

The folder name becomes the skin ID.

### 3. Register the skin

Open `src/data/sprite-registry.js` and add an entry to `HERO_SKINS`:

```js
export const HERO_SKINS = {
  // ... existing skins ...

  your_skin_id: {
    id: "your_skin_id",
    name: "Your Skin Display Name",
    basePath: "/src/assets/characters/your_skin_id",
    animations: {
      idle:    { json: "IDLE.json",      fps: 8,  loop: true },
      attack1: { json: "ATTACK 1.json",  fps: 14, loop: false },
      hurt:    { json: "HURT.json",      fps: 10, loop: false },  // optional
      run:     { json: "RUN.json",       fps: 12, loop: true },   // optional
    },
    defaultSize: { w: 252, h: 336 },  // adjust to your sprite
  },
};
```

### 4. Use the skin

In `main.js` (or wherever BattleScene is created), pass the skin ID:

```js
const battleScene = new BattleScene(
  document.getElementById("battle-scene"),
  events,
  { heroSkin: "your_skin_id" }
);
```

Or to change skin at runtime (requires reload of sprites):
```js
// Future: battleScene.setHeroSkin("your_skin_id");
```

### 5. Adjust size (optional)

The `defaultSize` in the registry controls how big the character is drawn.
- `w` and `h` are in CSS pixels (before DPR scaling)
- The original samurai uses `252x336`
- Adjust based on your sprite's proportions

You can also pass size overrides when creating HeroCharacter:
```js
const hero = new HeroCharacter(skin, { w: 200, h: 300 });
```

## JSON Atlas Format

The JSON file must follow Aseprite's standard export format:

```json
{
  "frames": [
    {
      "filename": "frame 0",
      "frame": { "x": 0, "y": 0, "w": 96, "h": 96 },
      "duration": 125
    },
    ...
  ],
  "meta": {
    "image": "IDLE.png",
    "size": { "w": 960, "h": 96 }
  }
}
```

Key fields:
- `frames[].frame` — source rect {x, y, w, h} in the PNG
- `meta.image` — PNG filename (auto-loaded by SpriteEngine)
- `frames[].duration` — fallback FPS if not set in config

## Checklist

- [ ] Aseprite export: JSON Array + PNG for each animation
- [ ] Folder created: `src/assets/characters/<skin_id>/`
- [ ] Entry added to `HERO_SKINS` in `sprite-registry.js`
- [ ] `idle` and `attack1` animations defined (minimum)
- [ ] `defaultSize` set to match your sprite proportions
- [ ] Tested in browser — character renders and animates correctly
