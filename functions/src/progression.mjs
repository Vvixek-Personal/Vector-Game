export function xpForLevel(level) {
  const n = Math.max(0, Math.min(100, Math.floor(Number(level) || 0)));
  return Math.round(500 * Math.pow(n, 1.55));
}
export function xpForStats(stats) {
  return Math.max(0, Math.floor((stats.totalScore || 0) + (stats.runs || 0) * 50 + (stats.bestStreak || 0) * 10 + (stats.bonusXp || 0)));
}
export function levelFor(stats) {
  const xp = xpForStats(stats); let level = 0;
  while (level < 100 && xp >= xpForLevel(level + 1)) level++;
  return level;
}
