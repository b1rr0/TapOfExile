/**
 * Asterism - re-exported from shared module.
 * Single source of truth: @shared/skill-tree
 */
export {
  SkillNode,
  SkillTreeBuilder,
  buildSkillTree,
  getClassStartNode,
  hexPath,
  diamondPath,
  getNodeShape,
  EMBLEM_RADIUS,
  NODE_RADIUS,
  MAX_CLASS_SKILLS,
  getMaxClassSkills,
  CLASS_IDS,
  CLASS_IMG,
} from "@shared/skill-tree";
export type { Emblem, SkillTreeResult } from "@shared/skill-tree";
