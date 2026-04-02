/**
 * Sprite Registry - central catalogue of all hero and enemy skins.
 *
 * Animation configs (fps, loop, json atlas) live here because they are
 * FE-rendering-only. Shared metadata (paths, names, classId, monster→skin map)
 * comes from @shared/sprite-registry.
 *
 * Adding a new skin:
 *  1. Place Aseprite-exported JSON + PNG in the appropriate assets folder.
 *  2. Add metadata to @shared/sprite-registry (HERO_SKINS_META / ENEMY_SKINS_META).
 *  3. Add an entry to HERO_SKINS or ENEMY_SKINS below with animations.
 *  4. The game will pick it up via getHeroSkin() / getEnemySkin().
 *
 * Required animations per role:
 *  - Hero:  idle (loop), attack1 (one-shot), [optional: hurt, run, death]
 *  - Enemy: idle (loop), run (one-shot), death (one-shot)
 *
 * Each skin entry:
 *  @property {string} id          - unique identifier (matches folder name)
 *  @property {string} name        - display name
 *  @property {string} classId     - character class this skin belongs to
 *  @property {string} basePath    - path to sprite folder (relative to project root)
 *  @property {Object} animations  - { name: { json, fps, loop } } for SpriteEngine
 *  @property {Object} defaultSize    - { w, h } default draw size in CSS px
 *  @property {number} anchorOffsetY  - fraction of frame height empty below feet
 *  @property {number} scale          - visual scale multiplier (1 = unchanged)
 */

import type { SkinConfig, AnimationConfig } from "../types.js";
import { MONSTER_SKIN_MAP } from "@shared/sprite-registry";

// Re-export shared asset metadata so consumers can access both from one place
export {
  HERO_SKINS_META,
  HERO_SKIN_MAP,
  ENEMY_SKINS_META,
  ENEMY_SKIN_MAP,
  MONSTER_SKIN_MAP,
  CLASS_EMBLEM_IMG,
  POTION_SPRITE_PATHS,
  BACKGROUND_PATHS,
  getHeroSkinsForClass,
} from "@shared/sprite-registry";

export type { HeroSkinMeta, EnemySkinMeta } from "@shared/sprite-registry";

// ── Animation atom constants ────────────────────────────
// Shared animation configs to avoid duplication across enemy skins.
// Attack fps is per-enemy: fps = frameCount / 0.7 so every attack lasts ~0.7s.

const a_idle:       AnimationConfig = { json: "idle.json",     fps: 8,  loop: true };
const a_run:        AnimationConfig = { json: "run.json",      fps: 10, loop: false };
const a_death_10:   AnimationConfig = { json: "death.json",    fps: 10, loop: false };
const a_death_12:   AnimationConfig = { json: "death.json",    fps: 12, loop: false };
const a_hurt:       AnimationConfig = { json: "hurt.json",     fps: 10, loop: false };
// Non-standard filenames (old skins)
const a_walk:       AnimationConfig = { json: "walk.json",     fps: 10, loop: false };

/** Helper: create attack AnimationConfig with fps tuned for 0.7s duration. */
const atk = (json: string, frames: number): AnimationConfig => ({
  json, fps: Math.round(frames / 0.7), loop: false,
});

// ─── Hero Skins ──────────────────────────────────────────

export const HERO_SKINS: Record<string, SkinConfig> = {

  /* ── Samurai ─────────────────────────────────────────── */

  samurai_1: {
    id: "samurai_1",
    name: "Samurai",
    classId: "samurai",
    basePath: "/assets/characters/samurai/samurai_1",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 14, loop: false },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      run:     { json: "run.json",       fps: 12, loop: true },
    },
    defaultSize: { w: 252, h: 336 },
    anchorOffsetY: 0.146,
    scale: 1.30,
  },

  samurai_2: {
    id: "samurai_2",
    name: "Samurai II",
    classId: "samurai",
    basePath: "/assets/characters/samurai/samurai_2",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 14, loop: false },
      run:     { json: "run.json",       fps: 12, loop: true },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 400, h: 400 },
    anchorOffsetY: 0.39,
    scale: 1.45,
  },

  samurai_3: {
    id: "samurai_3",
    name: "Samurai III",
    classId: "samurai",
    basePath: "/assets/characters/samurai/samurai_3",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 14, loop: false },
      run:     { json: "run.json",       fps: 12, loop: true },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 400, h: 400 },
    anchorOffsetY: 0.355,
    scale: 1.47,
  },

  samurai_4: {
    id: "samurai_4",
    name: "Samurai IV",
    classId: "samurai",
    basePath: "/assets/characters/samurai/samurai_4",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 14, loop: false },
      run:     { json: "run.json",       fps: 12, loop: true },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 196, h: 200 },
    anchorOffsetY: 0.22,
    scale: 1.27,
  },

  /* ── Knight / Warrior ────────────────────────────────── */

  knight_1: {
    id: "knight_1",
    name: "Knight",
    classId: "warrior",
    basePath: "/assets/characters/knight/knight_1",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 12, loop: false },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      walk:    { json: "walk.json",      fps: 10, loop: true },
      run:     { json: "walk.json",      fps: 14, loop: true },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 240, h: 210 },
    anchorOffsetY: 0.274,
    scale: 1.88,
  },

  knight_3: {
    id: "knight_3",
    name: "Knight III",
    classId: "warrior",
    basePath: "/assets/characters/knight/knight_3",
    animations: {
      idle:    { json: "idle.json",      fps: 6,  loop: true },
      attack1: { json: "attack_1.json",  fps: 12, loop: false },
      run:     { json: "run.json",       fps: 10, loop: true },
    },
    defaultSize: { w: 368, h: 274 },
    anchorOffsetY: 0.31,
    scale: 1.80,
  },

  knight_4: {
    id: "knight_4",
    name: "Knight IV",
    classId: "warrior",
    basePath: "/assets/characters/knight/knight_4",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 12, loop: false },
      run:     { json: "run.json",       fps: 10, loop: true },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 360, h: 360 },
    anchorOffsetY: 0.361,
    scale: 1.61,
  },

  /* ── Wizard / Mage ───────────────────────────────────── */

  wizard_1: {
    id: "wizard_1",
    name: "Wizard",
    classId: "mage",
    basePath: "/assets/characters/wizard/wizard_1",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 12, loop: false },
      run:     { json: "run.json",       fps: 10, loop: true },
      walk:    { json: "walk.json",      fps: 10, loop: true },
      dead:    { json: "dead.json",      fps: 10, loop: false },
    },
    defaultSize: { w: 256, h: 256 },
    anchorOffsetY: 0.2,
    scale: 1.25,
  },

  wizard_2: {
    id: "wizard_2",
    name: "Wizard II",
    classId: "mage",
    basePath: "/assets/characters/wizard/wizard_2",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 12, loop: false },
      run:     { json: "run.json",       fps: 10, loop: true },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 300, h: 300 },
    anchorOffsetY: 0.32,
    scale: 1.50,
  },

  /* ── Archer ──────────────────────────────────────────── */

  archer_1: {
    id: "archer_1",
    name: "Archer",
    classId: "archer",
    basePath: "/assets/characters/archer/archer_1",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 12, loop: false },
      walk:    { json: "walk.json",      fps: 10, loop: true },
      run:     { json: "run.json",       fps: 10, loop: true },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 256, h: 256 },
    anchorOffsetY: 0.109,
    scale: 1.06,
  },

  archer_2: {
    id: "archer_2",
    name: "Archer II",
    classId: "archer",
    basePath: "/assets/characters/archer/archer_2",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 12, loop: false },
      walk:    { json: "walk.json",      fps: 10, loop: true },
      run:     { json: "run.json",       fps: 10, loop: true },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 184, h: 240 },
    anchorOffsetY: 0,
    scale: 2.05,
  },

  archer_3: {
    id: "archer_3",
    name: "Archer III",
    classId: "archer",
    basePath: "/assets/characters/archer/archer_3",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 12, loop: false },
      run:     { json: "run.json",       fps: 10, loop: true },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 256, h: 256 },
    anchorOffsetY: 0,
    scale: 1.60,
  },

  archer_4: {
    id: "archer_4",
    name: "Archer IV",
    classId: "archer",
    basePath: "/assets/characters/archer/archer_4/Character",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 12, loop: false },
      run:     { json: "run.json",       fps: 10, loop: true },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 200, h: 200 },
    anchorOffsetY: 0.33,
    scale: 2.29,
  },
};

// ─── Enemy Skins ─────────────────────────────────────────

export const ENEMY_SKINS: Record<string, SkinConfig> = {

  // ─── Old skins (non-standard filenames) ──────────────────
  // fps for attacks: frameCount / 0.7 → all attacks last ~0.7s

  goblin_black: {
    id: "goblin_black", name: "Goblin Scout",
    basePath: "/assets/enemy/goblin/goblin_black",
    animations: {
      idle: a_idle, run: a_run, death: a_death_10,
      attack_1: atk("hit.json", 3),                          // 3 frames → 4 fps
    },
    defaultSize: { w: 210, h: 210 }, anchorOffsetY: 0.297, scale: 1,
  },

  yellow_ninja: {
    id: "yellow_ninja", name: "Yellow Ninja",
    basePath: "/assets/enemy/ninja/yellow_ninja",
    animations: {
      idle: a_idle, run: a_walk, death: a_death_10,
      hit: a_hurt,                                            // take-hit anim (not attack)
      attack_1: atk("attack.json", 20),                      // 20 frames → 29 fps
    },
    defaultSize: { w: 256, h: 256 }, anchorOffsetY: 0.25, scale: 1,
  },

  necromancer_1: {
    id: "necromancer_1", name: "Necromancer",
    basePath: "/assets/enemy/necromancer/necromancer_1",
    animations: {
      idle: a_idle, run: a_run, death: a_death_10,
      attack_1: atk("attack.json", 14),                      // 14 frames → 20 fps
    },
    defaultSize: { w: 280, h: 224 }, anchorOffsetY: 0.07, scale: 1,
  },

  night_born_1: {
    id: "night_born_1", name: "Night Born",
    basePath: "/assets/enemy/night_born/night_born_1",
    animations: {
      idle: a_idle, run: a_run, death: a_death_10, hurt: a_hurt,
      attack_1: atk("attack.json", 10),                      // 10 frames → 14 fps
    },
    defaultSize: { w: 200, h: 200 }, anchorOffsetY: 0.025, scale: 1,
  },

  // ─── New skins (standard filenames) ──────────────────────

  blue_witch: {
    id: "blue_witch", name: "Blue Witch",
    basePath: "/assets/enemy/blue_witch/v0",
    animations: {
      idle: a_idle, run: a_run, death: a_death_12, hurt: a_hurt,
      attack_1: atk("attack_1.json", 9),                     // 9 frames → 13 fps
      attack_2: atk("attack_2.json", 5),                     // 5 frames → 7 fps
    },
    defaultSize: { w: 32, h: 48 }, anchorOffsetY: 0, scale: 3,
  },

  king: {
    id: "king", name: "King",
    basePath: "/assets/enemy/king/v0",
    animations: {
      idle: a_idle, run: a_run, death: a_death_12,
      attack_1: atk("attack_1.json", 30),                    // 30 frames → 43 fps
      attack_2: atk("attack_2.json", 58),                    // 58 frames → 83 fps
    },
    defaultSize: { w: 128, h: 128 }, anchorOffsetY: 0.1, scale: 1.8,
  },

  knight_enemy: {
    id: "knight_enemy", name: "Dark Knight",
    basePath: "/assets/enemy/knight_enemy/v0",
    animations: {
      idle: a_idle, run: a_run, death: { json: "death.json", fps: 15, loop: false },
      attack_1: atk("attack_1.json", 22),                    // 22 frames → 31 fps
    },
    defaultSize: { w: 64, h: 64 }, anchorOffsetY: 0, scale: 2.8,
  },

  necromancer_2: {
    id: "necromancer_2", name: "Necromancer II",
    basePath: "/assets/enemy/necromancer_2/v0",
    animations: {
      idle: a_idle, run: a_run, death: a_death_12,
      attack_1: atk("attack_1.json", 47),                    // 47 frames → 67 fps
    },
    defaultSize: { w: 128, h: 128 }, anchorOffsetY: 0.15, scale: 1.6,
  },

  orc: {
    id: "orc", name: "Orc",
    basePath: "/assets/enemy/orc/v0",
    animations: {
      idle: a_idle, run: a_run, death: a_death_10, hurt: a_hurt,
      attack_1: atk("attack_1.json", 6),                     // 6 frames → 9 fps
      attack_2: atk("attack_2.json", 6),                     // 6 frames → 9 fps
    },
    defaultSize: { w: 100, h: 100 }, anchorOffsetY: 0, scale: 2.2,
  },

  paladin: {
    id: "paladin", name: "Paladin",
    basePath: "/assets/enemy/paladin/v0",
    animations: {
      idle: a_idle, run: a_run, death: a_death_12,
      attack_1: atk("attack_1.json", 63),                    // 63 frames → 90 fps
    },
    defaultSize: { w: 160, h: 128 }, anchorOffsetY: 0.1, scale: 1.6,
  },

  ronin_enemy: {
    id: "ronin_enemy", name: "Ronin",
    basePath: "/assets/enemy/ronin_enemy/v0",
    animations: {
      idle: a_idle, run: a_run, death: a_death_10,
      attack_1: atk("attack_1.json", 25),                    // 25 frames → 36 fps
      attack_2: atk("attack_2.json", 25),                    // 25 frames → 36 fps
    },
    defaultSize: { w: 64, h: 64 }, anchorOffsetY: 0.15, scale: 6,
  },

  reaper: {
    id: "reaper", name: "Reaper",
    basePath: "/assets/enemy/reaper/v0",
    animations: {
      idle: { json: "idle.json", fps: 8, loop: true },
      run: a_run, death: a_death_12,
      attack_1: atk("attack_1.json", 30),                    // 30 frames → 43 fps
      attack_2: atk("attack_2.json", 30),                    // 30 frames → 43 fps
    },
    defaultSize: { w: 170, h: 96 }, anchorOffsetY: 0, scale: 2,
  },

  soldier: {
    id: "soldier", name: "Soldier",
    basePath: "/assets/enemy/soldier/v0",
    animations: {
      idle: a_idle, run: a_run, death: a_death_10, hurt: a_hurt,
      attack_1: atk("attack_1.json", 6),                     // 6 frames → 9 fps
      attack_2: atk("attack_2.json", 6),                     // 6 frames → 9 fps
      attack_3: atk("attack_3.json", 9),                     // 9 frames → 13 fps
    },
    defaultSize: { w: 100, h: 100 }, anchorOffsetY: 0.45, scale: 3.3,
  },

  striker: {
    id: "striker", name: "Striker",
    basePath: "/assets/enemy/striker/v0",
    animations: {
      idle: a_idle, run: a_run, death: a_death_12, hurt: a_hurt,
      attack_1: atk("attack_1.json", 16),                    // 16 frames → 23 fps
      attack_2: atk("attack_2.json", 12),                    // 12 frames → 17 fps
    },
    defaultSize: { w: 128, h: 96 }, anchorOffsetY: 0, scale: 2,
  },

  training_dummy: {
    id: "training_dummy", name: "Training Dummy",
    basePath: "/assets/enemy/dummy",
    animations: {
      idle:  { json: "idle.json",  fps: 4,  loop: true },
      hurt:  { json: "hurt.json",  fps: 10, loop: false },
      death: { json: "death.json", fps: 10, loop: false },
    },
    defaultSize: { w: 32, h: 32 }, anchorOffsetY: 0, scale: 5,
  },
};

// ─── Variant skin helper ─────────────────────────────────

const VARIANT_COLORS = [
  { suffix: "crimson",  sub: "v1_crimson",  label: "Crimson" },
  { suffix: "emerald",  sub: "v2_emerald",  label: "Emerald" },
  { suffix: "azure",    sub: "v3_azure",    label: "Azure" },
  { suffix: "golden",   sub: "v4_golden",   label: "Golden" },
  { suffix: "violet",   sub: "v5_violet",   label: "Violet" },
  { suffix: "frost",    sub: "v6_frost",    label: "Frost" },
  { suffix: "shadow",   sub: "v7_shadow",   label: "Shadow" },
] as const;

const VARIANT_BASES = [
  "blue_witch", "king", "knight_enemy", "necromancer_2",
  "orc", "paladin", "reaper", "ronin_enemy", "soldier", "striker",
] as const;

for (const baseId of VARIANT_BASES) {
  const base = ENEMY_SKINS[baseId];
  if (!base) continue;
  const parentPath = base.basePath.replace(/\/v0$/, "");
  for (const v of VARIANT_COLORS) {
    const vid = `${baseId}__${v.sub}`;
    ENEMY_SKINS[vid] = {
      ...base,
      id: vid,
      name: `${v.label} ${base.name}`,
      basePath: `${parentPath}/${v.sub}`,
    };
  }
}

const GOBLIN_VARIANTS = [
  { id: "goblin_azure",   sub: "goblin_azure",   label: "Azure Goblin" },
  { id: "goblin_crimson",  sub: "goblin_crimson",  label: "Crimson Goblin" },
  { id: "goblin_emerald",  sub: "goblin_emerald",  label: "Emerald Goblin" },
  { id: "goblin_frost",    sub: "goblin_frost",    label: "Frost Goblin" },
  { id: "goblin_golden",   sub: "goblin_golden",   label: "Golden Goblin" },
  { id: "goblin_shadow",   sub: "goblin_shadow",   label: "Shadow Goblin" },
  { id: "goblin_violet",   sub: "goblin_violet",   label: "Violet Goblin" },
] as const;

for (const gv of GOBLIN_VARIANTS) {
  ENEMY_SKINS[gv.id] = {
    ...ENEMY_SKINS.goblin_black,
    id: gv.id,
    name: gv.label,
    basePath: `/assets/enemy/goblin/${gv.sub}`,
  };
}

const NINJA_VARIANTS = [
  { id: "ninja_azure",    sub: "yellow_azure",    label: "Azure Ninja" },
  { id: "ninja_crimson",   sub: "yellow_crimson",   label: "Crimson Ninja" },
  { id: "ninja_emerald",   sub: "yellow_emerald",   label: "Emerald Ninja" },
  { id: "ninja_frost",     sub: "yellow_frost",     label: "Frost Ninja" },
  { id: "ninja_golden",    sub: "yellow_golden",    label: "Golden Ninja" },
  { id: "ninja_shadow",    sub: "yellow_shadow",    label: "Shadow Ninja" },
  { id: "ninja_violet",    sub: "yellow_violet",    label: "Violet Ninja" },
] as const;

for (const nv of NINJA_VARIANTS) {
  ENEMY_SKINS[nv.id] = {
    ...ENEMY_SKINS.yellow_ninja,
    id: nv.id,
    name: nv.label,
    basePath: `/assets/enemy/ninja/${nv.sub}`,
  };
}

const NECRO1_VARIANTS = [
  { id: "necromancer_1_azure",   sub: "necromancer_azure",   label: "Azure Necromancer" },
  { id: "necromancer_1_crimson",  sub: "necromancer_crimson",  label: "Crimson Necromancer" },
  { id: "necromancer_1_emerald",  sub: "necromancer_emerald",  label: "Emerald Necromancer" },
  { id: "necromancer_1_frost",    sub: "necromancer_frost",    label: "Frost Necromancer" },
  { id: "necromancer_1_golden",   sub: "necromancer_golden",   label: "Golden Necromancer" },
  { id: "necromancer_1_shadow",   sub: "necromancer_shadow",   label: "Shadow Necromancer" },
  { id: "necromancer_1_violet",   sub: "necromancer_violet",   label: "Violet Necromancer" },
] as const;

for (const nv of NECRO1_VARIANTS) {
  ENEMY_SKINS[nv.id] = {
    ...ENEMY_SKINS.necromancer_1,
    id: nv.id,
    name: nv.label,
    basePath: `/assets/enemy/necromancer/${nv.sub}`,
  };
}

const NB_VARIANTS = [
  { id: "night_born_azure",   sub: "night_born_azure",   label: "Azure Night Born" },
  { id: "night_born_crimson",  sub: "night_born_crimson",  label: "Crimson Night Born" },
  { id: "night_born_emerald",  sub: "night_born_emerald",  label: "Emerald Night Born" },
  { id: "night_born_frost",    sub: "night_born_frost",    label: "Frost Night Born" },
  { id: "night_born_golden",   sub: "night_born_golden",   label: "Golden Night Born" },
  { id: "night_born_shadow",   sub: "night_born_shadow",   label: "Shadow Night Born" },
  { id: "night_born_violet",   sub: "night_born_violet",   label: "Violet Night Born" },
] as const;

for (const nv of NB_VARIANTS) {
  ENEMY_SKINS[nv.id] = {
    ...ENEMY_SKINS.night_born_1,
    id: nv.id,
    name: nv.label,
    basePath: `/assets/enemy/night_born/${nv.sub}`,
  };
}

// ─── Lookup helpers ──────────────────────────────────────

/**
 * Get enemy skin ID for a monster name.
 * Falls back to a random skin if no mapping exists.
 */
export function getSkinForMonster(monsterName: string): string {
  if (MONSTER_SKIN_MAP[monsterName]) return MONSTER_SKIN_MAP[monsterName];
  const allIds = Object.keys(ENEMY_SKINS);
  return allIds[Math.floor(Math.random() * allIds.length)];
}

/**
 * Resolve the actual registered skin ID from server-provided skinId + skinVariant.
 */
export function resolveEnemySkin(skinId: string, skinVariant: string, monsterName: string): string {
  if (skinId && skinVariant) {
    const variantKey = `${skinId}__${skinVariant}`;
    if (ENEMY_SKINS[variantKey]) return variantKey;
    if (ENEMY_SKINS[skinVariant]) return skinVariant;
  }
  if (skinId && ENEMY_SKINS[skinId]) return skinId;
  return getSkinForMonster(monsterName);
}

export function getHeroSkin(id: string): SkinConfig | undefined {
  return HERO_SKINS[id];
}

export function getEnemySkin(id: string): SkinConfig | undefined {
  return ENEMY_SKINS[id];
}

export function listHeroSkins(): string[] {
  return Object.keys(HERO_SKINS);
}

export function listEnemySkins(): string[] {
  return Object.keys(ENEMY_SKINS);
}

export function getSkinsForClass(classId: string): SkinConfig[] {
  return Object.values(HERO_SKINS).filter(s => s.classId === classId);
}
