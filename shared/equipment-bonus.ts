/**
 * Equipment Bonus Aggregation — single source of truth.
 *
 * Sums all stat bonuses from equipped gear items.
 * Used by both server (combat + player state) and shared logic.
 */

import type { StatId, RolledStat } from './equipment-defs';
import type { ElementalDamage, ElementalResistance } from './types';

// ── Aggregated bonuses interface ────────────────────────

export interface EquipmentBonuses {
  // Offensive
  flatPhysDmg: number;
  pctPhysDmg: number;
  flatFireDmg: number;
  flatColdDmg: number;
  flatLightningDmg: number;
  critChance: number;        // percentage points (e.g. 5 = +5%)
  critMultiplier: number;    // percentage points (e.g. 20 = +20%)
  // Defensive
  flatHp: number;
  pctHp: number;
  flatArmor: number;
  pctArmor: number;
  flatEvasion: number;
  pctEvasion: number;
  flatEnergyShield: number;
  pctEnergyShield: number;
  blockChance: number;       // percentage points
  fireRes: number;
  coldRes: number;
  lightningRes: number;
  physRes: number;
  // Utility
  goldFind: number;          // percentage
  xpBonus: number;           // percentage
  lifeRegen: number;         // HP per second
  lifeOnHit: number;         // flat HP per hit
  passiveDpsBonus: number;   // percentage
}

/** Mapping from StatId → EquipmentBonuses key */
const STAT_TO_BONUS: Record<StatId, keyof EquipmentBonuses> = {
  flat_phys_dmg: 'flatPhysDmg',
  pct_phys_dmg: 'pctPhysDmg',
  flat_fire_dmg: 'flatFireDmg',
  flat_cold_dmg: 'flatColdDmg',
  flat_lightning_dmg: 'flatLightningDmg',
  crit_chance: 'critChance',
  crit_multiplier: 'critMultiplier',
  flat_hp: 'flatHp',
  pct_hp: 'pctHp',
  flat_armor: 'flatArmor',
  pct_armor: 'pctArmor',
  flat_evasion: 'flatEvasion',
  pct_evasion: 'pctEvasion',
  flat_energy_shield: 'flatEnergyShield',
  pct_energy_shield: 'pctEnergyShield',
  block_chance: 'blockChance',
  fire_res: 'fireRes',
  cold_res: 'coldRes',
  lightning_res: 'lightningRes',
  phys_res: 'physRes',
  gold_find: 'goldFind',
  xp_bonus: 'xpBonus',
  life_regen: 'lifeRegen',
  life_on_hit: 'lifeOnHit',
  passive_dps_bonus: 'passiveDpsBonus',
};

/** Create zeroed-out bonuses object */
export function emptyBonuses(): EquipmentBonuses {
  return {
    flatPhysDmg: 0,
    pctPhysDmg: 0,
    flatFireDmg: 0,
    flatColdDmg: 0,
    flatLightningDmg: 0,
    critChance: 0,
    critMultiplier: 0,
    flatHp: 0,
    pctHp: 0,
    flatArmor: 0,
    pctArmor: 0,
    flatEvasion: 0,
    pctEvasion: 0,
    flatEnergyShield: 0,
    pctEnergyShield: 0,
    blockChance: 0,
    fireRes: 0,
    coldRes: 0,
    lightningRes: 0,
    physRes: 0,
    goldFind: 0,
    xpBonus: 0,
    lifeRegen: 0,
    lifeOnHit: 0,
    passiveDpsBonus: 0,
  };
}

/** Add a single stat to bonuses accumulator */
function addStat(bonuses: EquipmentBonuses, stat: RolledStat): void {
  const key = STAT_TO_BONUS[stat.id];
  if (key) {
    (bonuses as any)[key] += stat.value;
  }
}

/**
 * Aggregate all equipment stat bonuses from an array of equipped item properties.
 *
 * Each item should have `properties` with optional `stats: RolledStat[]`
 * and optional `implicit: RolledStat`.
 *
 * Also adds `baseDamage` from weapons to `flatPhysDmg`.
 */
export function aggregateEquipmentStats(
  items: Array<{ properties: Record<string, any> }>,
): EquipmentBonuses {
  const bonuses = emptyBonuses();

  for (const item of items) {
    const props = item.properties;
    if (!props) continue;

    // Add base weapon damage as flat physical damage
    if (typeof props.baseDamage === 'number' && props.baseDamage > 0) {
      bonuses.flatPhysDmg += props.baseDamage;
    }

    // Add implicit stat (rings, belts)
    if (props.implicit && typeof props.implicit === 'object' && props.implicit.id) {
      addStat(bonuses, props.implicit as RolledStat);
    }

    // Add rolled stats
    if (Array.isArray(props.stats)) {
      for (const stat of props.stats) {
        if (stat && typeof stat === 'object' && stat.id) {
          addStat(bonuses, stat as RolledStat);
        }
      }
    }
  }

  return bonuses;
}

/**
 * Apply equipment bonuses to base character stats.
 * Returns effective (modified) values.
 *
 * Formula:
 *   tapDamage = floor((baseDamage + flatPhysDmg) * (1 + pctPhysDmg/100))
 *   maxHp     = floor((baseHp + flatHp) * (1 + pctHp/100))
 *   critChance += critChance / 100   (additive percentage points)
 *   critMultiplier += critMultiplier / 100
 *   dodgeChance: unchanged by equipment (evasion → dodge conversion not implemented yet)
 *   resistance += res values (capped at 75%)
 */
export interface BaseCharStats {
  tapDamage: number;
  maxHp: number;
  hp: number;
  critChance: number;       // 0..1
  critMultiplier: number;   // e.g. 1.5
  dodgeChance: number;      // 0..1
  specialValue: number;
  resistance: ElementalResistance | Record<string, number>;
  elementalDamage: ElementalDamage | Record<string, number>;
}

export interface EffectiveStats extends BaseCharStats {
  /** Extra flat elemental damage from gear */
  gearFireDmg: number;
  gearColdDmg: number;
  gearLightningDmg: number;
  /** Utility stats */
  goldFind: number;
  xpBonus: number;
  lifeOnHit: number;
  lifeRegen: number;
  armor: number;
  blockChance: number;
  passiveDpsBonus: number;
}

const RES_CAP = 75;

export function applyBonuses(
  base: BaseCharStats,
  bonuses: EquipmentBonuses,
): EffectiveStats {
  // Damage: (base + flat) * (1 + pct/100)
  const effectiveDmg = Math.floor(
    (base.tapDamage + bonuses.flatPhysDmg) * (1 + bonuses.pctPhysDmg / 100),
  );

  // HP: (base + flat) * (1 + pct/100)
  const effectiveMaxHp = Math.floor(
    (base.maxHp + bonuses.flatHp) * (1 + bonuses.pctHp / 100),
  );

  // Crit chance: additive (equipment gives percentage points like +5%)
  const effectiveCritChance = base.critChance + bonuses.critChance / 100;

  // Crit multiplier: additive (equipment gives percentage points like +20%)
  const effectiveCritMul = base.critMultiplier + bonuses.critMultiplier / 100;

  // Dodge: equipment evasion doesn't convert to dodge yet (future feature)
  const effectiveDodge = base.dodgeChance;

  // Block chance from equipment (stacks with warrior special)
  const gearBlock = bonuses.blockChance / 100;

  // Armor: (flat) * (1 + pct/100) — used for physical damage reduction
  const effectiveArmor = Math.floor(
    bonuses.flatArmor * (1 + bonuses.pctArmor / 100),
  );

  // Resistances: base + gear, capped at 75%
  const baseRes = (base.resistance || {}) as Record<string, number>;
  const effectiveRes: Record<string, number> = {
    physical: Math.min(RES_CAP, (baseRes.physical || 0) + bonuses.physRes),
    fire: Math.min(RES_CAP, (baseRes.fire || 0) + bonuses.fireRes),
    lightning: Math.min(RES_CAP, (baseRes.lightning || 0) + bonuses.lightningRes),
    cold: Math.min(RES_CAP, (baseRes.cold || 0) + bonuses.coldRes),
  };

  // HP: scale current HP proportionally if maxHp increased
  let effectiveHp = base.hp;
  if (effectiveMaxHp > base.maxHp && base.maxHp > 0) {
    effectiveHp = Math.floor(base.hp * effectiveMaxHp / base.maxHp);
  }
  effectiveHp = Math.min(effectiveHp, effectiveMaxHp);

  return {
    tapDamage: effectiveDmg,
    maxHp: effectiveMaxHp,
    hp: effectiveHp,
    critChance: effectiveCritChance,
    critMultiplier: effectiveCritMul,
    dodgeChance: effectiveDodge,
    specialValue: base.specialValue,
    resistance: effectiveRes,
    elementalDamage: base.elementalDamage,
    // Gear elemental damage
    gearFireDmg: bonuses.flatFireDmg,
    gearColdDmg: bonuses.flatColdDmg,
    gearLightningDmg: bonuses.flatLightningDmg,
    // Utility
    goldFind: bonuses.goldFind,
    xpBonus: bonuses.xpBonus,
    lifeOnHit: bonuses.lifeOnHit,
    lifeRegen: bonuses.lifeRegen,
    armor: effectiveArmor,
    blockChance: gearBlock,
    passiveDpsBonus: bonuses.passiveDpsBonus,
  };
}
