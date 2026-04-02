import { MONSTER_TYPES, RARITIES } from "../data/monster-types.js";
import { B } from "../data/balance.js";
import type { Monster } from "../types.js";

// ─── Legacy helpers (still used by old init() path) ──────────

export function getMonsterHp(stage: number, wave: number): number {
  const stageScale = Math.pow(B.LEGACY_HP_GROWTH, stage - 1);
  const waveBonus = 1 + (wave - 1) * B.LEGACY_HP_WAVE_BONUS;
  return Math.floor(B.LEGACY_HP_BASE * stageScale * waveBonus);
}

export function getMonsterGold(stage: number, wave: number): number {
  const stageScale = Math.pow(B.LEGACY_GOLD_GROWTH, stage - 1);
  const waveBonus = 1 + (wave - 1) * B.LEGACY_GOLD_WAVE_BONUS;
  return Math.floor(B.LEGACY_GOLD_BASE * stageScale * waveBonus);
}

export function getMonsterXp(stage: number, wave: number): number {
  const stageScale = Math.pow(B.LEGACY_XP_GROWTH, stage - 1);
  const waveBonus = 1 + (wave - 1) * B.LEGACY_XP_WAVE_BONUS;
  return Math.floor(B.LEGACY_XP_BASE * stageScale * waveBonus);
}

export function createMonster(stage: number, wave: number): Monster {
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

// ─── Shared helpers ──────────────────────────────────────────

/**
 * Randomise an integer in [min, max] (inclusive).
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Map-based monster creation (endgame) ────────────────────

/**
 * Create a monster scaled for an endgame map.
 * Uses Act 5 order-10 as the base, then applies tier/boss multipliers.
 */
export function createMonsterForMap(
  typeName: string,
  rarityId: string,
  tierHpMul: number,
  tierGoldMul: number,
  tierXpMul: number,
): Monster {
  const type = MONSTER_TYPES.find((m) => m.name === typeName) || MONSTER_TYPES[0];
  const rarity = RARITIES[rarityId] || RARITIES.common;

  // Base = Act 5 order 10 equivalent
  const actHpMul = Math.pow(B.ACT_HP_SCALING, B.MAP_BASE_ACT - 1);
  const actMul = Math.pow(B.ACT_SCALING_BASE, B.MAP_BASE_ACT - 1);
  const orderScale = B.MAP_BASE_ORDER;

  // HP: base x orderScale x rarity x actHpMul x tierMul, randomised +/-15%
  const hpScale = Math.pow(B.MONSTER_HP_GROWTH, orderScale - 1);
  const baseHp = Math.floor(B.MONSTER_HP_BASE * hpScale * rarity.hpMul * actHpMul * tierHpMul);
  const hpMin = Math.max(1, Math.floor(baseHp * (1 - B.MONSTER_HP_RANDOM)));
  const hpMax = Math.ceil(baseHp * (1 + B.MONSTER_HP_RANDOM));
  const hp = randInt(hpMin, hpMax);

  // Gold
  const goldScale = Math.pow(B.MONSTER_GOLD_GROWTH, orderScale - 1);
  const gold = Math.floor(B.MONSTER_GOLD_BASE * goldScale * rarity.goldMul * actMul * tierGoldMul);

  // XP
  const xpScale = Math.pow(B.MONSTER_XP_GROWTH, orderScale - 1);
  const xp = Math.floor(B.MONSTER_XP_BASE * xpScale * rarity.xpMul * actMul * tierXpMul);

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

// ─── Location-based monster creation ─────────────────────────

/**
 * Create a monster for a specific location.
 * HP is randomised within +/-15 % of the base value, then scaled by rarity.
 * Gold / XP also scale by rarity.
 */
export function createMonsterForLocation(
  typeName: string,
  locationOrder: number,
  rarityId: string = "common",
  actNumber: number = 1,
): Monster {
  const type = MONSTER_TYPES.find((m) => m.name === typeName) || MONSTER_TYPES[0];
  const rarity = RARITIES[rarityId] || RARITIES.common;

  // Separate act scaling: HP uses dedicated scaler, Gold/XP use general
  const actHpMul = Math.pow(B.ACT_HP_SCALING, actNumber - 1);
  const actMul = Math.pow(B.ACT_SCALING_BASE, actNumber - 1);

  // --- HP: base x locationScale x rarity x actHpMul, then randomise +/-15 % ---
  const hpScale = Math.pow(B.MONSTER_HP_GROWTH, locationOrder - 1);
  const baseHp = Math.floor(B.MONSTER_HP_BASE * hpScale * rarity.hpMul * actHpMul);
  const hpMin = Math.max(1, Math.floor(baseHp * (1 - B.MONSTER_HP_RANDOM)));
  const hpMax = Math.ceil(baseHp * (1 + B.MONSTER_HP_RANDOM));
  const hp = randInt(hpMin, hpMax);

  // --- Gold ---
  const goldScale = Math.pow(B.MONSTER_GOLD_GROWTH, locationOrder - 1);
  const gold = Math.floor(B.MONSTER_GOLD_BASE * goldScale * rarity.goldMul * actMul);

  // --- XP ---
  const xpScale = Math.pow(B.MONSTER_XP_GROWTH, locationOrder - 1);
  const xp = Math.floor(B.MONSTER_XP_BASE * xpScale * rarity.xpMul * actMul);

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
