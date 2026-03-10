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
  arcaneCritChance: number;      // 0..1 - arcane crit (mage-only growth)
  arcaneCritMultiplier: number;  // e.g. 1.5
  resistance: ElementalResistance;
}

/** How much each stat grows per level (flat addition). */
export interface ClassGrowth {
  hp: number;
  tapDamage: number;
  critChance: number;       // per-level addition (e.g. 0.002 = +0.2% per level)
  critMultiplier: number;
  dodgeChance: number;
  arcaneCritChance: number;      // per-level (only mage has non-zero)
  arcaneCritMultiplier: number;  // per-level (only mage has non-zero)
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
      arcaneCritChance: 0,
      arcaneCritMultiplier: 1.3,
      resistance: { physical: 30, fire: 0, lightning: 0, cold: 0 },
    },
    growth: {
      hp: 20,
      tapDamage: 2.0,
      critChance: 0,
      critMultiplier: 0,
      dodgeChance: 0.001,
      arcaneCritChance: 0,
      arcaneCritMultiplier: 0,
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
      arcaneCritChance: 0,
      arcaneCritMultiplier: 1.3,
      resistance: { physical: 10, fire: 0, lightning: 10, cold: 0 },
    },
    growth: {
      hp: 12,
      tapDamage: 1.8,
      critChance: 0.003,
      critMultiplier: 0.02,
      dodgeChance: 0.002,
      arcaneCritChance: 0,
      arcaneCritMultiplier: 0,
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
      arcaneCritChance: 0.10,
      arcaneCritMultiplier: 1.3,
      resistance: { physical: 0, fire: 20, lightning: 15, cold: 15 },
    },
    growth: {
      hp: 8,
      tapDamage: 2.2,
      critChance: 0,             // no crit chance growth from levels
      critMultiplier: 0,         // no crit damage growth from levels
      dodgeChance: 0.001,
      arcaneCritChance: 0,       // no arcane crit growth from levels
      arcaneCritMultiplier: 0,   // no arcane crit dmg growth from levels
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
      arcaneCritChance: 0,
      arcaneCritMultiplier: 1.3,
      resistance: { physical: 5, fire: 0, lightning: 0, cold: 10 },
    },
    growth: {
      hp: 10,
      tapDamage: 1.6,
      critChance: 0,
      critMultiplier: 0,
      dodgeChance: 0.002,
      arcaneCritChance: 0,
      arcaneCritMultiplier: 0,
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
      arcaneCritChance: 0,
      arcaneCritMultiplier: 1.5,
      resistance: { physical: 0, fire: 0, lightning: 0, cold: 0 },
    };
  }

  const lvl = Math.min(level, MAX_LEVEL);
  const g = def.growth;
  const b = def.base;
  const n = lvl - 1;

  return {
    hp:                  Math.floor(b.hp + g.hp * n),
    tapDamage:           Math.floor(b.tapDamage + g.tapDamage * n),
    critChance:          parseFloat((b.critChance + g.critChance * n).toFixed(4)),
    critMultiplier:      parseFloat((b.critMultiplier + g.critMultiplier * n).toFixed(2)),
    dodgeChance:         parseFloat((b.dodgeChance + g.dodgeChance * n).toFixed(4)),
    arcaneCritChance:    parseFloat((b.arcaneCritChance + g.arcaneCritChance * n).toFixed(4)),
    arcaneCritMultiplier: parseFloat((b.arcaneCritMultiplier + g.arcaneCritMultiplier * n).toFixed(2)),
    resistance:          { ...b.resistance },
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
  hp:                   { label: 'HP',                  icon: '❤️',  format: 'flat' },
  tapDamage:            { label: 'Bugei Damage',        icon: '⚔️',  format: 'flat' },
  critChance:           { label: 'Bugei Crit Chance',   icon: '💥',  format: 'percent' },
  critMultiplier:       { label: 'Bugei Crit Damage',   icon: '✖️',  format: 'percent' },
  dodgeChance:          { label: 'Dodge',               icon: '💨',  format: 'percent' },
  arcaneCritChance:     { label: 'Arcane Crit Chance',  icon: '🔮',  format: 'percent' },
  arcaneCritMultiplier: { label: 'Arcane Crit Damage',  icon: '🔮',  format: 'percent' },
};

export const RESISTANCE_LABELS: Record<string, { label: string; color: string }> = {
  physical:  { label: 'Armor',     color: '#c0c0c0' },
  fire:      { label: 'Fire Res',  color: '#ff4500' },
  lightning: { label: 'Light Res', color: '#00bfff' },
  cold:      { label: 'Cold Res',  color: '#87ceeb' },
};
