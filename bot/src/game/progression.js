export function xpToNextLevel(level) {
  return Math.floor(100 * Math.pow(1.3, level - 1));
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
