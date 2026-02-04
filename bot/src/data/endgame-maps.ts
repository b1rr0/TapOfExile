/**
 * Endgame Map System — PoE-style mapping after story completion.
 *
 * ═══════════════════════════════════════════════════════════════
 *  НАСТРОЙКИ — все числа для быстрой балансировки собраны здесь
 * ═══════════════════════════════════════════════════════════════
 */

import { isActComplete, TOTAL_ACTS, ALL_LOCATIONS } from "./locations.js";
import type { BagItem, BossMap, BossKeyTierDef, MapTier, DropSettings, Wave } from "../types.js";

/* ══════════════════════════════════════════════════════════════
 *  DROP SETTINGS — шансы дропа карт (легко менять)
 * ══════════════════════════════════════════════════════════════ */

export const DROP_SETTINGS: DropSettings = {
  /* --- Regular map drops --- */
  regular: {
    sameTierChance:   0.60,   // 60% — ключ того же тира
    tierUpChance:     0.20,   // 20% — ключ тир+1
    bossKeyChance:    0.05,   // 5%  — ключ босса (от тир 5+)
    bossKeyMinTier:   5,      // минимальный тир для дропа боссовых ключей
  },
  /* --- Boss map drops --- */
  boss: {
    guaranteedTierMin: 5,     // гарантированный дроп — тир от
    guaranteedTierMax: 8,     // гарантированный дроп — тир до
    bonusKeyChance:    0.30,  // 30% — бонусный ключ (тир+1)
    bossKeyChance:     0.05,  // 5%  — ключ босса
  },
};

/* ══════════════════════════════════════════════════════════════
 *  BOSS KEY TIERS — 3 уровня сложности проходки на боса
 *
 *  tier 1 = обычная (серебро)   — дропает с тир 5-6 regular maps
 *  tier 2 = усиленная (золото)  — дропает с тир 7-8 regular maps
 *  tier 3 = ультра (красная)    — дропает с тир 9-10 regular maps / boss maps
 *
 *  hpScale  — множитель HP босса поверх его базового hpMul
 *  goldScale / xpScale — множители наград
 * ══════════════════════════════════════════════════════════════ */

export const BOSS_KEY_TIERS: BossKeyTierDef[] = [
  { tier: 1, name: "Standard",  quality: "boss_silver", hpScale: 1.0, goldScale: 1.0, xpScale: 1.0 },
  { tier: 2, name: "Empowered", quality: "boss_gold",   hpScale: 1.8, goldScale: 2.0, xpScale: 1.8 },
  { tier: 3, name: "Mythic",    quality: "boss_red",    hpScale: 3.0, goldScale: 3.5, xpScale: 3.0 },
];

/** Get boss key tier def by tier number (1-3). */
export function getBossKeyTierDef(tier: number): BossKeyTierDef {
  return BOSS_KEY_TIERS[Math.max(0, Math.min(tier - 1, BOSS_KEY_TIERS.length - 1))];
}

/**
 * Pick boss key tier based on source map tier.
 * Tier 5-6 → boss_tier 1, Tier 7-8 → boss_tier 2, Tier 9-10 → boss_tier 3.
 * Boss maps always drop tier 3.
 */
function pickBossKeyTier(sourceTier: number, isBossMap: boolean): number {
  if (isBossMap) return 3;
  if (sourceTier >= 9) return 3;
  if (sourceTier >= 7) return 2;
  return 1;
}

/* ══════════════════════════════════════════════════════════════
 *  TIER DEFINITIONS — 10 уровней сложности
 * ══════════════════════════════════════════════════════════════ */

export const MAX_TIER: number = 10;

export const MAP_TIERS: MapTier[] = [
  { tier: 1,  name: "Tier I",    hpMul: 1.0,  goldMul: 1.0,  xpMul: 1.0  },
  { tier: 2,  name: "Tier II",   hpMul: 1.5,  goldMul: 1.4,  xpMul: 1.3  },
  { tier: 3,  name: "Tier III",  hpMul: 2.2,  goldMul: 1.9,  xpMul: 1.7  },
  { tier: 4,  name: "Tier IV",   hpMul: 3.2,  goldMul: 2.5,  xpMul: 2.2  },
  { tier: 5,  name: "Tier V",    hpMul: 4.5,  goldMul: 3.2,  xpMul: 2.8  },
  { tier: 6,  name: "Tier VI",   hpMul: 6.5,  goldMul: 4.2,  xpMul: 3.5  },
  { tier: 7,  name: "Tier VII",  hpMul: 9.0,  goldMul: 5.5,  xpMul: 4.5  },
  { tier: 8,  name: "Tier VIII", hpMul: 13.0, goldMul: 7.2,  xpMul: 5.8  },
  { tier: 9,  name: "Tier IX",   hpMul: 18.0, goldMul: 9.5,  xpMul: 7.5  },
  { tier: 10, name: "Tier X",    hpMul: 25.0, goldMul: 13.0, xpMul: 10.0 },
];

/** Get tier definition by number (1-10). */
export function getTierDef(tier: number): MapTier {
  return MAP_TIERS[Math.max(0, Math.min(tier - 1, MAP_TIERS.length - 1))];
}

/* ══════════════════════════════════════════════════════════════
 *  8 BOSS MAPS — все настройки каждого босса в одном месте
 *
 *  id          — уникальный ключ
 *  name        — название карты
 *  description — описание для UI
 *  bossType    — тип монстра (из monsters.ts)
 *  icon        — эмодзи для direction picker
 *  hpMul / goldMul / xpMul — множители сложности/наград
 *  trashWaves  — волны мобов ДО босса (можно настраивать на босса)
 * ══════════════════════════════════════════════════════════════ */

export const BOSS_MAPS: BossMap[] = [
  {
    id: "boss_shadow_shogun",
    name: "Shadow Shogun's Domain",
    description: "The shadow of the fallen Shogun lingers, more powerful than ever.",
    bossType: "Shogun",
    icon: "\u2694\uFE0F",
    hpMul: 8.0,   goldMul: 10.0, xpMul: 8.0,
    trashWaves: [
      { monsters: [{ type: "Ronin", count: 3, rarity: "rare" }, { type: "Oni", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Dragon", count: 2, rarity: "epic" }, { type: "Shogun", count: 1, rarity: "epic" }] },
    ],
  },
  {
    id: "boss_ancient_dragon",
    name: "Dragon's Eternal Lair",
    description: "An ancient dragon hoards centuries of stolen power.",
    bossType: "Dragon",
    icon: "\uD83D\uDC09",
    hpMul: 10.0,  goldMul: 12.0, xpMul: 10.0,
    trashWaves: [
      { monsters: [{ type: "Tengu", count: 3, rarity: "rare" }, { type: "Dragon", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Shogun", count: 2, rarity: "epic" }, { type: "Dragon", count: 1, rarity: "epic" }] },
    ],
  },
  {
    id: "boss_demon_oni",
    name: "Oni Warlord's Throne",
    description: "The demon warlord commands legions from his blood-soaked throne.",
    bossType: "Oni",
    icon: "\uD83D\uDC79",
    hpMul: 7.0,   goldMul: 9.0,  xpMul: 7.0,
    trashWaves: [
      { monsters: [{ type: "Oni", count: 4, rarity: "rare" }, { type: "Ronin", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Oni", count: 2, rarity: "epic" }, { type: "Tengu", count: 1, rarity: "epic" }] },
    ],
  },
  {
    id: "boss_wind_tengu",
    name: "Tengu Mountain Peak",
    description: "The wind spirit rules from the highest peak, untouched by mortals.",
    bossType: "Tengu",
    icon: "\uD83C\uDF2A\uFE0F",
    hpMul: 9.0,   goldMul: 11.0, xpMul: 9.0,
    trashWaves: [
      { monsters: [{ type: "Tengu", count: 4, rarity: "rare" }, { type: "Oni", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Dragon", count: 1, rarity: "epic" }, { type: "Tengu", count: 2, rarity: "epic" }] },
    ],
  },
  {
    id: "boss_phantom_ronin",
    name: "Ronin's Haunted Dojo",
    description: "A phantom swordsman endlessly relives his final duel.",
    bossType: "Ronin",
    icon: "\uD83D\uDC7B",
    hpMul: 6.0,   goldMul: 8.0,  xpMul: 6.0,
    trashWaves: [
      { monsters: [{ type: "Ronin", count: 4, rarity: "rare" }, { type: "Tengu", count: 1, rarity: "rare" }] },
      { monsters: [{ type: "Ronin", count: 2, rarity: "epic" }, { type: "Shogun", count: 1, rarity: "epic" }] },
    ],
  },
  {
    id: "boss_forest_guardian",
    name: "Spirit of the Ancient Wood",
    description: "The forest itself rises to crush all intruders.",
    bossType: "Forest Spirit",
    icon: "\uD83C\uDF33",
    hpMul: 7.5,   goldMul: 9.5,  xpMul: 7.5,
    trashWaves: [
      { monsters: [{ type: "Oni", count: 3, rarity: "rare" }, { type: "Tengu", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Dragon", count: 2, rarity: "epic" }, { type: "Shogun", count: 1, rarity: "epic" }] },
    ],
  },
  {
    id: "boss_beast_king",
    name: "The Beast King's Arena",
    description: "The mightiest beast challenges all who enter its domain.",
    bossType: "Wild Boar",
    icon: "\uD83D\uDC17",
    hpMul: 6.5,   goldMul: 8.5,  xpMul: 6.5,
    trashWaves: [
      { monsters: [{ type: "Ronin", count: 3, rarity: "rare" }, { type: "Oni", count: 3, rarity: "rare" }] },
      { monsters: [{ type: "Tengu", count: 2, rarity: "epic" }, { type: "Dragon", count: 1, rarity: "epic" }] },
    ],
  },
  {
    id: "boss_bandit_lord",
    name: "Bandit Lord's Fortress",
    description: "The lord of thieves has fortified his lair with traps and soldiers.",
    bossType: "Bandit",
    icon: "\uD83D\uDDE1\uFE0F",
    hpMul: 5.5,   goldMul: 7.5,  xpMul: 5.5,
    trashWaves: [
      { monsters: [{ type: "Ronin", count: 4, rarity: "rare" }, { type: "Oni", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Oni", count: 2, rarity: "epic" }, { type: "Tengu", count: 1, rarity: "epic" }] },
    ],
  },
];

/** Get boss definition by id. */
export function getBossDef(bossId: string): BossMap | null {
  return BOSS_MAPS.find(b => b.id === bossId) || null;
}

/* ── Wave templates for regular maps ─────────────────────── */

/**
 * 5 wave-pack templates, selected based on tier bracket.
 * Tiers 1-2 use template 0, 3-4 use 1, 5-6 use 2, 7-8 use 3, 9-10 use 4.
 */
const MAP_WAVE_TEMPLATES: Wave[][] = [
  // bracket 0: tiers 1-2 — moderate packs
  [
    { monsters: [{ type: "Ronin", count: 4, rarity: "common" }, { type: "Oni", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Oni", count: 3, rarity: "rare" }, { type: "Tengu", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Tengu", count: 2, rarity: "epic" }] },
  ],
  // bracket 1: tiers 3-4 — heavier packs
  [
    { monsters: [{ type: "Oni", count: 4, rarity: "common" }, { type: "Tengu", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Tengu", count: 3, rarity: "rare" }, { type: "Ronin", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dragon", count: 1, rarity: "rare" }, { type: "Tengu", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Dragon", count: 1, rarity: "epic" }] },
  ],
  // bracket 2: tiers 5-6 — dangerous packs
  [
    { monsters: [{ type: "Tengu", count: 4, rarity: "common" }, { type: "Dragon", count: 1, rarity: "common" }] },
    { monsters: [{ type: "Dragon", count: 2, rarity: "rare" }, { type: "Oni", count: 3, rarity: "rare" }] },
    { monsters: [{ type: "Dragon", count: 2, rarity: "epic" }, { type: "Tengu", count: 1, rarity: "epic" }] },
    { monsters: [{ type: "Shogun", count: 1, rarity: "rare" }] },
  ],
  // bracket 3: tiers 7-8 — brutal packs
  [
    { monsters: [{ type: "Dragon", count: 3, rarity: "common" }, { type: "Shogun", count: 1, rarity: "common" }] },
    { monsters: [{ type: "Shogun", count: 2, rarity: "rare" }, { type: "Dragon", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dragon", count: 2, rarity: "epic" }, { type: "Shogun", count: 1, rarity: "epic" }] },
    { monsters: [{ type: "Shogun", count: 1, rarity: "boss" }] },
  ],
  // bracket 4: tiers 9-10 — endgame apex
  [
    { monsters: [{ type: "Shogun", count: 3, rarity: "common" }, { type: "Dragon", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dragon", count: 3, rarity: "rare" }, { type: "Shogun", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Shogun", count: 2, rarity: "epic" }, { type: "Dragon", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Tengu", count: 1, rarity: "boss" }, { type: "Dragon", count: 1, rarity: "boss" }] },
    { monsters: [{ type: "Shogun", count: 1, rarity: "boss" }] },
  ],
];

/** Get wave array for a regular map tier (1-10). */
export function getWavesForTier(tier: number): Wave[] {
  const bracket = Math.min(4, Math.floor((tier - 1) / 2));
  return MAP_WAVE_TEMPLATES[bracket];
}

/* ── Boss map waves ──────────────────────────────────────── */

/**
 * Build waves for a boss map: boss-specific trash waves + boss as final monster.
 * Trash waves are now per-boss (defined in BOSS_MAPS.trashWaves).
 */
export function getBossMapWaves(bossId: string): Wave[] {
  const bossDef = getBossDef(bossId);
  if (!bossDef) return [];

  const trash: Wave[] = bossDef.trashWaves || [
    { monsters: [{ type: "Oni", count: 3, rarity: "rare" }, { type: "Tengu", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dragon", count: 2, rarity: "epic" }, { type: "Shogun", count: 1, rarity: "epic" }] },
  ];

  return [
    ...trash,
    { monsters: [{ type: bossDef.bossType, count: 1, rarity: "boss" }] },
  ];
}

/* ── Map key item factories ──────────────────────────────── */

export const MAP_KEY_TYPES: Record<string, string> = {
  regular: "map_key",
  boss: "boss_map_key",
};

/** Quality string based on tier. */
function tierQuality(tier: number): string {
  if (tier <= 3) return "common";
  if (tier <= 6) return "rare";
  if (tier <= 9) return "epic";
  return "legendary";
}

/**
 * Pick a random story location from ALL_LOCATIONS.
 * Each map key is tied to a random location (with its name, act, background, modifiers).
 */
function pickRandomLocation() {
  return ALL_LOCATIONS[Math.floor(Math.random() * ALL_LOCATIONS.length)];
}

/**
 * Create a regular map key item for the bag.
 * Each key gets a random story location (name, background, buffs/debuffs).
 */
export function createMapKeyItem(tier: number): BagItem {
  const tierDef = getTierDef(tier);
  const loc = pickRandomLocation();
  return {
    id: `map_t${tier}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: loc.name,
    type: MAP_KEY_TYPES.regular,
    tier,
    quality: tierQuality(tier),
    level: tier,
    icon: "\uD83D\uDDFA\uFE0F",
    locationId: loc.id,
    locationAct: loc.act,
    acquiredAt: Date.now(),
  };
}

/**
 * Create a boss map key item for the bag.
 */
export function createBossMapKeyItem(bossId: string, bossKeyTier: number = 1): BagItem | null {
  const bossDef = getBossDef(bossId);
  if (!bossDef) return null;
  const bkt = getBossKeyTierDef(bossKeyTier);
  return {
    id: `bosskey_${bossId}_t${bossKeyTier}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: bossDef.name,
    type: MAP_KEY_TYPES.boss,
    bossId,
    bossKeyTier,
    quality: bkt.quality,
    level: bossKeyTier,
    icon: bossDef.icon || "\uD83D\uDC80",
    acquiredAt: Date.now(),
  };
}

/* ── Map drop logic ──────────────────────────────────────── */

/**
 * Roll map key drops after completing a map.
 */
export function rollMapDrops(tier: number, isBossMap: boolean = false, direction: string | null = null): BagItem[] {
  const drops: BagItem[] = [];
  const S = DROP_SETTINGS;

  if (isBossMap) {
    // Boss maps always drop 1-2 regular keys
    const range = S.boss.guaranteedTierMax - S.boss.guaranteedTierMin + 1;
    const dropTier = Math.min(MAX_TIER, Math.floor(Math.random() * range) + S.boss.guaranteedTierMin);
    drops.push(createMapKeyItem(dropTier));
    if (Math.random() < S.boss.bonusKeyChance) {
      drops.push(createMapKeyItem(Math.min(MAX_TIER, dropTier + 1)));
    }
    // Boss key drop (direction-based or random) — boss maps drop tier 3 (Mythic)
    if (Math.random() < S.boss.bossKeyChance) {
      const bkt = pickBossKeyTier(tier, true);
      if (direction) {
        const item = createBossMapKeyItem(direction, bkt);
        if (item) drops.push(item);
      } else {
        const randomBoss = BOSS_MAPS[Math.floor(Math.random() * BOSS_MAPS.length)];
        const item = createBossMapKeyItem(randomBoss.id, bkt);
        if (item) drops.push(item);
      }
    }
    return drops;
  }

  // Regular map drops
  if (Math.random() < S.regular.sameTierChance) {
    drops.push(createMapKeyItem(tier));
  }
  if (tier < MAX_TIER && Math.random() < S.regular.tierUpChance) {
    drops.push(createMapKeyItem(Math.min(MAX_TIER, tier + 1)));
  }
  // Boss key based on chosen direction — tier depends on source map tier
  if (tier >= S.regular.bossKeyMinTier && Math.random() < S.regular.bossKeyChance) {
    const bkt = pickBossKeyTier(tier, false);
    if (direction) {
      const item = createBossMapKeyItem(direction, bkt);
      if (item) drops.push(item);
    } else {
      const randomBoss = BOSS_MAPS[Math.floor(Math.random() * BOSS_MAPS.length)];
      const item = createBossMapKeyItem(randomBoss.id, bkt);
      if (item) drops.push(item);
    }
  }

  return drops;
}

/* ── Endgame unlock check ────────────────────────────────── */

/**
 * Check if all acts' main chains are complete → endgame unlocked.
 */
export function isEndgameUnlocked(completedLocationIds: string[]): boolean {
  for (let act = 1; act <= TOTAL_ACTS; act++) {
    if (!isActComplete(act, completedLocationIds)) return false;
  }
  return true;
}
