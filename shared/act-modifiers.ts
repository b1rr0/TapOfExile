/**
 * Act modifiers — permanent combat effects applied during location fights.
 *
 * Each modifier maps to a concrete combat stat:
 *   self:  'damage' (% tap dmg), 'critChance', 'dodge', 'armor' (flat), 'damageTaken' (% incoming)
 *   enemy: 'allVulnerability', 'physicalVulnerability', 'magicVulnerability'
 *
 * Difficulty curve: Act 1 net buff → Act 5 net debuff.
 */

export interface ActModifierDef {
  stat: string;
  target: 'self' | 'enemy';
  value: number;
}

/**
 * Minimal act modifier data used by the server for combat application.
 * Key = act number, value = array of { stat, target, value }.
 */
export const ACT_MODIFIER_EFFECTS: Record<number, ActModifierDef[]> = {
  /* Act 1 — The Castle (easy, 2 buffs / 1 mild debuff) */
  1: [
    { stat: 'armor',       target: 'self', value: 10 },    // Castle Walls
    { stat: 'damage',      target: 'self', value: 0.05 },  // Armory Access
    { stat: 'damageTaken', target: 'self', value: 0.03 },  // Dim Corridors
  ],

  /* Act 2 — Open Meadow (balanced, 2 buffs / 1 debuff) */
  2: [
    { stat: 'dodge',       target: 'self', value: 0.03 },  // Nature's Blessing
    { stat: 'critChance',  target: 'self', value: 0.03 },  // Open Sky
    { stat: 'damageTaken', target: 'self', value: 0.05 },  // Insect Swarm
  ],

  /* Act 3 — The Fields (harder, 2 buffs / 2 debuffs) */
  3: [
    { stat: 'damage',             target: 'self',  value: 0.05 },   // Tailwind
    { stat: 'magicVulnerability', target: 'enemy', value: 0.05 },   // Scorching Heat
    { stat: 'critChance',         target: 'self',  value: -0.05 },  // Dust Storm
    { stat: 'dodge',              target: 'self',  value: -0.03 },  // Rocky Terrain
  ],

  /* Act 4 — Snow Mountain (hard, 1 buff / 3 debuffs) */
  4: [
    { stat: 'armor',       target: 'self', value: 15 },     // Frost Armor
    { stat: 'damage',      target: 'self', value: -0.08 },  // Frostbite
    { stat: 'dodge',       target: 'self', value: -0.05 },  // Blizzard
    { stat: 'damageTaken', target: 'self', value: 0.05 },   // Thin Air
  ],

  /* Act 5 — The Depths (brutal, 1 buff / 3 debuffs) */
  5: [
    { stat: 'critChance',  target: 'self', value: 0.08 },   // Crystal Glow
    { stat: 'damageTaken', target: 'self', value: 0.08 },   // Lava Veins
    { stat: 'dodge',       target: 'self', value: -0.03 },  // Cave Darkness
    { stat: 'damage',      target: 'self', value: -0.05 },  // Toxic Fumes
  ],
};

/**
 * Get effect definitions for a given act number.
 */
export function getActModifierEffects(actNumber: number): ActModifierDef[] {
  return ACT_MODIFIER_EFFECTS[actNumber] || [];
}
