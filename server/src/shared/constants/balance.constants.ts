/**
 * Game balance constants — mirrored from bot/src/data/balance.ts.
 * Single source of truth for the server.
 */
export const B = {
  /* Scaling */
  ACT_SCALING_BASE: 2.5,

  /* Monster stats (location mode) */
  MONSTER_HP_BASE: 10,
  MONSTER_HP_GROWTH: 1.5,
  MONSTER_HP_RANDOM: 0.15,

  MONSTER_GOLD_BASE: 3,
  MONSTER_GOLD_GROWTH: 1.35,

  MONSTER_XP_BASE: 5,
  MONSTER_XP_GROWTH: 1.3,

  /* Legacy infinite mode */
  LEGACY_HP_BASE: 10,
  LEGACY_HP_GROWTH: 1.5,
  LEGACY_HP_WAVE_BONUS: 0.1,
  LEGACY_GOLD_BASE: 5,
  LEGACY_GOLD_GROWTH: 1.4,
  LEGACY_GOLD_WAVE_BONUS: 0.05,
  LEGACY_XP_BASE: 10,
  LEGACY_XP_GROWTH: 1.3,
  LEGACY_XP_WAVE_BONUS: 0.05,

  /* Map base reference (Act 5, Order 10) */
  MAP_BASE_ACT: 5,
  MAP_BASE_ORDER: 10,

  /* Location rewards by order (1-10) */
  LOCATION_REWARDS: [
    { gold: 60, xp: 40 },
    { gold: 100, xp: 65 },
    { gold: 140, xp: 95 },
    { gold: 190, xp: 130 },
    { gold: 260, xp: 180 },
    { gold: 350, xp: 240 },
    { gold: 450, xp: 320 },
    { gold: 600, xp: 450 },
    { gold: 300, xp: 220 },
    { gold: 420, xp: 300 },
  ],

  /* Rarity multipliers */
  RARITY_MULTIPLIERS: {
    common: { hpMul: 1.0, goldMul: 1.0, xpMul: 1.0 },
    rare: { hpMul: 1.6, goldMul: 1.5, xpMul: 1.4 },
    epic: { hpMul: 2.5, goldMul: 2.2, xpMul: 2.0 },
    boss: { hpMul: 4.0, goldMul: 3.5, xpMul: 3.0 },
  },

  /* Player progression */
  XP_BASE: 100,
  XP_GROWTH: 1.3,

  STARTING_STATS: {
    level: 1,
    tapDamage: 1,
    critChance: 0.05,
    critMultiplier: 2.0,
    passiveDps: 0,
  },

  /* Combat timers */
  SPAWN_DELAY_MS: 1200,
  PASSIVE_DPS_TICK_MS: 1000,

  /* Endgame start */
  ENDGAME_STARTER_KEYS: 3,
  ENDGAME_STARTER_TIER: 1,
};
