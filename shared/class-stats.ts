/**
 * CLASS STATS & PER-LEVEL GROWTH - single source of truth.
 *
 * Used by both FE (character selection screen) and BE (character creation, level-up).
 * Max level: 60.
 */

import type { ElementalResistance } from './types';

// ── Types ────────────────────────────────────────────────

export interface ClassBaseStats {
  hp: number;
  tapDamage: number;
  critChance: number;       // 0..1
  critMultiplier: number;
  dodgeChance: number;      // 0..1  - chance to completely avoid incoming hit
  resistance: ElementalResistance;
}

/** How much each stat grows per level (flat addition). */
export interface ClassGrowth {
  hp: number;
  tapDamage: number;
  critChance: number;       // per-level addition (e.g. 0.002 = +0.2% per level)
  critMultiplier: number;
  dodgeChance: number;
}

/** Unique class ability - one per class, shown in a special section. */
export interface ClassSpecial {
  id: string;
  name: string;
  icon: string;
  description: string;
  baseValue: number;        // starting value at level 1 (0..1 for chances)
  growth: number;           // added per level
  format: 'percent' | 'flat';
}

export interface ClassDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  skinId: string;
  base: ClassBaseStats;
  growth: ClassGrowth;
  special: ClassSpecial;
}

// ── Constants ────────────────────────────────────────────

export const MAX_LEVEL = 60;

// ── Class Definitions ────────────────────────────────────

export const CLASS_DEFS: Record<string, ClassDef> = {

  warrior: {
    id: 'warrior',
    name: 'Warrior',
    icon: '🛡️',
    description: 'Armored frontline fighter',
    skinId: 'knight_1',
    base: {
      hp: 100,
      tapDamage: 2,
      critChance: 0.05,
      critMultiplier: 1.5,
      dodgeChance: 0.02,
      resistance: { physical: 30, fire: 0, lightning: 0, cold: 0 },
    },
    growth: {
      hp: 20,              // was 18 - best survivability
      tapDamage: 2.0,      // was 1.4 - significant DPS buff to reduce gap with Mage
      critChance: 0.002,   // was 0.001
      critMultiplier: 0.015, // was 0.01
      dodgeChance: 0.001,
    },
    special: {
      id: 'blockChance',
      name: 'Block',
      icon: '🛡️',
      description: 'Chance to block any incoming attack',
      baseValue: 0.20,     // was 0.15 - stronger block baseline
      growth: 0.003,       // was 0.002
      format: 'percent',
    },
  },

  samurai: {
    id: 'samurai',
    name: 'Samurai',
    icon: '⚔️',
    description: 'Swift blade warrior',
    skinId: 'samurai_1',
    base: {
      hp: 100,
      tapDamage: 2,
      critChance: 0.05,
      critMultiplier: 1.5,
      dodgeChance: 0.05,
      resistance: { physical: 10, fire: 0, lightning: 10, cold: 0 },
    },
    growth: {
      hp: 12,
      tapDamage: 1.8,
      critChance: 0.003,
      critMultiplier: 0.02,
      dodgeChance: 0.002,
    },
    special: {
      id: 'critDamage',
      name: 'Lethal Precision',
      icon: '🩸',
      description: 'Bonus critical damage multiplier',
      baseValue: 0.50,
      growth: 0.02,
      format: 'percent',
    },
  },

  mage: {
    id: 'mage',
    name: 'Mage',
    icon: '🧙',
    description: 'Master of arcane arts',
    skinId: 'wizard_1',
    base: {
      hp: 100,
      tapDamage: 2,
      critChance: 0.05,
      critMultiplier: 1.5,
      dodgeChance: 0.03,
      resistance: { physical: 0, fire: 20, lightning: 15, cold: 15 },
    },
    growth: {
      hp: 8,
      tapDamage: 2.2,
      critChance: 0.002,
      critMultiplier: 0.03,
      dodgeChance: 0.001,
    },
    special: {
      id: 'spellAmp',
      name: 'Spell Amplify',
      icon: '🔮',
      description: 'Chance to amplify damage by 2.5x',
      baseValue: 0.08,
      growth: 0.003,
      format: 'percent',
    },
  },

  archer: {
    id: 'archer',
    name: 'Archer',
    icon: '🏹',
    description: 'Precision ranged attacker',
    skinId: 'archer_1',
    base: {
      hp: 100,
      tapDamage: 2,
      critChance: 0.05,
      critMultiplier: 1.5,
      dodgeChance: 0.06,
      resistance: { physical: 5, fire: 0, lightning: 0, cold: 10 },
    },
    growth: {
      hp: 10,
      tapDamage: 1.6,
      critChance: 0.004,
      critMultiplier: 0.025,
      dodgeChance: 0.002,
    },
    special: {
      id: 'doubleShot',
      name: 'Double Shot',
      icon: '🎯',
      description: 'Chance to fire a second shot',
      baseValue: 0.12,
      growth: 0.003,
      format: 'percent',
    },
  },
};

// ── Helpers ──────────────────────────────────────────────

/**
 * Compute stats at a given level for a class.
 * Formula: base + growth * (level - 1)
 */
export function statsAtLevel(classId: string, level: number): ClassBaseStats {
  const def = CLASS_DEFS[classId];
  if (!def) {
    return {
      hp: 100 + 10 * (level - 1),
      tapDamage: 2 + 1 * (level - 1),
      critChance: 0.05,
      critMultiplier: 1.5,
      dodgeChance: 0,
      resistance: { physical: 0, fire: 0, lightning: 0, cold: 0 },
    };
  }

  const lvl = Math.min(level, MAX_LEVEL);
  const g = def.growth;
  const b = def.base;
  const n = lvl - 1;

  return {
    hp:             Math.floor(b.hp + g.hp * n),
    tapDamage:      Math.floor(b.tapDamage + g.tapDamage * n),
    critChance:     parseFloat((b.critChance + g.critChance * n).toFixed(4)),
    critMultiplier: parseFloat((b.critMultiplier + g.critMultiplier * n).toFixed(2)),
    dodgeChance:    parseFloat((b.dodgeChance + g.dodgeChance * n).toFixed(4)),
    resistance:     { ...b.resistance },
  };
}

/**
 * Compute special ability value at a given level.
 */
export function specialAtLevel(classId: string, level: number): number {
  const def = CLASS_DEFS[classId];
  if (!def) return 0;
  const lvl = Math.min(level, MAX_LEVEL);
  const n = lvl - 1;
  return parseFloat((def.special.baseValue + def.special.growth * n).toFixed(4));
}

/**
 * Stat labels for UI display.
 */
export const STAT_LABELS: Record<string, { label: string; icon: string; format: 'flat' | 'percent' }> = {
  hp:             { label: 'HP',           icon: '❤️',  format: 'flat' },
  tapDamage:      { label: 'Damage',       icon: '⚔️',  format: 'flat' },
  critChance:     { label: 'Crit Chance',  icon: '💥',  format: 'percent' },
  critMultiplier: { label: 'Crit Dmg',    icon: '✖️',  format: 'percent' },
  dodgeChance:    { label: 'Dodge',        icon: '💨',  format: 'percent' },
};

export const RESISTANCE_LABELS: Record<string, { label: string; color: string }> = {
  physical:  { label: 'Armor',     color: '#c0c0c0' },
  fire:      { label: 'Fire Res',  color: '#ff4500' },
  lightning: { label: 'Light Res', color: '#00bfff' },
  cold:      { label: 'Cold Res',  color: '#87ceeb' },
};
