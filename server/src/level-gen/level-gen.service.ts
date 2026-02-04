import { Injectable } from '@nestjs/common';
import { B } from '../shared/constants/balance.constants';
import { MONSTER_TYPES, RARITIES, Rarity } from './monster-types';

export interface ServerMonster {
  name: string;
  type: string;
  rarity: Rarity;
  maxHp: number;
  currentHp: number;
  goldReward: number;
  xpReward: number;
}

export interface MonsterSpawn {
  type: string;
  count: number;
  rarity: string;
}

export interface Wave {
  monsters: MonsterSpawn[];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

@Injectable()
export class LevelGenService {
  /**
   * Create a monster for a specific location (story mode).
   * Ported from bot/src/game/monsters.ts: createMonsterForLocation
   */
  createMonsterForLocation(
    typeName: string,
    locationOrder: number,
    rarityId: string = 'common',
    actNumber: number = 1,
  ): ServerMonster {
    const type = MONSTER_TYPES.find((m) => m.name === typeName) || MONSTER_TYPES[0];
    const rarity = RARITIES[rarityId] || RARITIES.common;
    const actMul = Math.pow(B.ACT_SCALING_BASE, actNumber - 1);

    // HP
    const hpScale = Math.pow(B.MONSTER_HP_GROWTH, locationOrder - 1);
    const baseHp = Math.floor(B.MONSTER_HP_BASE * hpScale * rarity.hpMul * actMul);
    const hpMin = Math.max(1, Math.floor(baseHp * (1 - B.MONSTER_HP_RANDOM)));
    const hpMax = Math.ceil(baseHp * (1 + B.MONSTER_HP_RANDOM));
    const hp = randInt(hpMin, hpMax);

    // Gold
    const goldScale = Math.pow(B.MONSTER_GOLD_GROWTH, locationOrder - 1);
    const gold = Math.floor(B.MONSTER_GOLD_BASE * goldScale * rarity.goldMul * actMul);

    // XP
    const xpScale = Math.pow(B.MONSTER_XP_GROWTH, locationOrder - 1);
    const xp = Math.floor(B.MONSTER_XP_BASE * xpScale * rarity.xpMul * actMul);

    return {
      name: type.name,
      type: type.name,
      rarity,
      maxHp: hp,
      currentHp: hp,
      goldReward: gold,
      xpReward: xp,
    };
  }

  /**
   * Create a monster for an endgame map.
   * Ported from bot/src/game/monsters.ts: createMonsterForMap
   */
  createMonsterForMap(
    typeName: string,
    rarityId: string,
    tierHpMul: number,
    tierGoldMul: number,
    tierXpMul: number,
  ): ServerMonster {
    const type = MONSTER_TYPES.find((m) => m.name === typeName) || MONSTER_TYPES[0];
    const rarity = RARITIES[rarityId] || RARITIES.common;

    const actMul = Math.pow(B.ACT_SCALING_BASE, B.MAP_BASE_ACT - 1);
    const orderScale = B.MAP_BASE_ORDER;

    // HP
    const hpScale = Math.pow(B.MONSTER_HP_GROWTH, orderScale - 1);
    const baseHp = Math.floor(B.MONSTER_HP_BASE * hpScale * rarity.hpMul * actMul * tierHpMul);
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
      type: type.name,
      rarity,
      maxHp: hp,
      currentHp: hp,
      goldReward: gold,
      xpReward: xp,
    };
  }

  /**
   * Build a full monster queue from wave definitions.
   */
  buildMonsterQueue(
    waves: Wave[],
    locationOrder?: number,
    actNumber?: number,
    tierHpMul?: number,
    tierGoldMul?: number,
    tierXpMul?: number,
  ): ServerMonster[] {
    const queue: ServerMonster[] = [];
    const isMap = tierHpMul !== undefined;

    for (const wave of waves) {
      for (const spawn of wave.monsters) {
        for (let i = 0; i < spawn.count; i++) {
          if (isMap) {
            queue.push(
              this.createMonsterForMap(
                spawn.type,
                spawn.rarity,
                tierHpMul!,
                tierGoldMul!,
                tierXpMul!,
              ),
            );
          } else {
            queue.push(
              this.createMonsterForLocation(
                spawn.type,
                locationOrder!,
                spawn.rarity,
                actNumber!,
              ),
            );
          }
        }
      }
    }

    return queue;
  }
}
