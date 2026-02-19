/**
 * Asset paths & skin metadata — shared registry.
 *
 * Contains paths to static game assets (character sprites, enemy sprites,
 * potions, skill tree emblems, backgrounds) so they can be referenced
 * from both the bot frontend and the wiki.
 *
 * Actual sprite animation configs (fps, loop, json atlas) stay in
 * bot/src/data/sprite-registry.ts since they are FE-rendering-only.
 */

// ── Hero Skin Metadata ──────────────────────────────────

export interface HeroSkinMeta {
  id: string;
  name: string;
  classId: string;
  /** Base path to sprite folder (relative to assets root). */
  basePath: string;
}

export const HERO_SKINS_META: readonly HeroSkinMeta[] = [
  // ── Samurai ──
  { id: "samurai_1", name: "Samurai",     classId: "samurai", basePath: "/assets/characters/samurai/samurai_1" },
  { id: "samurai_2", name: "Samurai II",  classId: "samurai", basePath: "/assets/characters/samurai/samurai_2" },
  { id: "samurai_3", name: "Samurai III", classId: "samurai", basePath: "/assets/characters/samurai/samurai_3" },
  { id: "samurai_4", name: "Samurai IV",  classId: "samurai", basePath: "/assets/characters/samurai/samurai_4" },
  // ── Knight / Warrior ──
  { id: "knight_1", name: "Knight",       classId: "warrior", basePath: "/assets/characters/knight/knight_1" },
  { id: "knight_2", name: "Knight II",    classId: "warrior", basePath: "/assets/characters/knight/knight_2" },
  { id: "knight_3", name: "Knight III",   classId: "warrior", basePath: "/assets/characters/knight/knight_3" },
  { id: "knight_4", name: "Knight IV",    classId: "warrior", basePath: "/assets/characters/knight/knight_4" },
  // ── Wizard / Mage ──
  { id: "wizard_1", name: "Wizard",       classId: "mage",   basePath: "/assets/characters/wizard/wizard_1" },
  { id: "wizard_2", name: "Wizard II",    classId: "mage",   basePath: "/assets/characters/wizard/wizard_2" },
  // ── Archer ──
  { id: "archer_1", name: "Archer",       classId: "archer",  basePath: "/assets/characters/archer/archer_1" },
  { id: "archer_2", name: "Archer II",    classId: "archer",  basePath: "/assets/characters/archer/archer_2" },
  { id: "archer_3", name: "Archer III",   classId: "archer",  basePath: "/assets/characters/archer/archer_3" },
  { id: "archer_4", name: "Archer IV",    classId: "archer",  basePath: "/assets/characters/archer/archer_4/Character" },
] as const;

/** Quick lookup: skinId → HeroSkinMeta. */
export const HERO_SKIN_MAP: Record<string, HeroSkinMeta> = Object.fromEntries(
  HERO_SKINS_META.map(s => [s.id, s]),
);

/** Get all hero skins for a given class. */
export function getHeroSkinsForClass(classId: string): HeroSkinMeta[] {
  return HERO_SKINS_META.filter(s => s.classId === classId);
}

// ── Enemy Skin Metadata ─────────────────────────────────

export interface EnemySkinMeta {
  id: string;
  name: string;
  basePath: string;
}

/** Base enemy skins (before color variant expansion). */
export const ENEMY_SKINS_META: readonly EnemySkinMeta[] = [
  { id: "goblin_black",   name: "Goblin Scout",    basePath: "/assets/enemy/goblin/goblin_black" },
  { id: "yellow_ninja",   name: "Yellow Ninja",     basePath: "/assets/enemy/ninja/yellow_ninja" },
  { id: "necromancer_1",  name: "Necromancer",      basePath: "/assets/enemy/necromancer/necromancer_1" },
  { id: "night_born_1",   name: "Night Born",       basePath: "/assets/enemy/night_born/night_born_1" },
  { id: "blue_witch",     name: "Blue Witch",       basePath: "/assets/enemy/blue_witch/v0" },
  { id: "king",           name: "King",             basePath: "/assets/enemy/king/v0" },
  { id: "knight_enemy",   name: "Dark Knight",      basePath: "/assets/enemy/knight_enemy/v0" },
  { id: "necromancer_2",  name: "Necromancer II",   basePath: "/assets/enemy/necromancer_2/v0" },
  { id: "orc",            name: "Orc",              basePath: "/assets/enemy/orc/v0" },
  { id: "paladin",        name: "Paladin",          basePath: "/assets/enemy/paladin/v0" },
  { id: "ronin_enemy",    name: "Ronin",            basePath: "/assets/enemy/ronin_enemy/v0" },
  { id: "reaper",         name: "Reaper",           basePath: "/assets/enemy/reaper/v0" },
  { id: "soldier",        name: "Soldier",          basePath: "/assets/enemy/soldier/v0" },
  { id: "striker",        name: "Striker",           basePath: "/assets/enemy/striker/v0" },
  { id: "training_dummy", name: "Training Dummy",   basePath: "/assets/enemy/dummy" },
] as const;

/** Quick lookup: enemySkinId → EnemySkinMeta. */
export const ENEMY_SKIN_MAP: Record<string, EnemySkinMeta> = Object.fromEntries(
  ENEMY_SKINS_META.map(s => [s.id, s]),
);

// ── Monster Name → Skin ID mapping ─────────────────────

export const MONSTER_SKIN_MAP: Record<string, string> = {
  Goblin:         "goblin_black",
  Ninja:          "yellow_ninja",
  Necromancer:    "necromancer_1",
  "Night Born":   "night_born_1",
  "Dark Knight":  "knight_enemy",
  Reaper:         "reaper",
  Bandit:         "soldier",
  "Wild Boar":    "orc",
  "Forest Spirit":"blue_witch",
  Ronin:          "ronin_enemy",
  Oni:            "king",
  Tengu:          "necromancer_2",
  Dragon:         "paladin",
  Shogun:         "striker",
};

// ── Skill Tree Emblem Images ────────────────────────────

/** Class emblem background images for the skill tree canvas. */
export const CLASS_EMBLEM_IMG: Record<string, string> = {
  samurai: "skiiltree/samurai.png",
  warrior: "skiiltree/warrior.png",
  mage:    "skiiltree/mage.png",
  archer:  "skiiltree/archer.png",
};

// ── Potion Sprite Paths ─────────────────────────────────

/** Potion sprite base paths by flask type (red color). */
export const POTION_SPRITE_PATHS: Record<string, string> = {
  small_vial:   "/assets/potions/small_vial/red",
  round_flask:  "/assets/potions/round_flask/red",
  corked_flask: "/assets/potions/corked_flask/red",
  tall_bottle:  "/assets/potions/tall_bottle/red",
  wide_bottle:  "/assets/potions/wide_bottle/red",
  jug:          "/assets/potions/jug/red",
};

// ── Background Paths ────────────────────────────────────

/** Background image paths for game locations. */
export const BACKGROUND_PATHS: Record<string, string> = {
  castle:         "/assets/background/castle",
  cave:           "/assets/background/cave",
  dojo:           "/assets/background/dojo",
  fields:         "/assets/background/fields",
  hideout:        "/assets/background/hideout",
  meadow:         "/assets/background/meadow",
  snow_mountain:  "/assets/background/snow_mountain",
};
