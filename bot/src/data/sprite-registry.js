/**
 * Sprite Registry — central catalogue of all hero and enemy skins.
 *
 * Adding a new skin:
 *  1. Place Aseprite-exported JSON + PNG in the appropriate assets folder.
 *  2. Add an entry to HERO_SKINS or ENEMY_SKINS below.
 *  3. The game will pick it up via getHeroSkin() / getEnemySkin().
 *
 * Required animations per role:
 *  - Hero:  idle (loop), attack1 (one-shot), [optional: hurt, run]
 *  - Enemy: idle (loop), run (one-shot), death (one-shot)
 *
 * Each skin entry:
 *  @property {string} id          — unique identifier (matches folder name)
 *  @property {string} name        — display name
 *  @property {string} basePath    — path to sprite folder (relative to project root)
 *  @property {Object} animations  — { name: { json, fps, loop } } for SpriteEngine
 *  @property {Object} defaultSize — { w, h } default draw size in CSS px
 */

// ─── Hero Skins ──────────────────────────────────────────

export const HERO_SKINS = {
  samurai_1: {
    id: "samurai_1",
    name: "Samurai",
    basePath: "/src/assets/characters/samurai_1",
    animations: {
      idle:    { json: "IDLE.json",      fps: 8,  loop: true },
      attack1: { json: "ATTACK 1.json",  fps: 14, loop: false },
      hurt:    { json: "HURT.json",      fps: 10, loop: false },
      run:     { json: "RUN.json",       fps: 12, loop: true },
    },
    defaultSize: { w: 252, h: 336 },
  },
};

// ─── Enemy Skins ─────────────────────────────────────────

export const ENEMY_SKINS = {
  goblin_black: {
    id: "goblin_black",
    name: "Goblin Scout",
    basePath: "/src/assets/enemy/goblin_black",
    animations: {
      run:   { json: "goblin scout - silhouette all animations-run.json",     fps: 10, loop: false },
      idle:  { json: "goblin scout - silhouette all animations-idle.json",    fps: 8,  loop: true },
      death: { json: "goblin scout - silhouette all animations-death 1.json", fps: 10, loop: false },
    },
    defaultSize: { w: 210, h: 210 },
  },
};

// ─── Lookup helpers ──────────────────────────────────────

/**
 * Get a hero skin config by ID.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getHeroSkin(id) {
  return HERO_SKINS[id];
}

/**
 * Get an enemy skin config by ID.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getEnemySkin(id) {
  return ENEMY_SKINS[id];
}

/**
 * List all available hero skin IDs.
 * @returns {string[]}
 */
export function listHeroSkins() {
  return Object.keys(HERO_SKINS);
}

/**
 * List all available enemy skin IDs.
 * @returns {string[]}
 */
export function listEnemySkins() {
  return Object.keys(ENEMY_SKINS);
}
