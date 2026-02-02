import { MONSTER_TYPES, RARITIES } from "../data/monster-types.js";

// ─── Legacy helpers (still used by old init() path) ──────────

export function getMonsterHp(stage, wave) {
  const base = 10;
  const stageScale = Math.pow(1.5, stage - 1);
  const waveBonus = 1 + (wave - 1) * 0.1;
  return Math.floor(base * stageScale * waveBonus);
}

export function getMonsterGold(stage, wave) {
  const base = 5;
  const stageScale = Math.pow(1.4, stage - 1);
  const waveBonus = 1 + (wave - 1) * 0.05;
  return Math.floor(base * stageScale * waveBonus);
}

export function getMonsterXp(stage, wave) {
  const base = 10;
  const stageScale = Math.pow(1.3, stage - 1);
  const waveBonus = 1 + (wave - 1) * 0.05;
  return Math.floor(base * stageScale * waveBonus);
}

export function createMonster(stage, wave) {
  const available = MONSTER_TYPES.filter((m) => m.minStage <= stage);
  const type = available[Math.floor(Math.random() * available.length)];
  const hp = getMonsterHp(stage, wave);

  return {
    name: type.name,
    cssClass: type.cssClass,
    bodyColor: type.bodyColor,
    eyeColor: type.eyeColor,
    rarity: RARITIES.common,
    maxHp: hp,
    currentHp: hp,
    goldReward: getMonsterGold(stage, wave),
    xpReward: getMonsterXp(stage, wave),
  };
}

// ─── Location-based monster creation ─────────────────────────

/**
 * Randomise an integer in [min, max] (inclusive).
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create a monster for a specific location.
 * HP is randomised within ±15 % of the base value, then scaled by rarity.
 * Gold / XP also scale by rarity.
 *
 * @param {string} typeName    — monster type name (e.g. "Bandit")
 * @param {number} locationOrder — location.order (1-based)
 * @param {string} [rarityId="common"] — rarity key from RARITIES
 * @param {number} [actNumber=1] — act number (1-5) for act-based scaling
 * @returns {Object} monster instance
 */
export function createMonsterForLocation(typeName, locationOrder, rarityId = "common", actNumber = 1) {
  const type = MONSTER_TYPES.find((m) => m.name === typeName) || MONSTER_TYPES[0];
  const rarity = RARITIES[rarityId] || RARITIES.common;
  const actMul = Math.pow(2.5, actNumber - 1);

  // --- HP: base × locationScale × rarity × actMul, then randomise ±15 % ---
  const hpBase = 10;
  const hpScale = Math.pow(1.5, locationOrder - 1);
  const baseHp = Math.floor(hpBase * hpScale * rarity.hpMul * actMul);
  const hpMin = Math.max(1, Math.floor(baseHp * 0.85));
  const hpMax = Math.ceil(baseHp * 1.15);
  const hp = randInt(hpMin, hpMax);

  // --- Gold ---
  const goldBase = 3;
  const goldScale = Math.pow(1.35, locationOrder - 1);
  const gold = Math.floor(goldBase * goldScale * rarity.goldMul * actMul);

  // --- XP ---
  const xpBase = 5;
  const xpScale = Math.pow(1.3, locationOrder - 1);
  const xp = Math.floor(xpBase * xpScale * rarity.xpMul * actMul);

  return {
    name: type.name,
    cssClass: type.cssClass,
    bodyColor: type.bodyColor,
    eyeColor: type.eyeColor,
    rarity,
    maxHp: hp,
    currentHp: hp,
    goldReward: gold,
    xpReward: xp,
  };
}
