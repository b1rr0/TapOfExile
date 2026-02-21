import type { ElementalDamage } from "./types.js";

/* ── Skill Render Types ─────────────────────────────────────── */

export type SkillRenderType =
  | "projectile"
  | "spawn_at_hero"
  | "spawn_at_enemy"
  | "fullscreen";

export interface SkillRenderMeta {
  renderType: SkillRenderType;
  renderDurationMs: number;
  drawW: number;
  drawH: number;
}

/* ── Active Skill Definitions ─────────────────────────────────── */

export type ActiveSkillId =
  | "fireball"
  | "sword_throw"
  // Slash / Melee
  | "slash"
  | "slash_arc"
  | "slash_cross"
  | "slash_sweep"
  | "thrust_1"
  | "thrust_2"
  // Heal
  | "heal"
  // Generic effects
  | "effect_star"
  | "effect_sparkle"
  | "effect_sparks"
  | "effect_embers"
  // Fire
  | "fire_breath"
  | "firebolt"
  | "fire_hit"
  | "explosion"
  | "explosion_2"
  // Earth
  | "earth_projectile"
  | "earth_impact"
  | "earth_rocks"
  | "earth_bump"
  | "earth_wall"
  // Thunder
  | "thunder_projectile"
  | "thunder_hit"
  | "thunder_ball"
  | "thunder_splash"
  | "thunder_strike"
  // Lightning (new)
  | "lightning_wave"
  | "lightning_arc"
  | "lightning_bolt"
  | "lightning_strike_2"
  | "lightning_ring"
  | "lightning_sparks"
  // Water
  | "water_startup"
  | "water_spike"
  | "water_splash"
  | "water_ball"
  // Ice
  | "ice_shard"
  | "ice_hit"
  | "ice_burst"
  | "ice_shatter"
  // Wood
  | "wood_projectile"
  | "wood_hit"
  | "wood_thorns";

export interface ActiveSkillDef {
  id: ActiveSkillId;
  name: string;
  cooldownMs: number;
  damageMultiplier: number;
  elementalProfile: ElementalDamage;
  /** Fallback icon path (relative to /assets/). Prefer first-frame extraction. */
  iconPath?: string;
  /** Path to projectile sprite JSON atlas (relative to /assets/) */
  spritePath: string;
}

export const ACTIVE_SKILLS: Record<ActiveSkillId, ActiveSkillDef> = {
  /* ── Original Skills ─────────────────────────────────────── */
  fireball: {
    id: "fireball",
    name: "Fireball",
    cooldownMs: 3000,
    damageMultiplier: 5,
    elementalProfile: { fire: 1.0 },
    iconPath: "skils_sprites/fire/fireball/fireball_sprite.png",
    spritePath: "skils_sprites/fire/fireball/fireball_sprite.json",
  },
  sword_throw: {
    id: "sword_throw",
    name: "Sword Throw",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    iconPath: "skils_sprites/physical/sword_throw/sword_throw_sprite.png",
    spritePath: "skils_sprites/physical/sword_throw/sword_throw_sprite.json",
  },

  /* ── Slash / Melee ───────────────────────────────────────── */
  slash: {
    id: "slash",
    name: "Slash",
    cooldownMs: 2000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/physical/slash/slash_sprite.json",
  },
  thrust_1: {
    id: "thrust_1",
    name: "Thrust",
    cooldownMs: 2000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/physical/thrust_1/thrust_1_sprite.json",
  },
  thrust_2: {
    id: "thrust_2",
    name: "Thrust II",
    cooldownMs: 2000,
    damageMultiplier: 3.5,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/physical/thrust_2/thrust_2_sprite.json",
  },
  slash_arc: {
    id: "slash_arc",
    name: "Slash Arc",
    cooldownMs: 2000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/physical/slash_arc/slash_arc_sprite.json",
  },
  slash_cross: {
    id: "slash_cross",
    name: "Slash Cross",
    cooldownMs: 2000,
    damageMultiplier: 3.5,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/physical/slash_cross/slash_cross_sprite.json",
  },
  slash_sweep: {
    id: "slash_sweep",
    name: "Slash Sweep",
    cooldownMs: 2500,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/physical/slash_sweep/slash_sweep_sprite.json",
  },

  /* ── Heal ────────────────────────────────────────────────── */
  heal: {
    id: "heal",
    name: "Heal",
    cooldownMs: 5000,
    damageMultiplier: 0,
    elementalProfile: {},
    spritePath: "skils_sprites/healing/heal/heal_sprite.json",
  },

  /* ── Generic Effects ─────────────────────────────────────── */
  effect_star: {
    id: "effect_star",
    name: "Star Burst",
    cooldownMs: 3000,
    damageMultiplier: 3,
    elementalProfile: { fire: 0.5, physical: 0.5 },
    spritePath: "skils_sprites/effects/effect_star/effect_star_sprite.json",
  },
  effect_sparkle: {
    id: "effect_sparkle",
    name: "Sparkle",
    cooldownMs: 2500,
    damageMultiplier: 2,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/effects/effect_sparkle/effect_sparkle_sprite.json",
  },
  effect_sparks: {
    id: "effect_sparks",
    name: "Sparks",
    cooldownMs: 2000,
    damageMultiplier: 2,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/effects/effect_sparks/effect_sparks_sprite.json",
  },
  effect_embers: {
    id: "effect_embers",
    name: "Embers",
    cooldownMs: 2000,
    damageMultiplier: 2,
    elementalProfile: { fire: 1.0 },
    spritePath: "skils_sprites/effects/effect_embers/effect_embers_sprite.json",
  },

  /* ── Fire ─────────────────────────────────────────────────── */
  fire_breath: {
    id: "fire_breath",
    name: "Fire Breath",
    cooldownMs: 4000,
    damageMultiplier: 6,
    elementalProfile: { fire: 1.0 },
    spritePath: "skils_sprites/fire/fire_breath/fire_breath_sprite.json",
  },
  firebolt: {
    id: "firebolt",
    name: "Firebolt",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { fire: 1.0 },
    spritePath: "skils_sprites/fire/firebolt/firebolt_sprite.json",
  },
  fire_hit: {
    id: "fire_hit",
    name: "Fire Hit",
    cooldownMs: 2500,
    damageMultiplier: 3,
    elementalProfile: { fire: 1.0 },
    spritePath: "skils_sprites/fire/fire_hit/fire_hit_sprite.json",
  },
  explosion: {
    id: "explosion",
    name: "Explosion",
    cooldownMs: 5000,
    damageMultiplier: 8,
    elementalProfile: { fire: 0.8, physical: 0.2 },
    spritePath: "skils_sprites/fire/explosion/explosion_sprite.json",
  },
  explosion_2: {
    id: "explosion_2",
    name: "Explosion II",
    cooldownMs: 5000,
    damageMultiplier: 9,
    elementalProfile: { fire: 0.8, physical: 0.2 },
    spritePath: "skils_sprites/fire/explosion_2/explosion_2_sprite.json",
  },

  /* ── Earth ────────────────────────────────────────────────── */
  earth_projectile: {
    id: "earth_projectile",
    name: "Earth Projectile",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/earth/earth_projectile/earth_projectile_sprite.json",
  },
  earth_impact: {
    id: "earth_impact",
    name: "Earth Impact",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/earth/earth_impact/earth_impact_sprite.json",
  },
  earth_rocks: {
    id: "earth_rocks",
    name: "Earth Rocks",
    cooldownMs: 4000,
    damageMultiplier: 5,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/earth/earth_rocks/earth_rocks_sprite.json",
  },
  earth_bump: {
    id: "earth_bump",
    name: "Earth Bump",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/earth/earth_bump/earth_bump_sprite.json",
  },
  earth_wall: {
    id: "earth_wall",
    name: "Earth Wall",
    cooldownMs: 4000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/earth/earth_wall/earth_wall_sprite.json",
  },

  /* ── Thunder ──────────────────────────────────────────────── */
  thunder_projectile: {
    id: "thunder_projectile",
    name: "Thunder Bolt",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/thunder_projectile/thunder_projectile_sprite.json",
  },
  thunder_hit: {
    id: "thunder_hit",
    name: "Thunder Hit",
    cooldownMs: 2500,
    damageMultiplier: 3,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/thunder_hit/thunder_hit_sprite.json",
  },
  thunder_ball: {
    id: "thunder_ball",
    name: "Thunder Ball",
    cooldownMs: 4000,
    damageMultiplier: 6,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/thunder_ball/thunder_ball_sprite.json",
  },
  thunder_splash: {
    id: "thunder_splash",
    name: "Thunder Splash",
    cooldownMs: 4000,
    damageMultiplier: 6,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/thunder_splash/thunder_splash_sprite.json",
  },
  thunder_strike: {
    id: "thunder_strike",
    name: "Thunder Strike",
    cooldownMs: 5000,
    damageMultiplier: 8,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/thunder_strike/thunder_strike_sprite.json",
  },
  lightning_wave: {
    id: "lightning_wave",
    name: "Lightning Wave",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/lightning_wave/lightning_wave_sprite.json",
  },
  lightning_arc: {
    id: "lightning_arc",
    name: "Lightning Arc",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/lightning_arc/lightning_arc_sprite.json",
  },
  lightning_bolt: {
    id: "lightning_bolt",
    name: "Lightning Bolt",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/lightning_bolt/lightning_bolt_sprite.json",
  },
  lightning_strike_2: {
    id: "lightning_strike_2",
    name: "Lightning Strike II",
    cooldownMs: 4000,
    damageMultiplier: 6,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/lightning_strike_2/lightning_strike_2_sprite.json",
  },
  lightning_ring: {
    id: "lightning_ring",
    name: "Lightning Ring",
    cooldownMs: 4000,
    damageMultiplier: 5,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/lightning_ring/lightning_ring_sprite.json",
  },
  lightning_sparks: {
    id: "lightning_sparks",
    name: "Lightning Sparks",
    cooldownMs: 3500,
    damageMultiplier: 4,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/lightning/lightning_sparks/lightning_sparks_sprite.json",
  },

  /* ── Water ────────────────────────────────────────────────── */
  water_startup: {
    id: "water_startup",
    name: "Water Startup",
    cooldownMs: 2000,
    damageMultiplier: 1,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/cold/water_startup/water_startup_sprite.json",
  },
  water_spike: {
    id: "water_spike",
    name: "Water Spike",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/cold/water_spike/water_spike_sprite.json",
  },
  water_splash: {
    id: "water_splash",
    name: "Water Splash",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/cold/water_splash/water_splash_sprite.json",
  },
  water_ball: {
    id: "water_ball",
    name: "Water Ball",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/cold/water_ball/water_ball_sprite.json",
  },

  /* ── Ice ──────────────────────────────────────────────────── */
  ice_shard: {
    id: "ice_shard",
    name: "Ice Shard",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/cold/ice_shard/ice_shard_sprite.json",
  },
  ice_hit: {
    id: "ice_hit",
    name: "Ice Hit",
    cooldownMs: 2500,
    damageMultiplier: 3,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/cold/ice_hit/ice_hit_sprite.json",
  },
  ice_burst: {
    id: "ice_burst",
    name: "Ice Burst",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/cold/ice_burst/ice_burst_sprite.json",
  },
  ice_shatter: {
    id: "ice_shatter",
    name: "Ice Shatter",
    cooldownMs: 4000,
    damageMultiplier: 6,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/cold/ice_shatter/ice_shatter_sprite.json",
  },

  /* ── Wood ─────────────────────────────────────────────────── */
  wood_projectile: {
    id: "wood_projectile",
    name: "Wood Projectile",
    cooldownMs: 3000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/wood/wood_projectile/wood_projectile_sprite.json",
  },
  wood_hit: {
    id: "wood_hit",
    name: "Wood Hit",
    cooldownMs: 2500,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/wood/wood_hit/wood_hit_sprite.json",
  },
  wood_thorns: {
    id: "wood_thorns",
    name: "Wood Thorns",
    cooldownMs: 3500,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/wood/wood_thorns/wood_thorns_sprite.json",
  },
};
