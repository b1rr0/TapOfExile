import { B } from "../data/balance.js";

export function xpToNextLevel(level) {
  return Math.floor(B.XP_BASE * Math.pow(B.XP_GROWTH, level - 1));
}

export function checkLevelUp(player) {
  let leveled = false;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.xpToNext = xpToNextLevel(player.level);
    leveled = true;
  }
  return leveled;
}
