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

export type ActiveSkillId = "fireball" | "sword_throw";

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
};
