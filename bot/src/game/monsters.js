import { MONSTER_TYPES } from "../data/monster-types.js";

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
    maxHp: hp,
    currentHp: hp,
    goldReward: getMonsterGold(stage, wave),
    xpReward: getMonsterXp(stage, wave),
  };
}
