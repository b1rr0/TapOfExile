/**
 * Universal loot pool system.
 *
 * After each combat, 3 independent rolls are made against the loot pool.
 * Each roll spins a weighted wheel:
 *   - Every item in the pool has a weight (e.g. 1000, 100, 10, 1)
 *   - "Nothing" weight = sum of all item weights (so ~50% chance to get nothing)
 *   - Adding a new item slightly dilutes existing drop rates (no separate baseChance)
 *
 * Shared between server (drop rolling) and client (display, tooltips).
 */

// ── Flask types (ascending power) ────────────────────────

export type FlaskType =
  | 'small_vial'
  | 'round_flask'
  | 'corked_flask'
  | 'tall_bottle'
  | 'wide_bottle'
  | 'jug';

/** Potion color — only red (healing) for now, future-proof. */
export type PotionColor = 'red';

export interface FlaskDef {
  type: FlaskType;
  name: string;
  /** Fraction of maxHp healed per sip (e.g. 0.08 = 8%). */
  healPercent: number;
  /** Display order, 1 = weakest. */
  order: number;
}

export const FLASK_DEFS: readonly FlaskDef[] = [
  { type: 'small_vial',   name: 'Small Vial',   healPercent: 0.08, order: 1 },
  { type: 'round_flask',  name: 'Round Flask',   healPercent: 0.12, order: 2 },
  { type: 'corked_flask', name: 'Corked Flask',  healPercent: 0.16, order: 3 },
  { type: 'tall_bottle',  name: 'Tall Bottle',   healPercent: 0.20, order: 4 },
  { type: 'wide_bottle',  name: 'Wide Bottle',   healPercent: 0.24, order: 5 },
  { type: 'jug',          name: 'Jug',           healPercent: 0.30, order: 6 },
] as const;

// ── Quality → max charges ────────────────────────────────

export const QUALITY_CHARGES: Record<string, number> = {
  common:    2,
  rare:      3,
  epic:      4,
  legendary: 5,
};

// ── Loot Pool System ─────────────────────────────────────

/** How many independent rolls per combat completion. */
export const ROLLS_PER_COMBAT = 3;

/**
 * A single item entry in the loot pool.
 * Weight determines relative drop chance.
 * "Nothing" is implicit: weight = sum of all items (always 50%).
 */
export interface LootEntry {
  /** Unique identifier for this entry (e.g. 'small_vial_common'). */
  id: string;
  /** Weight in the pool. Higher = more common. */
  weight: number;
  /** What the roll produces. */
  result: LootResult;
}

export type LootResult =
  | { type: 'potion'; flaskType: FlaskType; quality: string }
  // Future item types go here:
  // | { type: 'currency'; currencyType: string; amount: number }
  ;

/**
 * A loot pool = list of possible drops for a given source.
 * "Nothing" weight is automatically = sum of all entry weights.
 */
export interface LootPool {
  entries: LootEntry[];
}

// ── Pool Definitions per source ──────────────────────────

/**
 * Location pools (story mode, acts 1-5).
 * Weights: common ~1000, rare ~100, epic ~10, legendary ~1
 */
export const LOCATION_LOOT_POOLS: Record<number, LootPool> = {
  1: {
    entries: [
      { id: 'small_vial_common',    weight: 1000, result: { type: 'potion', flaskType: 'small_vial',   quality: 'common' } },
      { id: 'small_vial_rare',      weight: 100,  result: { type: 'potion', flaskType: 'small_vial',   quality: 'rare' } },
      { id: 'round_flask_common',   weight: 500,  result: { type: 'potion', flaskType: 'round_flask',  quality: 'common' } },
      { id: 'round_flask_rare',     weight: 50,   result: { type: 'potion', flaskType: 'round_flask',  quality: 'rare' } },
      { id: 'round_flask_epic',     weight: 5,    result: { type: 'potion', flaskType: 'round_flask',  quality: 'epic' } },

    ],
  },
  2: {
    entries: [
      { id: 'small_vial_common',    weight: 600,  result: { type: 'potion', flaskType: 'small_vial',   quality: 'common' } },
      { id: 'small_vial_rare',      weight: 60,   result: { type: 'potion', flaskType: 'small_vial',   quality: 'rare' } },
      { id: 'round_flask_common',   weight: 800,  result: { type: 'potion', flaskType: 'round_flask',  quality: 'common' } },
      { id: 'round_flask_rare',     weight: 100,  result: { type: 'potion', flaskType: 'round_flask',  quality: 'rare' } },
      { id: 'round_flask_epic',     weight: 10,   result: { type: 'potion', flaskType: 'round_flask',  quality: 'epic' } },
      { id: 'corked_flask_common',  weight: 400,  result: { type: 'potion', flaskType: 'corked_flask', quality: 'common' } },
      { id: 'corked_flask_rare',    weight: 40,   result: { type: 'potion', flaskType: 'corked_flask', quality: 'rare' } },
      { id: 'corked_flask_epic',    weight: 4,    result: { type: 'potion', flaskType: 'corked_flask', quality: 'epic' } },

    ],
  },
  3: {
    entries: [
      { id: 'round_flask_common',   weight: 500,  result: { type: 'potion', flaskType: 'round_flask',  quality: 'common' } },
      { id: 'round_flask_rare',     weight: 80,   result: { type: 'potion', flaskType: 'round_flask',  quality: 'rare' } },
      { id: 'corked_flask_common',  weight: 700,  result: { type: 'potion', flaskType: 'corked_flask', quality: 'common' } },
      { id: 'corked_flask_rare',    weight: 100,  result: { type: 'potion', flaskType: 'corked_flask', quality: 'rare' } },
      { id: 'corked_flask_epic',    weight: 10,   result: { type: 'potion', flaskType: 'corked_flask', quality: 'epic' } },
      { id: 'tall_bottle_common',   weight: 500,  result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'common' } },
      { id: 'tall_bottle_rare',     weight: 80,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'rare' } },
      { id: 'tall_bottle_epic',     weight: 10,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'epic' } },
      { id: 'tall_bottle_legendary',weight: 1,    result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'legendary' } },

    ],
  },
  4: {
    entries: [
      { id: 'corked_flask_common',  weight: 400,  result: { type: 'potion', flaskType: 'corked_flask', quality: 'common' } },
      { id: 'corked_flask_rare',    weight: 60,   result: { type: 'potion', flaskType: 'corked_flask', quality: 'rare' } },
      { id: 'tall_bottle_common',   weight: 700,  result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'common' } },
      { id: 'tall_bottle_rare',     weight: 100,  result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'rare' } },
      { id: 'tall_bottle_epic',     weight: 15,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'epic' } },
      { id: 'tall_bottle_legendary',weight: 1,    result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'legendary' } },
      { id: 'wide_bottle_common',   weight: 500,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'common' } },
      { id: 'wide_bottle_rare',     weight: 80,   result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'rare' } },
      { id: 'wide_bottle_epic',     weight: 10,   result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'epic' } },
      { id: 'wide_bottle_legendary',weight: 1,    result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'legendary' } },

    ],
  },
  5: {
    entries: [
      { id: 'tall_bottle_common',   weight: 400,  result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'common' } },
      { id: 'tall_bottle_rare',     weight: 60,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'rare' } },
      { id: 'tall_bottle_epic',     weight: 10,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'epic' } },
      { id: 'wide_bottle_common',   weight: 700,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'common' } },
      { id: 'wide_bottle_rare',     weight: 100,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'rare' } },
      { id: 'wide_bottle_epic',     weight: 20,   result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'epic' } },
      { id: 'wide_bottle_legendary',weight: 2,    result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'legendary' } },
      { id: 'jug_common',           weight: 500,  result: { type: 'potion', flaskType: 'jug',          quality: 'common' } },
      { id: 'jug_rare',             weight: 80,   result: { type: 'potion', flaskType: 'jug',          quality: 'rare' } },
      { id: 'jug_epic',             weight: 15,   result: { type: 'potion', flaskType: 'jug',          quality: 'epic' } },
      { id: 'jug_legendary',        weight: 2,    result: { type: 'potion', flaskType: 'jug',          quality: 'legendary' } },

    ],
  },
};

/**
 * Map pools (endgame, tiers 1-10).
 * Grouped into 5 brackets: 1-2, 3-4, 5-6, 7-8, 9-10.
 */
export function getMapLootPool(tier: number): LootPool {
  if (tier <= 2) {
    return {
      entries: [
        { id: 'round_flask_common',   weight: 500,  result: { type: 'potion', flaskType: 'round_flask',  quality: 'common' } },
        { id: 'round_flask_rare',     weight: 80,   result: { type: 'potion', flaskType: 'round_flask',  quality: 'rare' } },
        { id: 'corked_flask_common',  weight: 700,  result: { type: 'potion', flaskType: 'corked_flask', quality: 'common' } },
        { id: 'corked_flask_rare',    weight: 100,  result: { type: 'potion', flaskType: 'corked_flask', quality: 'rare' } },
        { id: 'corked_flask_epic',    weight: 10,   result: { type: 'potion', flaskType: 'corked_flask', quality: 'epic' } },
        { id: 'tall_bottle_common',   weight: 500,  result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'common' } },
        { id: 'tall_bottle_rare',     weight: 80,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'rare' } },
        { id: 'tall_bottle_epic',     weight: 10,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'epic' } },
        { id: 'tall_bottle_legendary',weight: 1,    result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'legendary' } },
  
      ],
    };
  }
  if (tier <= 4) {
    return {
      entries: [
        { id: 'corked_flask_common',  weight: 400,  result: { type: 'potion', flaskType: 'corked_flask', quality: 'common' } },
        { id: 'corked_flask_rare',    weight: 60,   result: { type: 'potion', flaskType: 'corked_flask', quality: 'rare' } },
        { id: 'tall_bottle_common',   weight: 700,  result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'common' } },
        { id: 'tall_bottle_rare',     weight: 100,  result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'rare' } },
        { id: 'tall_bottle_epic',     weight: 15,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'epic' } },
        { id: 'tall_bottle_legendary',weight: 1,    result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'legendary' } },
        { id: 'wide_bottle_common',   weight: 500,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'common' } },
        { id: 'wide_bottle_rare',     weight: 80,   result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'rare' } },
        { id: 'wide_bottle_epic',     weight: 10,   result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'epic' } },
        { id: 'wide_bottle_legendary',weight: 1,    result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'legendary' } },
  
      ],
    };
  }
  if (tier <= 6) {
    return {
      entries: [
        { id: 'tall_bottle_common',   weight: 300,  result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'common' } },
        { id: 'tall_bottle_rare',     weight: 50,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'rare' } },
        { id: 'tall_bottle_epic',     weight: 10,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'epic' } },
        { id: 'wide_bottle_common',   weight: 700,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'common' } },
        { id: 'wide_bottle_rare',     weight: 100,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'rare' } },
        { id: 'wide_bottle_epic',     weight: 20,   result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'epic' } },
        { id: 'wide_bottle_legendary',weight: 2,    result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'legendary' } },
        { id: 'jug_common',           weight: 600,  result: { type: 'potion', flaskType: 'jug',          quality: 'common' } },
        { id: 'jug_rare',             weight: 100,  result: { type: 'potion', flaskType: 'jug',          quality: 'rare' } },
        { id: 'jug_epic',             weight: 20,   result: { type: 'potion', flaskType: 'jug',          quality: 'epic' } },
        { id: 'jug_legendary',        weight: 2,    result: { type: 'potion', flaskType: 'jug',          quality: 'legendary' } },

      ],
    };
  }
  if (tier <= 8) {
    return {
      entries: [
        { id: 'wide_bottle_common',   weight: 600,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'common' } },
        { id: 'wide_bottle_rare',     weight: 100,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'rare' } },
        { id: 'wide_bottle_epic',     weight: 20,   result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'epic' } },
        { id: 'wide_bottle_legendary',weight: 3,    result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'legendary' } },
        { id: 'jug_common',           weight: 800,  result: { type: 'potion', flaskType: 'jug',          quality: 'common' } },
        { id: 'jug_rare',             weight: 150,  result: { type: 'potion', flaskType: 'jug',          quality: 'rare' } },
        { id: 'jug_epic',             weight: 30,   result: { type: 'potion', flaskType: 'jug',          quality: 'epic' } },
        { id: 'jug_legendary',        weight: 5,    result: { type: 'potion', flaskType: 'jug',          quality: 'legendary' } },

      ],
    };
  }
  // tier 9-10
  return {
    entries: [
      { id: 'wide_bottle_rare',     weight: 100,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'rare' } },
      { id: 'wide_bottle_epic',     weight: 30,   result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'epic' } },
      { id: 'wide_bottle_legendary',weight: 5,    result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'legendary' } },
      { id: 'jug_common',           weight: 500,  result: { type: 'potion', flaskType: 'jug',          quality: 'common' } },
      { id: 'jug_rare',             weight: 200,  result: { type: 'potion', flaskType: 'jug',          quality: 'rare' } },
      { id: 'jug_epic',             weight: 50,   result: { type: 'potion', flaskType: 'jug',          quality: 'epic' } },
      { id: 'jug_legendary',        weight: 10,   result: { type: 'potion', flaskType: 'jug',          quality: 'legendary' } },

    ],
  };
}

/** Boss map loot pool — best drops. */
export const BOSS_MAP_LOOT_POOL: LootPool = {
  entries: [
    { id: 'tall_bottle_rare',     weight: 100,  result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'rare' } },
    { id: 'tall_bottle_epic',     weight: 20,   result: { type: 'potion', flaskType: 'tall_bottle',  quality: 'epic' } },
    { id: 'wide_bottle_common',   weight: 300,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'common' } },
    { id: 'wide_bottle_rare',     weight: 150,  result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'rare' } },
    { id: 'wide_bottle_epic',     weight: 40,   result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'epic' } },
    { id: 'wide_bottle_legendary',weight: 5,    result: { type: 'potion', flaskType: 'wide_bottle',  quality: 'legendary' } },
    { id: 'jug_common',           weight: 500,  result: { type: 'potion', flaskType: 'jug',          quality: 'common' } },
    { id: 'jug_rare',             weight: 200,  result: { type: 'potion', flaskType: 'jug',          quality: 'rare' } },
    { id: 'jug_epic',             weight: 80,   result: { type: 'potion', flaskType: 'jug',          quality: 'epic' } },
    { id: 'jug_legendary',        weight: 15,   result: { type: 'potion', flaskType: 'jug',          quality: 'legendary' } },

  ],
};

// ── Rolling logic ────────────────────────────────────────

/**
 * Roll once against a loot pool.
 * "Nothing" weight = sum of all entry weights (always 50% chance of nothing).
 * Returns the LootEntry that won, or null for "nothing".
 */
export function rollPool(pool: LootPool): LootEntry | null {
  const itemsTotal = pool.entries.reduce((sum, e) => sum + e.weight, 0);
  if (itemsTotal <= 0) return null;

  // Total wheel = items + nothing (= items again) → items * 2
  const wheelTotal = itemsTotal * 2;
  let roll = Math.random() * wheelTotal;

  for (const entry of pool.entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }

  // Remaining roll falls in "nothing" zone
  return null;
}

/**
 * Roll N times against a loot pool (default: ROLLS_PER_COMBAT = 3).
 * Returns array of won entries (0 to N items, no nulls).
 */
export function rollLoot(pool: LootPool, rolls: number = ROLLS_PER_COMBAT): LootEntry[] {
  const results: LootEntry[] = [];
  for (let i = 0; i < rolls; i++) {
    const entry = rollPool(pool);
    if (entry) results.push(entry);
  }
  return results;
}

// ── Utilities (kept for backward compat + internal use) ──

/** Look up a flask definition by type. Falls back to small_vial. */
export function getFlaskDef(type: FlaskType): FlaskDef {
  return FLASK_DEFS.find((f) => f.type === type) ?? FLASK_DEFS[0];
}

/**
 * Weighted random pick from a partial record of weights.
 * Still exported for endgame-maps.ts and other consumers.
 */
export function weightedPick<T extends string>(
  weights: Partial<Record<T, number>>,
): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + (w as number), 0);
  if (total <= 0) return entries[0][0];

  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight as number;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

// ── Convenience: get pool for combat source ──────────────

export function getLootPool(
  mode: 'location' | 'map' | 'boss_map',
  actOrTier: number,
): LootPool {
  if (mode === 'location') return LOCATION_LOOT_POOLS[actOrTier] || LOCATION_LOOT_POOLS[1];
  if (mode === 'boss_map') return BOSS_MAP_LOOT_POOL;
  return getMapLootPool(actOrTier);
}

/**
 * Get pool stats for display/debugging.
 * Returns the effective drop chance per entry and total "something" chance per roll.
 */
export function getPoolStats(pool: LootPool): {
  totalItemWeight: number;
  nothingWeight: number;
  nothingChancePct: number;
  somethingChancePerRollPct: number;
  expectedDropsPerCombat: number;
  entries: { id: string; weight: number; chancePct: number }[];
} {
  const totalItemWeight = pool.entries.reduce((sum, e) => sum + e.weight, 0);
  const wheelTotal = totalItemWeight * 2;
  const nothingChance = totalItemWeight / wheelTotal; // always 0.5

  return {
    totalItemWeight,
    nothingWeight: totalItemWeight,
    nothingChancePct: nothingChance * 100,
    somethingChancePerRollPct: (1 - nothingChance) * 100,
    expectedDropsPerCombat: ROLLS_PER_COMBAT * (1 - nothingChance),
    entries: pool.entries.map((e) => ({
      id: e.id,
      weight: e.weight,
      chancePct: (e.weight / wheelTotal) * 100,
    })),
  };
}

// ── Legacy exports (backward compat) ─────────────────────
// Old code imports these — they still work but are wrappers.

export interface PotionDropConfig {
  baseChance: number;
  flaskWeights: Partial<Record<FlaskType, number>>;
  qualityWeights: Record<string, number>;
}

export interface PotionRollResult {
  flaskType: FlaskType;
  quality: string;
  maxCharges: number;
  healPercent: number;
}

/** @deprecated Use rollLoot(getLootPool(...)) instead. */
export function rollPotionDrop(
  config: PotionDropConfig,
): PotionRollResult | null {
  if (Math.random() > config.baseChance) return null;
  const flaskType = weightedPick(config.flaskWeights as Record<FlaskType, number>);
  const quality = weightedPick(config.qualityWeights as Record<string, number>);
  const flask = getFlaskDef(flaskType);
  const maxCharges = QUALITY_CHARGES[quality] ?? 2;
  return { flaskType, quality, maxCharges, healPercent: flask.healPercent };
}

/** @deprecated */
export const LOCATION_POTION_DROPS: Record<number, PotionDropConfig> = {
  1: { baseChance: 0.15, flaskWeights: { small_vial: 70, round_flask: 30 }, qualityWeights: { common: 80, rare: 18, epic: 2, legendary: 0 } },
  2: { baseChance: 0.18, flaskWeights: { small_vial: 40, round_flask: 40, corked_flask: 20 }, qualityWeights: { common: 70, rare: 25, epic: 5, legendary: 0 } },
  3: { baseChance: 0.20, flaskWeights: { round_flask: 30, corked_flask: 40, tall_bottle: 30 }, qualityWeights: { common: 55, rare: 30, epic: 12, legendary: 3 } },
  4: { baseChance: 0.22, flaskWeights: { corked_flask: 25, tall_bottle: 40, wide_bottle: 35 }, qualityWeights: { common: 40, rare: 35, epic: 18, legendary: 7 } },
  5: { baseChance: 0.25, flaskWeights: { tall_bottle: 25, wide_bottle: 40, jug: 35 }, qualityWeights: { common: 30, rare: 35, epic: 25, legendary: 10 } },
};

/** @deprecated */
export function getMapPotionDropConfig(tier: number): PotionDropConfig {
  if (tier <= 2) return { baseChance: 0.20, flaskWeights: { round_flask: 30, corked_flask: 40, tall_bottle: 30 }, qualityWeights: { common: 55, rare: 30, epic: 12, legendary: 3 } };
  if (tier <= 4) return { baseChance: 0.22, flaskWeights: { corked_flask: 25, tall_bottle: 40, wide_bottle: 35 }, qualityWeights: { common: 40, rare: 35, epic: 18, legendary: 7 } };
  if (tier <= 6) return { baseChance: 0.25, flaskWeights: { tall_bottle: 20, wide_bottle: 40, jug: 40 }, qualityWeights: { common: 30, rare: 35, epic: 25, legendary: 10 } };
  if (tier <= 8) return { baseChance: 0.28, flaskWeights: { wide_bottle: 40, jug: 60 }, qualityWeights: { common: 20, rare: 35, epic: 30, legendary: 15 } };
  return { baseChance: 0.30, flaskWeights: { wide_bottle: 30, jug: 70 }, qualityWeights: { common: 10, rare: 30, epic: 35, legendary: 25 } };
}

/** @deprecated */
export const BOSS_MAP_POTION_DROP: PotionDropConfig = {
  baseChance: 0.40,
  flaskWeights: { tall_bottle: 15, wide_bottle: 35, jug: 50 },
  qualityWeights: { common: 10, rare: 25, epic: 35, legendary: 30 },
};
