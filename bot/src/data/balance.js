/**
 * ═══════════════════════════════════════════════════════════════
 *  GAME BALANCE — все числа баланса в одном месте
 *
 *  Меняй любое значение здесь — логика подхватит автоматически.
 *  Эндгейм-специфичный баланс (тиры карт, дроп шансы, боссы)
 *  живёт в endgame-maps.js.
 * ═══════════════════════════════════════════════════════════════
 */

export const B = {

  /* ── Формулы масштабирования ────────────────── */
  ACT_SCALING_BASE: 2.5,            // actMul = 2.5^(act-1)

  /* ── Монстры — базовые статы (location mode) ── */
  MONSTER_HP_BASE: 10,
  MONSTER_HP_GROWTH: 1.5,            // 1.5^(order-1)
  MONSTER_HP_RANDOM: 0.15,           // ±15%

  MONSTER_GOLD_BASE: 3,
  MONSTER_GOLD_GROWTH: 1.35,

  MONSTER_XP_BASE: 5,
  MONSTER_XP_GROWTH: 1.3,

  /* Legacy infinite mode (старый бесконечный режим) */
  LEGACY_HP_BASE: 10,
  LEGACY_HP_GROWTH: 1.5,
  LEGACY_HP_WAVE_BONUS: 0.1,
  LEGACY_GOLD_BASE: 5,
  LEGACY_GOLD_GROWTH: 1.4,
  LEGACY_GOLD_WAVE_BONUS: 0.05,
  LEGACY_XP_BASE: 10,
  LEGACY_XP_GROWTH: 1.3,
  LEGACY_XP_WAVE_BONUS: 0.05,

  /* Map monsters — базовая точка отсчёта (Act 5, Order 10) */
  MAP_BASE_ACT: 5,
  MAP_BASE_ORDER: 10,

  /* ── Награды за локации (base, до скейлинга) ── */
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

  /* ── Рарности — множители HP / Gold / XP ───── */
  RARITY_MULTIPLIERS: {
    common: { hpMul: 1.0, goldMul: 1.0, xpMul: 1.0 },
    rare:   { hpMul: 1.6, goldMul: 1.5, xpMul: 1.4 },
    epic:   { hpMul: 2.5, goldMul: 2.2, xpMul: 2.0 },
    boss:   { hpMul: 4.0, goldMul: 3.5, xpMul: 3.0 },
  },

  /* ── Прогрессия игрока ──────────────────────── */
  XP_BASE: 100,                     // xpToNext = XP_BASE * XP_GROWTH^(level-1)
  XP_GROWTH: 1.3,

  STARTING_STATS: {
    level: 1,
    tapDamage: 1,
    critChance: 0.05,
    critMultiplier: 2.0,
    passiveDps: 0,
  },

  /* ── Офлайн прогресс ────────────────────────── */
  OFFLINE_MAX_SECONDS: 28800,        // 8 часов
  OFFLINE_MIN_SECONDS: 10,           // минимум секунд для начисления
  OFFLINE_DPS_RATE: 0.5,             // 50% от passiveDps

  /* ── Боевые таймеры ─────────────────────────── */
  SPAWN_DELAY_MS: 1200,              // задержка спавна после смерти монстра
  PASSIVE_DPS_TICK_MS: 1000,         // интервал тика пассивного урона

  /* ── Эндгейм старт ─────────────────────────── */
  ENDGAME_STARTER_KEYS: 3,           // кол-во стартовых ключей при анлоке
  ENDGAME_STARTER_TIER: 1,           // тир стартовых ключей
};
