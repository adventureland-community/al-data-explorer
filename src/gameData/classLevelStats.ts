/**
 * Class main-stat scaling by level.
 * Grounded in adventureland_mongodb main node/server.js calculate_player_stats:
 * floor(stats + lstats * (level + max(0,l-40) + max(0,l-55) + max(0,l-65) - max(0,l-80)))
 */
export function calculateClassStatByLevel(base: number, lstat: number, level: number): number {
  const scaled =
    base +
    lstat *
      (level +
        Math.max(0, level - 40) +
        Math.max(0, level - 55) +
        Math.max(0, level - 65) -
        Math.max(0, level - 80));
  return Math.floor(scaled);
}
