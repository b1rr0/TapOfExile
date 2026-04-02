import type {
  ElementalDamage,
  ElementalResistance,
  DamageBreakdown,
  DamageElement,
} from '@shared/types';

const ELEMENTS: DamageElement[] = ['physical', 'fire', 'lightning', 'cold', 'pure'];

/** Monster resistance hard cap (player cap = 75% in equipment-bonus.ts) */
const MONSTER_RES_CAP = 95;

/**
 * Compute per-element damage after applying monster resistances.
 *
 * Each element fraction of `rawDamage` is reduced by the corresponding
 * resistance. Pure damage bypasses all resistance.
 * Guarantees minimum 1 total damage when `rawDamage > 0`.
 */
export function computeElementalDamage(
  rawDamage: number,
  damageProfile: ElementalDamage,
  resistance: ElementalResistance,
): DamageBreakdown {
  const breakdown: DamageBreakdown = {
    total: 0,
    physical: 0,
    fire: 0,
    lightning: 0,
    cold: 0,
    pure: 0,
  };

  for (const elem of ELEMENTS) {
    const fraction = damageProfile[elem] || 0;
    if (fraction <= 0) continue;

    const rawElemDmg = rawDamage * fraction;

    if (elem === 'pure') {
      breakdown.pure = Math.floor(rawElemDmg);
    } else {
      const rawResist = resistance[elem as keyof ElementalResistance] || 0;
      const resist = Math.min(rawResist, MONSTER_RES_CAP);
      const effective = rawElemDmg * (1 - (resist * 0.01));
      breakdown[elem] = Math.max(0, Math.floor(effective));
    }
  }

  breakdown.total =
    breakdown.physical +
    breakdown.fire +
    breakdown.lightning +
    breakdown.cold +
    breakdown.pure;

  // Guarantee minimum 1 damage
  if (breakdown.total <= 0 && rawDamage > 0) {
    breakdown.total = 1;
    breakdown.physical = 1;
  }

  return breakdown;
}
