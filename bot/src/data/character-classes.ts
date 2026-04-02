/**
 * Character Classes - driven by shared/class-stats.ts (single source of truth).
 *
 * Re-exports CLASS_DEFS as CharacterClassDef-compatible records + helpers.
 */

import { CLASS_DEFS } from "@shared/class-stats";
import type { CharacterClassDef } from "../types.js";

/** Build FE-compatible CharacterClassDef from shared CLASS_DEFS. */
export const CHARACTER_CLASSES: Record<string, CharacterClassDef> = Object.fromEntries(
  Object.values(CLASS_DEFS).map(d => [
    d.id,
    {
      id: d.id,
      name: d.name,
      skinId: d.skinId,
      description: d.description,
      icon: d.icon,
    },
  ]),
);

export function getCharacterClass(classId: string): CharacterClassDef | undefined {
  return CHARACTER_CLASSES[classId];
}

export function listCharacterClasses(): CharacterClassDef[] {
  return Object.values(CHARACTER_CLASSES);
}
