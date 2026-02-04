import { Rarity } from './monster-types';
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
export declare class LevelGenService {
    createMonsterForLocation(typeName: string, locationOrder: number, rarityId?: string, actNumber?: number): ServerMonster;
    createMonsterForMap(typeName: string, rarityId: string, tierHpMul: number, tierGoldMul: number, tierXpMul: number): ServerMonster;
    buildMonsterQueue(waves: Wave[], locationOrder?: number, actNumber?: number, tierHpMul?: number, tierGoldMul?: number, tierXpMul?: number): ServerMonster[];
}
