/**
 * Sprite Registry — central catalogue of all hero and enemy skins.
 *
 * Adding a new skin:
 *  1. Place Aseprite-exported JSON + PNG in the appropriate assets folder.
 *  2. Add an entry to HERO_SKINS or ENEMY_SKINS below.
 *  3. The game will pick it up via getHeroSkin() / getEnemySkin().
 *
 * Required animations per role:
 *  - Hero:  idle (loop), attack1 (one-shot), [optional: hurt, run, death]
 *  - Enemy: idle (loop), run (one-shot), death (one-shot)
 *
 * Each skin entry:
 *  @property {string} id          — unique identifier (matches folder name)
 *  @property {string} name        — display name
 *  @property {string} classId     — character class this skin belongs to
 *  @property {string} basePath    — path to sprite folder (relative to project root)
 *  @property {Object} animations  — { name: { json, fps, loop } } for SpriteEngine
 *  @property {Object} defaultSize    — { w, h } default draw size in CSS px
 *  @property {number} anchorOffsetY  — fraction of frame height empty below feet
 *  @property {number} scale          — visual scale multiplier (1 = unchanged)
 */

import type { SkinConfig } from "../types.js";

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
    scale: 1.34,
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
    scale: 1.16,
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
    scale: 1.23,
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
    scale: 1.82,
  },

  knight_2: {
    id: "knight_2",
    name: "Knight II",
    classId: "warrior",
    basePath: "/assets/characters/knight/knight_2",
    animations: {
      idle:    { json: "idle.json",      fps: 8,  loop: true },
      attack1: { json: "attack_1.json",  fps: 12, loop: false },
      run:     { json: "run.json",       fps: 10, loop: true },
      hurt:    { json: "hurt.json",      fps: 10, loop: false },
      death:   { json: "death.json",     fps: 10, loop: false },
    },
    defaultSize: { w: 128, h: 128 },
    anchorOffsetY: 0,
    scale: 1.70,
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
    scale: 0.71,
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
    scale: 1.14,
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
    anchorOffsetY: 0.23,
    scale: 0.81,
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
    scale: 1.18,
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
    scale: 0.85,
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
    scale: 0.67,
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
    scale: 0.62,
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
    scale: 1.78,
  },
};

// ─── Enemy Skins ─────────────────────────────────────────

export const ENEMY_SKINS: Record<string, SkinConfig> = {
  goblin_black: {
    id: "goblin_black",
    name: "Goblin Scout",
    basePath: "/assets/enemy/goblin/goblin_black",
    animations: {
      run:   { json: "run.json",   fps: 10, loop: false },
      idle:  { json: "idle.json",  fps: 8,  loop: true },
      death: { json: "death.json", fps: 10, loop: false },
    },
    defaultSize: { w: 210, h: 210 },
    anchorOffsetY: 0.297,
    scale: 1,
  },

  yellow_ninja: {
    id: "yellow_ninja",
    name: "Yellow Ninja",
    basePath: "/assets/enemy/ninja/yellow_ninja",
    animations: {
      idle:  { json: "idle.json",  fps: 8,  loop: true },
      run:   { json: "walk.json",  fps: 10, loop: false },
      death: { json: "death.json", fps: 10, loop: false },
      hit:   { json: "hit.json",   fps: 10, loop: false },
    },
    defaultSize: { w: 256, h: 256 },
    anchorOffsetY: 0.25,
    scale: 1,
  },

  necromancer_1: {
    id: "necromancer_1",
    name: "Necromancer",
    basePath: "/assets/enemy/necromancer/necromancer_1",
    animations: {
      idle:  { json: "idle.json",   fps: 8,  loop: true },
      run:   { json: "run.json",    fps: 10, loop: false },
      death: { json: "death.json",  fps: 10, loop: false },
      attack:{ json: "attack.json", fps: 12, loop: false },
    },
    defaultSize: { w: 280, h: 224 },
    anchorOffsetY: 0.07,
    scale: 1,
  },

  night_born_1: {
    id: "night_born_1",
    name: "Night Born",
    basePath: "/assets/enemy/night_born/night_born_1",
    animations: {
      idle:  { json: "idle.json",   fps: 8,  loop: true },
      run:   { json: "run.json",    fps: 10, loop: false },
      death: { json: "death.json",  fps: 10, loop: false },
      attack:{ json: "attack.json", fps: 12, loop: false },
      hurt:  { json: "hurt.json",   fps: 10, loop: false },
    },
    defaultSize: { w: 200, h: 200 },
    anchorOffsetY: 0.025,
    scale: 1,
  },
};

// ─── Lookup helpers ──────────────────────────────────────

/**
 * Get a hero skin config by ID.
 */
export function getHeroSkin(id: string): SkinConfig | undefined {
  return HERO_SKINS[id];
}

/**
 * Get an enemy skin config by ID.
 */
export function getEnemySkin(id: string): SkinConfig | undefined {
  return ENEMY_SKINS[id];
}

/**
 * List all available hero skin IDs.
 */
export function listHeroSkins(): string[] {
  return Object.keys(HERO_SKINS);
}

/**
 * List all available enemy skin IDs.
 */
export function listEnemySkins(): string[] {
  return Object.keys(ENEMY_SKINS);
}

/**
 * Get all hero skins for a given character class.
 */
export function getSkinsForClass(classId: string): SkinConfig[] {
  return Object.values(HERO_SKINS).filter(s => s.classId === classId);
}
