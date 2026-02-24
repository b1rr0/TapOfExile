# Animation Tester — Tap of Exile

Unified tool for previewing all sprite animations: characters, enemies, and skills.

## How to Run

### Option 1: npx (one-liner)

```bash
cd shared/public/assets
npx http-server -p 8092 --cors -c-1
```

Open: **http://localhost:8092/animation-tester.html**

### Option 2: Claude Code launch config

The `assets-server` is configured in `.claude/launch.json`. It starts automatically via `preview_start` in Claude Code.

## Tabs

| Tab | What it shows | Controls |
|-----|---------------|----------|
| **Characters** | All skins × all animations simultaneously | Filter by class (Archer/Knight/Samurai/Wizard) |
| **Enemies** | One animation type across all enemies | Animation dropdown + 8 variant buttons |
| **Skills** | All skill sprites (fire, earth, thunder, etc.) | Variant dropdown + group filter + **Run Validation** |

## Global Controls

- **Speed** — 0.1x to 3x playback speed
- **Pause/Play** — toggle animation
- **Step** — advance one frame (works while paused)

## Skills Validation

Click **Run Validation** on the Skills tab to check:
- PNG size vs JSON meta size mismatch
- Frame bounds overflow
- Inconsistent frame sizes
- Mixed frame durations
- renderDurationMs vs actual frame sum

## File Structure

```
shared/public/assets/
  animation-tester.html    <-- this tool
  characters/              <-- character spritesheets
  enemy/                   <-- enemy spritesheets
  skils_sprites/           <-- skill effect spritesheets
```
