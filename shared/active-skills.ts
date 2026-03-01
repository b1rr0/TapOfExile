import type { ElementalDamage } from "./types.js";

/* ── Skill Render Types ─────────────────────────────────────── */

export type SkillRenderType =
  | "projectile"
  | "spawn_at_hero"
  | "spawn_at_enemy"
  | "fullscreen"
  | "looping_at_hero"
  | "looping_at_enemy";

export interface SkillRenderMeta {
  renderType: SkillRenderType;
  renderDurationMs: number;
  drawW: number;
  drawH: number;
  /** Frame index where the impact/explosion phase starts (projectile frames loop before it, impact frames play once at target). */
  impactFrame?: number;
}

/* ── Skill Types ────────────────────────────────────────────── */

export type SkillCategory = "damage" | "buff" | "debuff" | "heal";
export type ClassId = "mage" | "samurai" | "warrior" | "archer";

export interface EffectDef {
  /** Unique effect identifier (e.g., "arcane_vulnerability") */
  id: string;
  /** Who receives this effect */
  target: "self" | "enemy";
  /** Which stat is modified (damage, critChance, dodgeChance, armor, magicVulnerability, physicalVulnerability, critVulnerability, allVulnerability) */
  stat: string;
  /** Modifier value: 0.30 = +30%, or flat number for flat mods */
  value: number;
  /** How long the effect lasts (ms) */
  durationMs: number;
  /** Whether the animation loops continuously during effect */
  looping: boolean;
  /** Whether reapplying refreshes duration (true) or stacks (false) */
  refreshable: boolean;
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
  | "water_blast_full"
  // Ice
  | "ice_shard"
  | "ice_burst"
  | "ice_shatter"
  // Wood
  | "wood_projectile"
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

  // ── New fields ────────────────────────────────────
  /** Skill behavior category */
  skillType: SkillCategory;
  /** Which class this skill belongs to (null = generic/legacy) */
  classRestriction: ClassId | null;
  /** Cosmetic skin variant of the sprite (v0, v1_crimson, v3_azure, v7_shadow) */
  spriteVariant: string;
  /** Buff/debuff effect definition */
  effect?: EffectDef;
  /** Heal: fraction of maxHp restored (0.20 = 20%). Only for skillType=heal */
  healPercent?: number;
  /** Animation speed multiplier: 0.7 = slow/powerful, 1.0 = normal, 1.5 = fast */
  animSpeedMul: number;
}

/** Active skills that belong to a class tree (8 per class = 32 total) */
export const CLASS_ACTIVE_SKILLS: Record<ClassId, ActiveSkillId[]> = {
  mage:    ["heal", "firebolt", "fire_breath", "water_ball", "explosion", "water_blast_full", "explosion_2", "water_startup"],
  samurai: ["slash", "sword_throw", "slash_arc", "thunder_projectile", "thunder_ball", "thunder_splash", "thunder_strike", "effect_sparkle"],
  warrior: ["slash_cross", "slash_sweep", "wood_projectile", "earth_bump", "earth_wall", "wood_thorns", "earth_impact", "effect_embers"],
  archer:  ["lightning_bolt", "lightning_arc", "ice_shard", "ice_burst", "lightning_strike_2", "ice_shatter", "lightning_sparks", "lightning_ring"],
};

export const ACTIVE_SKILLS: Record<ActiveSkillId, ActiveSkillDef> = {

  /* ══════════════════════════════════════════════════════════
   *  MAGE SKILLS (8)
   * ══════════════════════════════════════════════════════════ */

  heal: {
    id: "heal",
    name: "Mending Light",
    cooldownMs: 5000,
    damageMultiplier: 0,
    elementalProfile: {},
    skillType: "heal",
    classRestriction: "mage",
    spriteVariant: "v7_shadow",
    healPercent: 0.20,
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/healing/heal/v7_shadow/heal_sprite.json",
  },
  firebolt: {
    id: "firebolt",
    name: "Firebolt",
    cooldownMs: 2500,
    damageMultiplier: 4,
    elementalProfile: { fire: 1.0 },
    skillType: "damage",
    classRestriction: "mage",
    spriteVariant: "v0",
    animSpeedMul: 1.3,
    spritePath: "skils_sprites/fire/firebolt/v0/firebolt_sprite.json",
  },
  fire_breath: {
    id: "fire_breath",
    name: "Fire Breath",
    cooldownMs: 4500,
    damageMultiplier: 8,
    elementalProfile: { fire: 1.0 },
    skillType: "damage",
    classRestriction: "mage",
    spriteVariant: "v0",
    animSpeedMul: 0.85,
    spritePath: "skils_sprites/fire/fire_breath/v0/fire_breath_sprite.json",
  },
  water_ball: {
    id: "water_ball",
    name: "Frost Orb",
    cooldownMs: 3000,
    damageMultiplier: 5,
    elementalProfile: { cold: 1.0 },
    skillType: "damage",
    classRestriction: "mage",
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/cold/water_ball/v0/water_ball_sprite.json",
  },
  explosion: {
    id: "explosion",
    name: "Firecracker",
    cooldownMs: 6000,
    damageMultiplier: 9,
    elementalProfile: { fire: 0.8, physical: 0.2 },
    skillType: "damage",
    classRestriction: "mage",
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/fire/explosion/v0/explosion_sprite.json",
  },
  water_blast_full: {
    id: "water_blast_full",
    name: "Glacial Cascade",
    cooldownMs: 5000,
    damageMultiplier: 9,
    elementalProfile: { cold: 0.85, physical: 0.15 },
    skillType: "damage",
    classRestriction: "mage",
    spriteVariant: "v0",
    animSpeedMul: 0.9,
    spritePath: "skils_sprites/cold/water_blast_full/v0/water_blast_full_sprite.json",
  },
  explosion_2: {
    id: "explosion_2",
    name: "Grand Explosion",
    cooldownMs: 15000,
    damageMultiplier: 28,
    elementalProfile: { fire: 0.8, physical: 0.2 },
    skillType: "damage",
    classRestriction: "mage",
    spriteVariant: "v0",
    animSpeedMul: 0.7,
    spritePath: "skils_sprites/fire/explosion_2/v0/explosion_2_sprite.json",
  },
  water_startup: {
    id: "water_startup",
    name: "Arcane Vulnerability",
    cooldownMs: 8000,
    damageMultiplier: 0,
    elementalProfile: {},
    skillType: "debuff",
    classRestriction: "mage",
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    effect: {
      id: "arcane_vulnerability",
      target: "enemy",
      stat: "magicVulnerability",
      value: 0.30,
      durationMs: 6000,
      looping: true,
      refreshable: true,
    },
    spritePath: "skils_sprites/cold/water_startup/v0/water_startup_sprite.json",
  },

  /* ══════════════════════════════════════════════════════════
   *  SAMURAI SKILLS (8)
   * ══════════════════════════════════════════════════════════ */

  slash: {
    id: "slash",
    name: "Quick Slash",
    cooldownMs: 1800,
    damageMultiplier: 2.5,
    elementalProfile: { physical: 1.0 },
    skillType: "damage",
    classRestriction: "samurai",
    spriteVariant: "v7_shadow",
    animSpeedMul: 1.4,
    spritePath: "skils_sprites/physical/slash/v7_shadow/slash_sprite.json",
  },
  sword_throw: {
    id: "sword_throw",
    name: "Sword Throw",
    cooldownMs: 2500,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    skillType: "damage",
    classRestriction: "samurai",
    spriteVariant: "v7_shadow",
    animSpeedMul: 1.2,
    iconPath: "skils_sprites/physical/sword_throw/v7_shadow/sword_throw_sprite.png",
    spritePath: "skils_sprites/physical/sword_throw/v7_shadow/sword_throw_sprite.json",
  },
  slash_arc: {
    id: "slash_arc",
    name: "Crescent Slash",
    cooldownMs: 3000,
    damageMultiplier: 5,
    elementalProfile: { physical: 0.9, lightning: 0.1 },
    skillType: "damage",
    classRestriction: "samurai",
    spriteVariant: "v1",
    animSpeedMul: 1.1,
    spritePath: "skils_sprites/physical/slash_arc/v1/slash_arc_sprite.json",
  },
  thunder_projectile: {
    id: "thunder_projectile",
    name: "Thunder Bolt",
    cooldownMs: 3000,
    damageMultiplier: 5,
    elementalProfile: { lightning: 1.0 },
    skillType: "damage",
    classRestriction: "samurai",
    spriteVariant: "v0",
    animSpeedMul: 1.2,
    spritePath: "skils_sprites/lightning/thunder_projectile/v0/thunder_projectile_sprite.json",
  },
  thunder_ball: {
    id: "thunder_ball",
    name: "Ball Lightning",
    cooldownMs: 3500,
    damageMultiplier: 6,
    elementalProfile: { lightning: 1.0 },
    skillType: "damage",
    classRestriction: "samurai",
    spriteVariant: "v3_azure",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/lightning/thunder_ball/v3_azure/thunder_ball_sprite.json",
  },
  thunder_splash: {
    id: "thunder_splash",
    name: "Storm Burst",
    cooldownMs: 4000,
    damageMultiplier: 7,
    elementalProfile: { lightning: 1.0 },
    skillType: "damage",
    classRestriction: "samurai",
    spriteVariant: "v3_azure",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/lightning/thunder_splash/v3_azure/thunder_splash_sprite.json",
  },
  thunder_strike: {
    id: "thunder_strike",
    name: "Tempest Strike",
    cooldownMs: 6000,
    damageMultiplier: 11,
    elementalProfile: { lightning: 0.85, physical: 0.15 },
    skillType: "damage",
    classRestriction: "samurai",
    spriteVariant: "v3_azure",
    animSpeedMul: 0.8,
    spritePath: "skils_sprites/lightning/thunder_strike/v3_azure/thunder_strike_sprite.json",
  },
  effect_sparkle: {
    id: "effect_sparkle",
    name: "Weakness Mark",
    cooldownMs: 10000,
    damageMultiplier: 0,
    elementalProfile: {},
    skillType: "debuff",
    classRestriction: "samurai",
    spriteVariant: "v3_azure",
    animSpeedMul: 1.0,
    effect: {
      id: "weakness_mark",
      target: "enemy",
      stat: "critVulnerability",
      value: 0.40,
      durationMs: 7000,
      looping: true,
      refreshable: true,
    },
    spritePath: "skils_sprites/effects/effect_sparkle/v3_azure/effect_sparkle_sprite.json",
  },

  /* ══════════════════════════════════════════════════════════
   *  WARRIOR SKILLS (8)
   * ══════════════════════════════════════════════════════════ */

  slash_cross: {
    id: "slash_cross",
    name: "Cross Slash",
    cooldownMs: 2500,
    damageMultiplier: 5,
    elementalProfile: { physical: 1.0 },
    skillType: "damage",
    classRestriction: "warrior",
    spriteVariant: "v2_emerald",
    animSpeedMul: 1.1,
    spritePath: "skils_sprites/physical/slash_cross/v2_emerald/slash_cross_sprite.json",
  },
  slash_sweep: {
    id: "slash_sweep",
    name: "Cleaving Sweep",
    cooldownMs: 3000,
    damageMultiplier: 6,
    elementalProfile: { physical: 1.0 },
    skillType: "damage",
    classRestriction: "warrior",
    spriteVariant: "v2_emerald",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/physical/slash_sweep/v2_emerald/slash_sweep_sprite.json",
  },
  wood_projectile: {
    id: "wood_projectile",
    name: "Thorn Javelin",
    cooldownMs: 2800,
    damageMultiplier: 5,
    elementalProfile: { physical: 0.8, fire: 0.2 },
    skillType: "damage",
    classRestriction: "warrior",
    spriteVariant: "v0",
    animSpeedMul: 1.2,
    spritePath: "skils_sprites/wood/wood_projectile/v0/wood_projectile_sprite.json",
  },
  earth_bump: {
    id: "earth_bump",
    name: "Earth Shatter",
    cooldownMs: 3500,
    damageMultiplier: 7,
    elementalProfile: { physical: 0.7, fire: 0.3 },
    skillType: "damage",
    classRestriction: "warrior",
    spriteVariant: "v1_crimson",
    animSpeedMul: 0.9,
    spritePath: "skils_sprites/earth/earth_bump/v1_crimson/earth_bump_sprite.json",
  },
  earth_wall: {
    id: "earth_wall",
    name: "Stone Shield",
    cooldownMs: 4000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    skillType: "damage",
    classRestriction: "warrior",
    spriteVariant: "v1_crimson",
    animSpeedMul: 0.8,
    spritePath: "skils_sprites/earth/earth_wall/v1_crimson/earth_wall_sprite.json",
  },
  wood_thorns: {
    id: "wood_thorns",
    name: "Briar Eruption",
    cooldownMs: 4000,
    damageMultiplier: 8,
    elementalProfile: { physical: 0.7, fire: 0.3 },
    skillType: "damage",
    classRestriction: "warrior",
    spriteVariant: "v0",
    animSpeedMul: 0.9,
    spritePath: "skils_sprites/wood/wood_thorns/v0/wood_thorns_sprite.json",
  },
  earth_impact: {
    id: "earth_impact",
    name: "Crushed",
    cooldownMs: 12000,
    damageMultiplier: 0,
    elementalProfile: {},
    skillType: "debuff",
    classRestriction: "warrior",
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    effect: {
      id: "crushed",
      target: "enemy",
      stat: "physicalVulnerability",
      value: 0.35,
      durationMs: 8000,
      looping: true,
      refreshable: true,
    },
    spritePath: "skils_sprites/earth/earth_impact/v0/earth_impact_sprite.json",
  },
  effect_embers: {
    id: "effect_embers",
    name: "Ember Armor",
    cooldownMs: 15000,
    damageMultiplier: 0,
    elementalProfile: {},
    skillType: "buff",
    classRestriction: "warrior",
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    effect: {
      id: "ember_armor",
      target: "self",
      stat: "armor",
      value: 50,
      durationMs: 5000,
      looping: true,
      refreshable: true,
    },
    spritePath: "skils_sprites/effects/effect_embers/v0/effect_embers_sprite.json",
  },

  /* ══════════════════════════════════════════════════════════
   *  ARCHER SKILLS (8)
   * ══════════════════════════════════════════════════════════ */

  lightning_bolt: {
    id: "lightning_bolt",
    name: "Spark Arrow",
    cooldownMs: 2000,
    damageMultiplier: 3,
    elementalProfile: { lightning: 0.8, physical: 0.2 },
    skillType: "damage",
    classRestriction: "archer",
    spriteVariant: "v0",
    animSpeedMul: 1.5,
    spritePath: "skils_sprites/lightning/lightning_bolt/v0/lightning_bolt_sprite.json",
  },
  lightning_arc: {
    id: "lightning_arc",
    name: "Arc Shot",
    cooldownMs: 3000,
    damageMultiplier: 5,
    elementalProfile: { lightning: 0.7, physical: 0.3 },
    skillType: "damage",
    classRestriction: "archer",
    spriteVariant: "v0",
    animSpeedMul: 1.1,
    spritePath: "skils_sprites/lightning/lightning_arc/v0/lightning_arc_sprite.json",
  },
  ice_shard: {
    id: "ice_shard",
    name: "Frost Shard",
    cooldownMs: 3000,
    damageMultiplier: 5,
    elementalProfile: { cold: 0.8, physical: 0.2 },
    skillType: "damage",
    classRestriction: "archer",
    spriteVariant: "v0",
    animSpeedMul: 1.1,
    spritePath: "skils_sprites/cold/ice_shard/v0/ice_shard_sprite.json",
  },
  ice_burst: {
    id: "ice_burst",
    name: "Ice Burst",
    cooldownMs: 3500,
    damageMultiplier: 6,
    elementalProfile: { cold: 1.0 },
    skillType: "damage",
    classRestriction: "archer",
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/cold/ice_burst/v0/ice_burst_sprite.json",
  },
  lightning_strike_2: {
    id: "lightning_strike_2",
    name: "Thunder Judgment",
    cooldownMs: 5000,
    damageMultiplier: 9,
    elementalProfile: { lightning: 0.9, physical: 0.1 },
    skillType: "damage",
    classRestriction: "archer",
    spriteVariant: "v0",
    animSpeedMul: 0.7,
    spritePath: "skils_sprites/lightning/lightning_strike_2/v0/lightning_strike_2_sprite.json",
  },
  ice_shatter: {
    id: "ice_shatter",
    name: "Ice Shatter",
    cooldownMs: 5000,
    damageMultiplier: 9,
    elementalProfile: { cold: 0.9, physical: 0.1 },
    skillType: "damage",
    classRestriction: "archer",
    spriteVariant: "v0",
    animSpeedMul: 0.8,
    spritePath: "skils_sprites/cold/ice_shatter/v0/ice_shatter_sprite.json",
  },
  lightning_sparks: {
    id: "lightning_sparks",
    name: "Static Charge",
    cooldownMs: 10000,
    damageMultiplier: 0,
    elementalProfile: {},
    skillType: "debuff",
    classRestriction: "archer",
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    effect: {
      id: "static_charge",
      target: "enemy",
      stat: "allVulnerability",
      value: 0.20,
      durationMs: 5000,
      looping: true,
      refreshable: true,
    },
    spritePath: "skils_sprites/lightning/lightning_sparks/v0/lightning_sparks_sprite.json",
  },
  lightning_ring: {
    id: "lightning_ring",
    name: "Storm Shield",
    cooldownMs: 20000,
    damageMultiplier: 0,
    elementalProfile: {},
    skillType: "buff",
    classRestriction: "archer",
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    effect: {
      id: "storm_shield",
      target: "self",
      stat: "dodgeChance",
      value: 0.15,
      durationMs: 10000,
      looping: true,
      refreshable: true,
    },
    spritePath: "skils_sprites/lightning/lightning_ring/v0/lightning_ring_sprite.json",
  },

  /* ══════════════════════════════════════════════════════════
   *  LEGACY / GENERIC SKILLS (not on class trees)
   * ══════════════════════════════════════════════════════════ */

  fireball: {
    id: "fireball",
    name: "Fireball",
    cooldownMs: 3000,
    damageMultiplier: 5,
    elementalProfile: { fire: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    iconPath: "skils_sprites/fire/fireball/fireball_sprite.png",
    spritePath: "skils_sprites/fire/fireball/fireball_sprite.json",
  },
  thrust_1: {
    id: "thrust_1",
    name: "Thrust",
    cooldownMs: 2000,
    damageMultiplier: 3,
    elementalProfile: { physical: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/physical/thrust_1/thrust_1_sprite.json",
  },
  thrust_2: {
    id: "thrust_2",
    name: "Thrust II",
    cooldownMs: 2000,
    damageMultiplier: 3.5,
    elementalProfile: { physical: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/physical/thrust_2/thrust_2_sprite.json",
  },
  effect_star: {
    id: "effect_star",
    name: "Star Burst",
    cooldownMs: 3000,
    damageMultiplier: 3,
    elementalProfile: { fire: 0.5, physical: 0.5 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/effects/effect_star/effect_star_sprite.json",
  },
  effect_sparks: {
    id: "effect_sparks",
    name: "Sparks",
    cooldownMs: 2000,
    damageMultiplier: 2,
    elementalProfile: { lightning: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/effects/effect_sparks/effect_sparks_sprite.json",
  },
  fire_hit: {
    id: "fire_hit",
    name: "Fire Hit",
    cooldownMs: 2500,
    damageMultiplier: 3,
    elementalProfile: { fire: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/fire/fire_hit/fire_hit_sprite.json",
  },
  earth_projectile: {
    id: "earth_projectile",
    name: "Earth Projectile",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { physical: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/earth/earth_projectile/earth_projectile_sprite.json",
  },
  earth_rocks: {
    id: "earth_rocks",
    name: "Earth Rocks",
    cooldownMs: 4000,
    damageMultiplier: 5,
    elementalProfile: { physical: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/earth/earth_rocks/earth_rocks_sprite.json",
  },
  thunder_hit: {
    id: "thunder_hit",
    name: "Thunder Hit",
    cooldownMs: 2500,
    damageMultiplier: 3,
    elementalProfile: { lightning: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/lightning/thunder_hit/thunder_hit_sprite.json",
  },
  lightning_wave: {
    id: "lightning_wave",
    name: "Lightning Wave",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { lightning: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/lightning/lightning_wave/lightning_wave_sprite.json",
  },
  water_spike: {
    id: "water_spike",
    name: "Water Spike",
    cooldownMs: 3500,
    damageMultiplier: 5,
    elementalProfile: { cold: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/cold/water_spike/water_spike_sprite.json",
  },
  water_splash: {
    id: "water_splash",
    name: "Water Splash",
    cooldownMs: 3000,
    damageMultiplier: 4,
    elementalProfile: { cold: 1.0 },
    skillType: "damage",
    classRestriction: null,
    spriteVariant: "v0",
    animSpeedMul: 1.0,
    spritePath: "skils_sprites/cold/water_splash/water_splash_sprite.json",
  },
};
