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
  // Water
  | "water_startup"
  | "water_spike"
  | "water_splash"
  | "water_ball"
  | "water_ball_impact"
  | "water_blast"
  | "water_blast_end"
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
    iconPath: "skils_sprites/fire_srpite/fire_sprite.png",
    spritePath: "skils_sprites/fire_srpite/fire_sprite.json",
  },
  sword_throw: {
    id: "sword_throw",
    name: "Sword Throw",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    iconPath: "skils_sprites/sword_throw/Sword_sprite.png",
    spritePath: "skils_sprites/sword_throw/Sword_sprite.json",
  },

  /* ── Slash / Melee ───────────────────────────────────────── */
  slash: {
    id: "slash",
    name: "Slash",
    cooldownMs: 2000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/slash/slash_sprite.json",
  },
  thrust_1: {
    id: "thrust_1",
    name: "Thrust",
    cooldownMs: 2000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/thrust_1/thrust_1_sprite.json",
  },
  thrust_2: {
    id: "thrust_2",
    name: "Thrust II",
    cooldownMs: 2000,
    damageMultiplier: 3.5,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/thrust_2/thrust_2_sprite.json",
  },

  /* ── Heal ────────────────────────────────────────────────── */
  heal: {
    id: "heal",
    name: "Heal",
    cooldownMs: 5000,
    damageMultiplier: 0,
    elementalProfile: {},
    spritePath: "skils_sprites/heal/heal_sprite.json",
  },

  /* ── Generic Effects ─────────────────────────────────────── */
  effect_star: {
    id: "effect_star",
    name: "Star Burst",
    cooldownMs: 3000,
    damageMultiplier: 3,
    elementalProfile: { fire: 0.5, physical: 0.5 },
    spritePath: "skils_sprites/effect_star/effect_star_sprite.json",
  },
  effect_sparkle: {
    id: "effect_sparkle",
    name: "Sparkle",
    cooldownMs: 2500,
    damageMultiplier: 2,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/effect_sparkle/effect_sparkle_sprite.json",
  },
  effect_sparks: {
    id: "effect_sparks",
    name: "Sparks",
    cooldownMs: 2000,
    damageMultiplier: 2,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/effect_sparks/effect_sparks_sprite.json",
  },
  effect_embers: {
    id: "effect_embers",
    name: "Embers",
    cooldownMs: 2000,
    damageMultiplier: 2,
    elementalProfile: { fire: 1.0 },
    spritePath: "skils_sprites/effect_embers/effect_embers_sprite.json",
  },

  /* ── Fire ─────────────────────────────────────────────────── */
  fire_breath: {
    id: "fire_breath",
    name: "Fire Breath",
    cooldownMs: 4000,
    damageMultiplier: 6,
    elementalProfile: { fire: 1.0 },
    spritePath: "skils_sprites/fire_breath/fire_breath_sprite.json",
  },
  firebolt: {
    id: "firebolt",
    name: "Firebolt",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { fire: 1.0 },
    spritePath: "skils_sprites/firebolt/firebolt_sprite.json",
  },
  fire_hit: {
    id: "fire_hit",
    name: "Fire Hit",
    cooldownMs: 2500,
    damageMultiplier: 3,
    elementalProfile: { fire: 1.0 },
    spritePath: "skils_sprites/fire_hit/fire_hit_sprite.json",
  },
  explosion: {
    id: "explosion",
    name: "Explosion",
    cooldownMs: 5000,
    damageMultiplier: 8,
    elementalProfile: { fire: 0.8, physical: 0.2 },
    spritePath: "skils_sprites/explosion/explosion_sprite.json",
  },
  explosion_2: {
    id: "explosion_2",
    name: "Explosion II",
    cooldownMs: 5000,
    damageMultiplier: 9,
    elementalProfile: { fire: 0.8, physical: 0.2 },
    spritePath: "skils_sprites/explosion_2/explosion_2_sprite.json",
  },

  /* ── Earth ────────────────────────────────────────────────── */
  earth_projectile: {
    id: "earth_projectile",
    name: "Earth Projectile",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/earth_projectile/earth_projectile_sprite.json",
  },
  earth_impact: {
    id: "earth_impact",
    name: "Earth Impact",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/earth_impact/earth_impact_sprite.json",
  },
  earth_rocks: {
    id: "earth_rocks",
    name: "Earth Rocks",
    cooldownMs: 4000,
    damageMultiplier: 5,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/earth_rocks/earth_rocks_sprite.json",
  },
  earth_bump: {
    id: "earth_bump",
    name: "Earth Bump",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/earth_bump/earth_bump_sprite.json",
  },
  earth_wall: {
    id: "earth_wall",
    name: "Earth Wall",
    cooldownMs: 4000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/earth_wall/earth_wall_sprite.json",
  },

  /* ── Thunder ──────────────────────────────────────────────── */
  thunder_projectile: {
    id: "thunder_projectile",
    name: "Thunder Bolt",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/thunder_projectile/thunder_projectile_sprite.json",
  },
  thunder_hit: {
    id: "thunder_hit",
    name: "Thunder Hit",
    cooldownMs: 2500,
    damageMultiplier: 3,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/thunder_hit/thunder_hit_sprite.json",
  },
  thunder_ball: {
    id: "thunder_ball",
    name: "Thunder Ball",
    cooldownMs: 4000,
    damageMultiplier: 6,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/thunder_ball/thunder_ball_sprite.json",
  },
  thunder_splash: {
    id: "thunder_splash",
    name: "Thunder Splash",
    cooldownMs: 4000,
    damageMultiplier: 6,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/thunder_splash/thunder_splash_sprite.json",
  },
  thunder_strike: {
    id: "thunder_strike",
    name: "Thunder Strike",
    cooldownMs: 5000,
    damageMultiplier: 8,
    elementalProfile: { lightning: 1.0 },
    spritePath: "skils_sprites/thunder_strike/thunder_strike_sprite.json",
  },

  /* ── Water ────────────────────────────────────────────────── */
  water_startup: {
    id: "water_startup",
    name: "Water Startup",
    cooldownMs: 2000,
    damageMultiplier: 1,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/water_startup/water_startup_sprite.json",
  },
  water_spike: {
    id: "water_spike",
    name: "Water Spike",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/water_spike/water_spike_sprite.json",
  },
  water_splash: {
    id: "water_splash",
    name: "Water Splash",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/water_splash/water_splash_sprite.json",
  },
  water_ball: {
    id: "water_ball",
    name: "Water Ball",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/water_ball/water_ball_sprite.json",
  },
  water_ball_impact: {
    id: "water_ball_impact",
    name: "Water Ball Impact",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/water_ball_impact/water_ball_impact_sprite.json",
  },
  water_blast: {
    id: "water_blast",
    name: "Water Blast",
    cooldownMs: 5000,
    damageMultiplier: 7,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/water_blast/water_blast_sprite.json",
  },
  water_blast_end: {
    id: "water_blast_end",
    name: "Water Blast End",
    cooldownMs: 5000,
    damageMultiplier: 7,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/water_blast_end/water_blast_end_sprite.json",
  },

  /* ── Ice ──────────────────────────────────────────────────── */
  ice_shard: {
    id: "ice_shard",
    name: "Ice Shard",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/ice_shard/ice_shard_sprite.json",
  },
  ice_hit: {
    id: "ice_hit",
    name: "Ice Hit",
    cooldownMs: 2500,
    damageMultiplier: 3,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/ice_hit/ice_hit_sprite.json",
  },
  ice_burst: {
    id: "ice_burst",
    name: "Ice Burst",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/ice_burst/ice_burst_sprite.json",
  },
  ice_shatter: {
    id: "ice_shatter",
    name: "Ice Shatter",
    cooldownMs: 4000,
    damageMultiplier: 6,
    elementalProfile: { cold: 1.0 },
    spritePath: "skils_sprites/ice_shatter/ice_shatter_sprite.json",
  },

  /* ── Wood ─────────────────────────────────────────────────── */
  wood_projectile: {
    id: "wood_projectile",
    name: "Wood Projectile",
    cooldownMs: 3000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/wood_projectile/wood_projectile_sprite.json",
  },
  wood_hit: {
    id: "wood_hit",
    name: "Wood Hit",
    cooldownMs: 2500,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/wood_hit/wood_hit_sprite.json",
  },
  wood_thorns: {
    id: "wood_thorns",
    name: "Wood Thorns",
    cooldownMs: 3500,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    spritePath: "skils_sprites/wood_thorns/wood_thorns_sprite.json",
  },
};
