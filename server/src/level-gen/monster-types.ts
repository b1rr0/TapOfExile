import { B } from '../shared/constants/balance.constants';
import type { ElementalResistance, ElementalDamage } from '@shared/types';
import type { MonsterAttack } from '@shared/monster-attacks';
import { MONSTER_ATTACKS } from '@shared/monster-attacks';

export interface Rarity {
  id: string;
  label: string;
  color: string;
  hpMul: number;
  goldMul: number;
  xpMul: number;
}

export interface MonsterType {
  name: string;
  cssClass: string;
  minStage: number;
  bodyColor: string;
  eyeColor: string;
  resistance?: ElementalResistance;
  outgoingDamage?: ElementalDamage;
  /** Attack pool — server picks randomly each tick */
  attacks?: MonsterAttack[];
}

export const RARITIES: Record<string, Rarity> = {
  common: { id: 'common', label: 'Common', color: '#9e9e9e', ...B.RARITY_MULTIPLIERS.common },
  rare: { id: 'rare', label: 'Rare', color: '#4fc3f7', ...B.RARITY_MULTIPLIERS.rare },
  epic: { id: 'epic', label: 'Epic', color: '#ffd740', ...B.RARITY_MULTIPLIERS.epic },
  boss: { id: 'boss', label: 'Boss', color: '#ff9100', ...B.RARITY_MULTIPLIERS.boss },
};

export const MONSTER_TYPES: MonsterType[] = [
  { name: 'Bandit', cssClass: 'monster-bandit', minStage: 1, bodyColor: '#8b6914', eyeColor: '#fff',
    resistance: { physical: 0.05 },
    attacks: MONSTER_ATTACKS.Bandit },
  { name: 'Wild Boar', cssClass: 'monster-boar', minStage: 1, bodyColor: '#6b3a2a', eyeColor: '#ff4444',
    resistance: { physical: 0.10 },
    attacks: MONSTER_ATTACKS['Wild Boar'] },
  { name: 'Forest Spirit', cssClass: 'monster-spirit', minStage: 3, bodyColor: '#2e7d32', eyeColor: '#aaffaa',
    resistance: { cold: 0.15, physical: -0.10 },
    outgoingDamage: { cold: 0.60, pure: 0.40 },
    attacks: MONSTER_ATTACKS['Forest Spirit'] },
  { name: 'Ronin', cssClass: 'monster-ronin', minStage: 5, bodyColor: '#4a4a6a', eyeColor: '#eee',
    resistance: { physical: 0.15, lightning: 0.05 },
    attacks: MONSTER_ATTACKS.Ronin },
  { name: 'Oni', cssClass: 'monster-oni', minStage: 8, bodyColor: '#c41e3a', eyeColor: '#ffcc00',
    resistance: { fire: 0.25, physical: 0.10 },
    outgoingDamage: { fire: 0.70, physical: 0.30 },
    attacks: MONSTER_ATTACKS.Oni },
  { name: 'Tengu', cssClass: 'monster-tengu', minStage: 12, bodyColor: '#1a237e', eyeColor: '#ff6600',
    resistance: { lightning: 0.20, cold: 0.10 },
    outgoingDamage: { lightning: 0.80, physical: 0.20 },
    attacks: MONSTER_ATTACKS.Tengu },
  { name: 'Dragon', cssClass: 'monster-dragon', minStage: 15, bodyColor: '#4a0072', eyeColor: '#ff0000',
    resistance: { fire: 0.40, physical: 0.15, lightning: 0.10 },
    outgoingDamage: { fire: 0.90, pure: 0.10 },
    attacks: MONSTER_ATTACKS.Dragon },
  { name: 'Shogun', cssClass: 'monster-shogun', minStage: 20, bodyColor: '#b8860b', eyeColor: '#fff',
    resistance: { physical: 0.30, cold: 0.15, fire: 0.10, lightning: 0.10 },
    outgoingDamage: { physical: 0.60, lightning: 0.30, pure: 0.10 },
    attacks: MONSTER_ATTACKS.Shogun },
];
