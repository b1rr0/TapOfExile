import { B } from "../data/balance.js";
import type { PlayerProxy } from "../types.js";

export function xpToNextLevel(level: number): number {
  return Math.floor(B.XP_BASE * Math.pow(B.XP_GROWTH, level - 1));
}

export function checkLevelUp(player: PlayerProxy): boolean {
  let leveled = false;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.xpToNext = xpToNextLevel(player.level);
    leveled = true;
  }
  return leveled;
}
