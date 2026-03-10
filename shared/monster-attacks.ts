/**
 * Monster attack definitions - shared between FE (display) and BE (logic).
 *
 * Each monster type has a pool of 5 attacks with:
 *  - name: display name for combat log
 *  - damage: elemental damage profile (fractions summing to ~1.0)
 *  - damageMul: multiplier on the monster's base scaledDamage (0.5 = half, 2.0 = double)
 *  - speed: seconds between this attack becoming available (0.3..3.0)
 *  - pauseAfter: seconds of pause after executing this attack before next
 *  - weight: probability weight for random selection
 */

import type { ElementalDamage } from './types';

export interface MonsterAttack {
  name: string;
  damage: ElementalDamage;
  damageMul: number;
  speed: number;
  pauseAfter: number;
  weight: number;
}

export const MONSTER_ATTACKS: Record<string, MonsterAttack[]> = {
  // ── Goblin ─────────────────────────────────────────────
  Goblin: [
    { name: 'Shiv',          damage: { physical: 1.0 },                       damageMul: 0.6,  speed: 0.5,  pauseAfter: 0.2, weight: 35 },
    { name: 'Claw Scratch',  damage: { physical: 1.0 },                       damageMul: 0.4,  speed: 0.3,  pauseAfter: 0.15, weight: 30 },
    { name: 'Rock Throw',    damage: { physical: 0.9, cold: 0.1 },           damageMul: 0.8,  speed: 1.0,  pauseAfter: 0.5, weight: 20 },
    { name: 'Sneak Attack',  damage: { physical: 1.0 },                       damageMul: 1.4,  speed: 2.0,  pauseAfter: 1.0, weight: 10 },
    { name: 'Bite',          damage: { physical: 1.0 },                       damageMul: 0.3,  speed: 0.3,  pauseAfter: 0.15, weight: 5 },
  ],

  // ── Ninja ──────────────────────────────────────────────
  Ninja: [
    { name: 'Shuriken',      damage: { physical: 0.8, lightning: 0.2 },      damageMul: 0.9,  speed: 0.7,  pauseAfter: 0.3, weight: 30 },
    { name: 'Shadow Strike',  damage: { physical: 0.6, pure: 0.4 },          damageMul: 1.5,  speed: 2.0,  pauseAfter: 1.2, weight: 15 },
    { name: 'Kunai Barrage',  damage: { physical: 1.0 },                      damageMul: 0.5,  speed: 0.4,  pauseAfter: 0.2, weight: 25 },
    { name: 'Smoke Bomb',     damage: { cold: 0.5, physical: 0.5 },          damageMul: 0.7,  speed: 1.2,  pauseAfter: 0.8, weight: 15 },
    { name: 'Vanish Slash',   damage: { physical: 0.9, pure: 0.1 },          damageMul: 1.8,  speed: 2.5,  pauseAfter: 1.5, weight: 15 },
  ],

  // ── Necromancer ────────────────────────────────────────
  Necromancer: [
    { name: 'Dark Bolt',      damage: { cold: 0.6, pure: 0.4 },              damageMul: 1.0,  speed: 1.0,  pauseAfter: 0.6, weight: 30 },
    { name: 'Soul Drain',     damage: { pure: 1.0 },                          damageMul: 0.8,  speed: 1.5,  pauseAfter: 1.0, weight: 20 },
    { name: 'Bone Spear',     damage: { physical: 0.7, cold: 0.3 },          damageMul: 1.2,  speed: 1.2,  pauseAfter: 0.7, weight: 20 },
    { name: 'Corpse Explosion', damage: { fire: 0.5, physical: 0.5 },        damageMul: 1.6,  speed: 2.2,  pauseAfter: 1.5, weight: 15 },
    { name: 'Wither',         damage: { cold: 0.8, pure: 0.2 },              damageMul: 0.5,  speed: 0.6,  pauseAfter: 0.3, weight: 15 },
  ],

  // ── Night Born ─────────────────────────────────────────
  'Night Born': [
    { name: 'Shadow Claw',    damage: { physical: 0.5, cold: 0.5 },          damageMul: 1.0,  speed: 0.8,  pauseAfter: 0.5, weight: 30 },
    { name: 'Dark Pulse',     damage: { cold: 0.7, pure: 0.3 },              damageMul: 1.3,  speed: 1.5,  pauseAfter: 1.0, weight: 20 },
    { name: 'Night Fang',     damage: { physical: 0.8, cold: 0.2 },          damageMul: 0.7,  speed: 0.5,  pauseAfter: 0.3, weight: 25 },
    { name: 'Void Scream',    damage: { pure: 0.8, cold: 0.2 },              damageMul: 1.7,  speed: 2.5,  pauseAfter: 1.5, weight: 10 },
    { name: 'Leech Touch',    damage: { cold: 0.6, pure: 0.4 },              damageMul: 0.6,  speed: 0.6,  pauseAfter: 0.4, weight: 15 },
  ],

  // ── Dark Knight ────────────────────────────────────────
  'Dark Knight': [
    { name: 'Cleave',         damage: { physical: 0.9, fire: 0.1 },          damageMul: 1.1,  speed: 1.0,  pauseAfter: 0.6, weight: 30 },
    { name: 'Shield Slam',    damage: { physical: 1.0 },                      damageMul: 0.8,  speed: 0.7,  pauseAfter: 0.4, weight: 25 },
    { name: 'Dark Judgment',  damage: { physical: 0.5, pure: 0.5 },          damageMul: 1.8,  speed: 2.5,  pauseAfter: 1.5, weight: 10 },
    { name: 'Overhead Smash', damage: { physical: 1.0 },                      damageMul: 1.4,  speed: 1.8,  pauseAfter: 1.0, weight: 15 },
    { name: 'Quick Slash',    damage: { physical: 0.8, lightning: 0.2 },     damageMul: 0.6,  speed: 0.5,  pauseAfter: 0.3, weight: 20 },
  ],

  // ── Reaper ─────────────────────────────────────────────
  Reaper: [
    { name: 'Scythe Sweep',   damage: { physical: 0.4, pure: 0.6 },         damageMul: 1.2,  speed: 1.2,  pauseAfter: 0.8, weight: 25 },
    { name: 'Death Mark',     damage: { pure: 1.0 },                          damageMul: 2.0,  speed: 3.0,  pauseAfter: 2.0, weight: 10 },
    { name: 'Soul Reap',      damage: { cold: 0.3, pure: 0.7 },              damageMul: 1.0,  speed: 1.0,  pauseAfter: 0.5, weight: 25 },
    { name: 'Phantom Slash',  damage: { physical: 0.5, pure: 0.5 },          damageMul: 0.8,  speed: 0.6,  pauseAfter: 0.3, weight: 25 },
    { name: 'Harvest',        damage: { pure: 0.8, cold: 0.2 },              damageMul: 1.5,  speed: 2.0,  pauseAfter: 1.2, weight: 15 },
  ],

  // ── Bandit ─────────────────────────────────────────────
  Bandit: [
    { name: 'Slash',        damage: { physical: 1.0 },                       damageMul: 1.0,  speed: 1.0,  pauseAfter: 0.5, weight: 40 },
    { name: 'Stab',         damage: { physical: 1.0 },                       damageMul: 0.7,  speed: 0.6,  pauseAfter: 0.3, weight: 30 },
    { name: 'Dirty Throw',  damage: { physical: 0.8, fire: 0.2 },           damageMul: 0.8,  speed: 1.5,  pauseAfter: 0.8, weight: 15 },
    { name: 'Backstab',     damage: { physical: 1.0 },                       damageMul: 1.8,  speed: 2.5,  pauseAfter: 1.2, weight: 10 },
    { name: 'Quick Jab',    damage: { physical: 1.0 },                       damageMul: 0.4,  speed: 0.3,  pauseAfter: 0.2, weight: 5 },
  ],

  // ── Wild Boar ──────────────────────────────────────────
  'Wild Boar': [
    { name: 'Gore',         damage: { physical: 1.0 },                       damageMul: 1.2,  speed: 1.2,  pauseAfter: 0.8, weight: 35 },
    { name: 'Charge',       damage: { physical: 1.0 },                       damageMul: 1.6,  speed: 2.0,  pauseAfter: 1.5, weight: 20 },
    { name: 'Tusk Swipe',   damage: { physical: 1.0 },                       damageMul: 0.9,  speed: 0.8,  pauseAfter: 0.4, weight: 25 },
    { name: 'Stomp',        damage: { physical: 0.9, cold: 0.1 },           damageMul: 0.7,  speed: 1.0,  pauseAfter: 0.6, weight: 15 },
    { name: 'Frenzy Bite',  damage: { physical: 1.0 },                       damageMul: 0.5,  speed: 0.4,  pauseAfter: 0.3, weight: 5 },
  ],

  // ── Forest Spirit ──────────────────────────────────────
  'Forest Spirit': [
    { name: 'Frost Bolt',     damage: { cold: 0.8, pure: 0.2 },             damageMul: 1.0,  speed: 1.2,  pauseAfter: 0.6, weight: 30 },
    { name: 'Vine Lash',      damage: { physical: 0.3, cold: 0.7 },         damageMul: 0.8,  speed: 0.8,  pauseAfter: 0.4, weight: 25 },
    { name: 'Spirit Drain',   damage: { pure: 1.0 },                         damageMul: 0.6,  speed: 1.5,  pauseAfter: 1.0, weight: 15 },
    { name: 'Blizzard Breath', damage: { cold: 1.0 },                        damageMul: 1.5,  speed: 2.5,  pauseAfter: 1.5, weight: 15 },
    { name: 'Thorn Whip',     damage: { physical: 0.5, cold: 0.5 },         damageMul: 0.5,  speed: 0.5,  pauseAfter: 0.3, weight: 15 },
  ],

  // ── Ronin ──────────────────────────────────────────────
  Ronin: [
    { name: 'Katana Strike',   damage: { physical: 0.9, lightning: 0.1 },   damageMul: 1.0,  speed: 0.9,  pauseAfter: 0.5, weight: 30 },
    { name: 'Iaijutsu',        damage: { physical: 1.0 },                    damageMul: 2.0,  speed: 3.0,  pauseAfter: 1.5, weight: 10 },
    { name: 'Thunder Cut',     damage: { physical: 0.5, lightning: 0.5 },   damageMul: 1.2,  speed: 1.5,  pauseAfter: 0.8, weight: 20 },
    { name: 'Parry Slash',     damage: { physical: 1.0 },                    damageMul: 0.6,  speed: 0.5,  pauseAfter: 0.3, weight: 25 },
    { name: 'Wind Blade',      damage: { physical: 0.7, cold: 0.3 },        damageMul: 0.8,  speed: 1.0,  pauseAfter: 0.6, weight: 15 },
  ],

  // ── Oni ────────────────────────────────────────────────
  Oni: [
    { name: 'Fire Fist',      damage: { fire: 0.8, physical: 0.2 },         damageMul: 1.0,  speed: 1.0,  pauseAfter: 0.6, weight: 30 },
    { name: 'Inferno Slam',   damage: { fire: 1.0 },                         damageMul: 1.8,  speed: 2.5,  pauseAfter: 1.5, weight: 15 },
    { name: 'Claw Rake',      damage: { physical: 0.6, fire: 0.4 },         damageMul: 0.7,  speed: 0.6,  pauseAfter: 0.3, weight: 25 },
    { name: 'Magma Spit',     damage: { fire: 0.9, pure: 0.1 },             damageMul: 1.3,  speed: 1.8,  pauseAfter: 1.0, weight: 15 },
    { name: 'Burning Rush',   damage: { fire: 0.7, physical: 0.3 },         damageMul: 0.5,  speed: 0.4,  pauseAfter: 0.3, weight: 15 },
  ],

  // ── Tengu ──────────────────────────────────────────────
  Tengu: [
    { name: 'Lightning Talon', damage: { lightning: 0.9, physical: 0.1 },   damageMul: 1.0,  speed: 0.8,  pauseAfter: 0.5, weight: 30 },
    { name: 'Storm Dive',      damage: { lightning: 1.0 },                   damageMul: 1.7,  speed: 2.2,  pauseAfter: 1.2, weight: 15 },
    { name: 'Wing Gust',       damage: { cold: 0.4, lightning: 0.6 },       damageMul: 0.8,  speed: 1.0,  pauseAfter: 0.6, weight: 20 },
    { name: 'Feather Volley',  damage: { physical: 0.3, lightning: 0.7 },   damageMul: 0.6,  speed: 0.5,  pauseAfter: 0.3, weight: 20 },
    { name: 'Thunder Scream',  damage: { lightning: 0.8, pure: 0.2 },       damageMul: 1.4,  speed: 2.0,  pauseAfter: 1.0, weight: 15 },
  ],

  // ── Dragon ─────────────────────────────────────────────
  Dragon: [
    { name: 'Fire Breath',    damage: { fire: 1.0 },                         damageMul: 1.3,  speed: 1.5,  pauseAfter: 1.0, weight: 25 },
    { name: 'Tail Sweep',     damage: { physical: 0.8, fire: 0.2 },         damageMul: 0.9,  speed: 1.0,  pauseAfter: 0.5, weight: 25 },
    { name: 'Infernal Nova',  damage: { fire: 0.7, pure: 0.3 },             damageMul: 2.0,  speed: 3.0,  pauseAfter: 2.0, weight: 10 },
    { name: 'Claw Strike',    damage: { physical: 0.5, fire: 0.5 },         damageMul: 0.7,  speed: 0.7,  pauseAfter: 0.4, weight: 25 },
    { name: 'Magma Eruption', damage: { fire: 0.6, lightning: 0.2, pure: 0.2 }, damageMul: 1.5, speed: 2.0, pauseAfter: 1.2, weight: 15 },
  ],

  // ── Shogun ─────────────────────────────────────────────
  Shogun: [
    { name: 'Blade Storm',    damage: { physical: 0.7, lightning: 0.3 },     damageMul: 1.2,  speed: 1.2,  pauseAfter: 0.8, weight: 25 },
    { name: 'Execution',      damage: { physical: 0.8, pure: 0.2 },         damageMul: 2.2,  speed: 3.0,  pauseAfter: 2.0, weight: 10 },
    { name: 'Thunder Slash',  damage: { lightning: 0.7, physical: 0.3 },    damageMul: 1.0,  speed: 1.0,  pauseAfter: 0.5, weight: 25 },
    { name: 'Command Strike', damage: { physical: 0.5, lightning: 0.3, pure: 0.2 }, damageMul: 1.5, speed: 2.0, pauseAfter: 1.2, weight: 15 },
    { name: 'Quick Draw',     damage: { physical: 1.0 },                     damageMul: 0.5,  speed: 0.4,  pauseAfter: 0.3, weight: 25 },
  ],
};

/**
 * Pick a random attack from a monster's attack pool using weighted selection.
 */
export function pickRandomAttack(attacks: MonsterAttack[]): MonsterAttack {
  const totalWeight = attacks.reduce((sum, a) => sum + a.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const atk of attacks) {
    roll -= atk.weight;
    if (roll <= 0) return atk;
  }
  return attacks[attacks.length - 1];
}
