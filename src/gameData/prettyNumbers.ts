/**
 * Mirrors adventureland `old_common_functions.js` `to_pretty_float`:
 * truncate to 2 decimal places (not round), then locale-format.
 */
export function toPrettyFloat(num: number): string {
  return (0 + Math.trunc((num || 0) * 100) / 100).toLocaleString("en-US");
}

/** Combat rates stored as percent points (0.325 → "0.32%"), matching character sheet / tooltips. */
export const RATE_PERCENT_STATS = new Set([
  "evasion",
  "avoidance",
  "reflection",
  "lifesteal",
  "manasteal",
  "crit",
  "critdamage",
  "dreturn",
  "miss",
  "breaks",
]);

/**
 * Item `luck` / `gold` / `xp` are x-points; character sheet shows multiplier as
 * `round(luckm * 100)%` where luckm = 1 + xluck/100 → display `100 + xluck`.
 */
export const MULTIPLIER_PERCENT_STATS = new Set(["luck", "gold", "xp"]);

/** Format a loadout/character panel value like the game client character sheet. */
export function formatCharacterStatValue(stat: string, value: number): string {
  if (stat === "frequency") {
    // Attack Speed: round(frequency * 100)
    return String(Math.round(value * 100));
  }
  if (RATE_PERCENT_STATS.has(stat)) {
    const shown = stat === "critdamage" ? 200 + value : value;
    const prefix = stat === "critdamage" ? "+" : "";
    return `${prefix}${toPrettyFloat(shown)}%`;
  }
  if (MULTIPLIER_PERCENT_STATS.has(stat)) {
    return `${Math.round(100 + value)}%`;
  }
  return String(Math.round(value));
}

/** Format a stat on an item instance tooltip (signed x-points for luck/gold/xp). */
export function formatItemStatValue(stat: string, value: number): string {
  if (RATE_PERCENT_STATS.has(stat)) {
    if (stat === "critdamage") return `+${toPrettyFloat(value)}%`;
    if (stat === "miss") return `${value}%`;
    return `${toPrettyFloat(value)}%`;
  }
  if (MULTIPLIER_PERCENT_STATS.has(stat)) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value}%`;
  }
  if (stat === "frequency") {
    return String(value);
  }
  return String(Math.round(value));
}
