/**
 * Shared types — used by both bot (FE) and server (BE).
 *
 * FE-only types (Scene, Sprite, Monster rendering) stay in bot/src/types.ts.
 * BE-only types (entities, DTOs) stay in server.
 */

// ── Elemental System ─────────────────────────────────────

export type DamageElement = 'physical' | 'fire' | 'lightning' | 'cold' | 'pure';
export type ResistableElement = 'physical' | 'fire' | 'lightning' | 'cold';

/**
 * Damage split: fraction of total damage per element.
 * Values 0..1, should sum to ~1.0.
 * Missing keys = 0. Pure damage bypasses all resistance.
 */
export interface ElementalDamage {
  physical?: number;
  fire?: number;
  lightning?: number;
  cold?: number;
  pure?: number;
}

/**
 * Resistance per element: 0 = no resist, 0.75 = 75% resist.
 * Can go negative (vulnerability). No pure — pure is unresistable.
 */
export interface ElementalResistance {
  physical?: number;
  fire?: number;
  lightning?: number;
  cold?: number;
}

/** Per-element breakdown returned after damage calculation. */
export interface DamageBreakdown {
  total: number;
  physical: number;
  fire: number;
  lightning: number;
  cold: number;
  pure: number;
}

/** UI color per element. */
export const ELEMENT_COLORS: Record<DamageElement, string> = {
  physical:  '#c0c0c0',
  fire:      '#ff4500',
  lightning: '#00bfff',
  cold:      '#87ceeb',
  pure:      '#da70d6',
};

// ── Skill tree ───────────────────────────────────────────

export type ModMode = "percent" | "flat";
export type NodeType = "start" | "classSkill" | "activeSkill" | "minor" | "notable" | "keystone" | "figureEntry";

// ── Monster / Wave ───────────────────────────────────────

export interface MonsterSpawn {
  type: string;
  count: number;
  rarity: string;
  /** Color variant subfolder (e.g. "v1_crimson") — omit for base skin */
  skinVariant?: string;
}

export interface Wave {
  monsters: MonsterSpawn[];
}

// ── Endgame maps ─────────────────────────────────────────

export interface MapTier {
  tier: number;
  name: string;
  hpMul: number;
  goldMul: number;
  xpMul: number;
}

export interface BossKeyTierDef {
  tier: number;
  name: string;
  quality: string;
  hpScale: number;
  goldScale: number;
  xpScale: number;
}

export interface BossMap {
  id: string;
  name: string;
  description: string;
  bossType: string;
  icon: string;
  hpMul: number;
  goldMul: number;
  xpMul: number;
  trashWaves: Wave[];
}

export interface DropSettings {
  regular: {
    sameTierChance: number;
    tierUpChance: number;
    bossKeyChance: number;
    bossKeyMinTier: number;
  };
  boss: {
    guaranteedTierMin: number;
    guaranteedTierMax: number;
    bonusKeyChance: number;
    bossKeyChance: number;
  };
}

// ── Item (plain data shape, NOT entity) ──────────────────

export interface BagItemData {
  id: string;
  name: string;
  type: string;
  quality: string;
  level?: number;
  icon?: string;
  acquiredAt: number;
  tier?: number;
  locationId?: string;
  locationAct?: number;
  bossId?: string;
  bossKeyTier?: number;

  /** Item status: 'bag' | 'equipped' | future: 'trade' */
  status?: string;
  /** Extensible properties for type-specific data (future gear stats, etc.) */
  properties?: Record<string, unknown>;

  /** Potion-specific fields (type = 'potion') */
  flaskType?: string;
  /** Max sips — determined by quality (common=2, rare=3, epic=4, legendary=5). */
  maxCharges?: number;
  /** Remaining sips (starts at maxCharges, decrements on use). */
  currentCharges?: number;
  /** Fraction of maxHp healed per sip (e.g. 0.12 = 12%). */
  healPercent?: number;
}
