/**
 * Skill Tree — re-exported from shared module.
 * Single source of truth: @shared/skill-tree
 *
 * FE-only: CLASS_IMG for emblem background images stays here.
 */
export {
  SkillNode,
  SkillTreeBuilder,
  buildSkillTree,
  getClassStartNode,
  EMBLEM_RADIUS,
  MAX_CLASS_SKILLS,
  CLASS_IDS,
} from "@shared/skill-tree";
export type { Emblem, SkillTreeResult } from "@shared/skill-tree";

// FE-only: class emblem background images for the canvas
export const CLASS_IMG: Record<string, string> = {
  samurai: "skiiltree/samurai.png",
  warrior: "skiiltree/warrior.png",
  mage:    "skiiltree/mage.png",
  archer:  "skiiltree/archer.png",
};
