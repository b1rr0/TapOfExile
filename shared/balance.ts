/**
 * GAME BALANCE - single source of truth for both FE and BE.
 *
 * All numeric balance constants live here.
 * Endgame-specific balance (tiers, drop chances, bosses) lives in endgame-maps.ts.
 */

export const B = {

  /* ── Scaling formulas ─────────────────────── */
  /**
   * General act scaling - used for Gold & XP.
   * HP and DMG have their own dedicated act scaling below.
   */
  ACT_SCALING_BASE: 3.5,            // actMul = 3.5^(act-1) - gold/xp

  /* ── Monsters - HP (PoE-style: HP >> DMG) ─── */
  MONSTER_HP_BASE: 300,              // base HP at order=1, act=1, common
  MONSTER_HP_GROWTH: 1.55,           // 1.55^(order-1) - within-act scaling
  MONSTER_HP_RANDOM: 0.15,           // +/-15%
  ACT_HP_SCALING: 4.0,              // actHpMul = 4.0^(act-1) - A5O10 boss ≈ 16M

  /* ── Monsters - Gold ─────────────────────── */
  MONSTER_GOLD_BASE: 15,             // was 3 - proportional to higher HP
  MONSTER_GOLD_GROWTH: 1.35,

  /* ── Monsters - XP ───────────────────────── */
  MONSTER_XP_BASE: 15,               // was 5 - proportional to higher HP
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

  /* Map monsters - base reference point (Act 5, Order 10) */
  MAP_BASE_ACT: 5,
  MAP_BASE_ORDER: 10,

  /* ── Location rewards (base, before scaling) ── */
  LOCATION_REWARDS: [
    { gold: 60,  xp: 40  },         // order 1
    { gold: 100, xp: 65  },         // order 2
    { gold: 140, xp: 95  },         // order 3
    { gold: 190, xp: 130 },         // order 4
    { gold: 260, xp: 180 },         // order 5
    { gold: 350, xp: 240 },         // order 6
    { gold: 450, xp: 320 },         // order 7
    { gold: 600, xp: 450 },         // order 8
    { gold: 300, xp: 220 },         // order 9  (side branch)
    { gold: 420, xp: 300 },         // order 10 (side branch)
  ],

  /* ── Rarity multipliers (HP / Gold / XP) ──── */
  RARITY_MULTIPLIERS: {
    common: { hpMul: 1.0, goldMul: 1.0, xpMul: 1.0 },
    rare:   { hpMul: 1.6, goldMul: 1.5, xpMul: 1.4 },
    epic:   { hpMul: 2.5, goldMul: 2.2, xpMul: 2.0 },
    boss:   { hpMul: 4.0, goldMul: 3.5, xpMul: 3.0 },
  },

  /* ── Player progression ───────────────────── */
  MAX_LEVEL: 60,
  XP_BASE: 100,                     // xpToNext = XP_BASE * XP_GROWTH^(level-1)
  XP_GROWTH: 1.18,                  // was 1.3 - flatter curve, L60 reachable in ~3K runs

  /** XP level-scaling: XP = BaseXP / (1 + a*D²), D = |playerLevel - enemyLevel| */
  XP_LEVEL_SCALING_A: 0.3,          // was 0.4 - softer penalty for level difference

  /** Legacy fallback - class-specific stats in shared/class-stats.ts */
  STARTING_STATS: {
    level: 1,
    tapDamage: 2,
    critChance: 0.05,
    critMultiplier: 1.5,
  },

  /* ── Combat timers ────────────────────────── */
  SPAWN_DELAY_MS: 1200,

  /* ── Enemy attack system ─────────────────── */
  ENEMY_ATTACK_INTERVAL_MS: 1000,     // 1 attack per second
  MONSTER_DMG_BASE: 15,                // base damage at order=1, common (was 3)
  MONSTER_DMG_GROWTH: 1.15,            // dmg per order = 1.15^(order-1) (was 1.4)
  MONSTER_DMG_RANDOM: 0.10,            // ±10% variance
  ACT_DMG_SCALING: 3.5,               // actDmgMul = 3.5^(act-1) - A5O10 boss ≈ 20K
  RARITY_DMG_MULTIPLIERS: {
    common: 1.0,
    rare:   1.3,
    epic:   1.8,
    boss:   2.5,
  } as Record<string, number>,
  MAX_PENDING_ATTACKS: 10,             // cap accumulated attacks (anti-AFK)

  /* ── Endgame start ────────────────────────── */
  ENDGAME_STARTER_KEYS: 3,
  ENDGAME_STARTER_TIER: 1,

  /* ── Elemental system ───────────────────────── */

  /** Default elemental damage profile - 100% physical for everyone.
   *  Elemental splits come from skill-tree nodes, not from class. */
  DEFAULT_ELEMENTAL_DAMAGE: { physical: 1.0 } as Record<string, number>,

  /** Bonus added to ALL base resistances by monster rarity. */
  RARITY_RESISTANCE_BONUS: {
    common: 0,
    rare:   0.05,
    epic:   0.10,
    boss:   0.15,
  } as Record<string, number>,

  /** Hard cap for any single resistance value. */
  RESISTANCE_CAP: 0.75,

  /* ── Active skills ──────────────────────────── */
  SKILL_FIREBALL_COOLDOWN_MS: 3000,
  SKILL_FIREBALL_DMG_MULTIPLIER: 5,    // 5× tapDamage
  SKILL_SWORD_THROW_COOLDOWN_MS: 3000,
  SKILL_SWORD_THROW_DMG_MULTIPLIER: 4, // 4× tapDamage, physical

  /* ── Anti-cheat ──────────────────────────── */
  ANTICHEAT_WINDOW_MS: 3000,              // 3-second counting window
  ANTICHEAT_MSG_LIMIT: 50,               // max socket messages per 3-sec window (~17/s)
  ANTICHEAT_BAN_DURATION_MS: 86_400_000,  // 1 day (24h)

  /* ── Dojo ──────────────────────────────── */
  DOJO_COUNTDOWN_MS: 3_000,              // 3-second countdown before fight
  DOJO_ROUND_MS: 10_000,                 // 10-second fight
  DOJO_SESSION_TTL: 60,                  // Redis TTL (1 min)

  /* ── Premium shop ─────────────────────── */
  BASE_TRADE_SLOTS: 5,                   // base max active trade listings
  TRADE_SLOTS_PER_PURCHASE: 10,          // +10 per purchase
  MAX_EXTRA_TRADE_SLOTS: 95,             // 5 base + 95 = 100 max
  SKIN_PRICE_SHARDS: 350,               // cost per non-default skin
  REFERRAL_REWARD_SHARDS: 50,            // shards for both referrer & referee
  REFERRAL_INCOME_PERCENT: 10,           // % of referral's Stars purchases → referrer
};

/* ── Rarity display data ─────────────────── */

export interface RarityDisplayDef {
  id: string;
  label: string;
  color: string;
  hpMul: number;
  goldMul: number;
  xpMul: number;
  dmgMul: number;
  resistanceBonus: number;
}

export const RARITY_DEFS: readonly RarityDisplayDef[] = [
  { id: 'common', label: 'Common', color: '#9e9e9e', hpMul: 1.0, goldMul: 1.0, xpMul: 1.0, dmgMul: 1.0, resistanceBonus: 0  },
  { id: 'rare',   label: 'Rare',   color: '#4fc3f7', hpMul: 1.6, goldMul: 1.5, xpMul: 1.4, dmgMul: 1.3, resistanceBonus: 5  },
  { id: 'epic',   label: 'Epic',   color: '#ffd740', hpMul: 2.5, goldMul: 2.2, xpMul: 2.0, dmgMul: 1.8, resistanceBonus: 10 },
  { id: 'boss',   label: 'Boss',   color: '#ff9100', hpMul: 4.0, goldMul: 3.5, xpMul: 3.0, dmgMul: 2.5, resistanceBonus: 15 },
];
