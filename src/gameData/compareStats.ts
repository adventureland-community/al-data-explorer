import { GItem } from "typed-adventureland";

import { calculateItemStatsByLevel, getMaxLevel } from "../Utils";

export const EQUIPPABLE_SKIP_TYPES = new Set([
  "material",
  "dungeon_key",
  "quest",
  "box",
  "chrysalis",
  "cosmetics",
]);

export const COMPARE_STAT_KEYS = [
  "attack",
  "hp",
  "mp",
  "armor",
  "dex",
  "int",
  "str",
  "vit",
  "for",
  "speed",
  "range",
  "resistance",
  "apiercing",
  "rpiercing",
  "crit",
  "explosion",
  "blast",
  "luck",
  "gold",
  "mp_cost",
  "mp_reduction",
  "courage",
  "mcourage",
  "pcourage",
  "aura",
  "attr0",
  "stat",
] as const;

export type CompareStatKey = typeof COMPARE_STAT_KEYS[number];

/** Promote on-hit / ability-like stats when present (attr0, splash). */
export const MATRIX_STAT_PRIORITY: readonly CompareStatKey[] = [
  "attr0",
  "explosion",
  "blast",
  "crit",
  "attack",
  "hp",
  "armor",
  "resistance",
  "dex",
  "int",
  "str",
  "vit",
  "for",
  "speed",
  "range",
  "apiercing",
  "rpiercing",
  "luck",
  "gold",
  "mp_cost",
  "mp_reduction",
  "courage",
  "mcourage",
  "pcourage",
  "aura",
  "stat",
  "mp",
];

export const MATRIX_MAX_LEVEL = 13;

export type LevelStats = Partial<Record<CompareStatKey, number>> & {
  frequency?: number;
  damage_type?: string;
  critdamage?: number;
};

export function isEquippable(gItem: GItem | undefined): boolean {
  if (!gItem?.type) return false;
  return !EQUIPPABLE_SKIP_TYPES.has(gItem.type);
}

export function isValidLevel(gItem: GItem, level: number): boolean {
  const maxLevel = getMaxLevel(gItem);
  if (maxLevel == null) return level === 0;
  return level >= 0 && level <= maxLevel;
}

export function buildLevelStats(gItem: GItem, level: number): LevelStats {
  if (!isValidLevel(gItem, level)) return {};
  return calculateItemStatsByLevel(gItem, level) as LevelStats;
}

export function buildAllLevelStats(gItem: GItem): LevelStats[] {
  const stats: LevelStats[] = [];
  for (let level = 0; level <= MATRIX_MAX_LEVEL; level += 1) {
    stats.push(buildLevelStats(gItem, level));
  }
  return stats;
}

/** Delta of `b` relative to `a` (b − a). */
export function statDelta(a: number | undefined, b: number | undefined): number | null {
  if (a == null && b == null) return null;
  return (b ?? 0) - (a ?? 0);
}
