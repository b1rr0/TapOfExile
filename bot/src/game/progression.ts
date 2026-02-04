import { B } from "../data/balance.js";

/**
 * Calculate XP needed for next level (display only).
 * Server handles actual level-up logic.
 */
export function xpToNextLevel(level: number): number {
  return Math.floor(B.XP_BASE * Math.pow(B.XP_GROWTH, level - 1));
}
