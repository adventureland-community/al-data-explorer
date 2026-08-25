import { GItem, StatType } from "typed-adventureland";

import { objectEntries } from "../types/ObjectHelpers";

const STAT_TYPE_MULTIPLIER: { [T in StatType]?: number } = {
  gold: 0.5,
  luck: 1,
  xp: 0.5,
  int: 1,
  str: 1,
  dex: 1,
  vit: 1,
  for: 1,
  armor: 2.25,
  resistance: 2.25,
  speed: 0.325,
  evasion: 0.325,
  reflection: 0.15,
  lifesteal: 0.15,
  manasteal: 0.04,
  rpiercing: 2.25,
  apiercing: 2.25,
  crit: 0.125,
  dreturn: 0.5,
  frequency: 0.325,
  mp_cost: -0.6,
  output: 0.175,
};

const DO_NOT_ROUND = new Set([
  "evasion",
  "miss",
  "reflection",
  "dreturn",
  "lifesteal",
  "manasteal",
  "attr0",
  "attr1",
  "crit",
  "critdamage",
  "set",
  "class",
  "breaks",
]);

export type ItemPropertyArgs = {
  level?: number;
  statType?: StatType;
  /** Class name for item extras (e.g. tigerhelmet.rogue). */
  class?: string;
  map?: string;
};

export function getMaxLevel(gItem: { upgrade?: unknown; compound?: unknown }): number | undefined {
  if (gItem.upgrade) return 13;
  if (gItem.compound) return 7;
  return undefined;
}

export function getLevelString(gItem: GItem, level?: number): string {
  if (gItem.upgrade) {
    const maxLevel = getMaxLevel(gItem);
    const clamped = maxLevel != null ? Math.min(level ?? 0, maxLevel) : level;
    switch (clamped) {
      case 12:
        return "Z";
      case 11:
        return "Y";
      case 10:
        return "X";
      default:
        return String(clamped ?? 0);
    }
  }

  if (gItem.compound) {
    let compoundLevel = level;
    if (compoundLevel && compoundLevel > 7) compoundLevel = 7;
    switch (compoundLevel) {
      case 7:
        return "R";
      case 6:
        return "S";
      case 5:
        return "V";
      default:
        return String(compoundLevel ?? 0);
    }
  }

  return String(level ?? 0);
}

/**
 * Merge class/map extras onto an item def before upgrade loops.
 * Grounded in adventureland_mongodb main js/old_common_functions.js adopt_extras.
 * Nested upgrade/compound keys are taken from ex[p] (intended merge; game loop uses ex).
 */
export function adoptExtras(
  def: Record<string, unknown>,
  extras: Record<string, unknown> | undefined,
): void {
  if (!extras) return;
  for (const [key, value] of Object.entries(extras)) {
    if (key === "upgrade" || key === "compound") {
      const target = (def[key] as Record<string, number> | undefined) ?? {};
      def[key] = target;
      const nested = value as Record<string, number> | undefined;
      if (!nested || typeof nested !== "object") continue;
      for (const [nestedKey, nestedValue] of Object.entries(nested)) {
        if (typeof nestedValue !== "number") continue;
        target[nestedKey] = (target[nestedKey] ?? 0) + nestedValue;
      }
    } else if (typeof value === "number") {
      def[key] = ((def[key] as number | undefined) ?? 0) + value;
    }
  }
}

function cloneItemDef(def: GItem): GItem & Record<string, unknown> {
  return {
    ...def,
    upgrade: def.upgrade ? { ...def.upgrade } : def.upgrade,
    compound: def.compound ? { ...def.compound } : def.compound,
  } as GItem & Record<string, unknown>;
}

/**
 * Item stats at a given level, optionally with class/map extras.
 * Grounded in adventureland_mongodb main js/old_common_functions.js calculate_item_properties.
 */
export function calculateItemStatsByLevel(
  def: GItem,
  itemLevel?: number,
  statType?: StatType,
  args?: Omit<ItemPropertyArgs, "level" | "statType">,
): { [T in StatType]?: number } {
  let working: GItem & Record<string, unknown> = def as GItem & Record<string, unknown>;
  const className = args?.class;
  const mapName = args?.map;
  const classExtras =
    className && working[className] && typeof working[className] === "object"
      ? (working[className] as Record<string, unknown>)
      : undefined;
  const mapExtras =
    mapName && working[mapName] && typeof working[mapName] === "object"
      ? (working[mapName] as Record<string, unknown>)
      : undefined;

  if (classExtras || mapExtras) {
    working = cloneItemDef(def);
    if (classExtras) adoptExtras(working, classExtras);
    if (mapExtras) adoptExtras(working, mapExtras);
  }

  const stats: { [T in StatType]?: number } = {};
  Object.entries(working).forEach(([key, value]) => {
    if (typeof value === "number") {
      stats[key as StatType] = value;
    }
  });

  if (working.upgrade || working.compound) {
    const uDef = (working.upgrade ?? working.compound ?? {}) as { [T in StatType]?: number };
    for (let level = 1; level <= (itemLevel ?? 0); level += 1) {
      let multiplier = 1;
      if (working.upgrade) {
        if (level === 7) multiplier = 1.25;
        if (level === 8) multiplier = 1.5;
        if (level === 9) multiplier = 2;
        if (level === 10) multiplier = 3;
        if (level === 11) multiplier = 1.25;
        if (level === 12) multiplier = 1.25;
      } else if (working.compound) {
        if (level === 5) multiplier = 1.25;
        if (level === 6) multiplier = 1.5;
        if (level === 7) multiplier = 2;
        if (level >= 8) multiplier = 3;
      }

      for (const [p, value] of objectEntries(uDef)) {
        const val = value ?? 0;
        if (p === "stat") {
          stats[p] = (stats[p] ?? 0) + Math.round(val * multiplier);
          if (level >= 7) {
            stats[p] = (stats[p] ?? 0) + 1;
          }
        } else {
          stats[p] = (stats[p] ?? 0) + val * multiplier;
        }
      }
    }
  }

  if (itemLevel === 10 && working.tier && working.tier >= 3) {
    stats.stat = (stats.stat ?? 0) + 2;
  }

  for (const [p, value] of objectEntries(stats)) {
    if (!DO_NOT_ROUND.has(p)) {
      stats[p] = value != null ? Math.round(value) : 0;
    }
  }

  const resolvedStatType = statType;
  if (working.stat && resolvedStatType) {
    const multiplier = STAT_TYPE_MULTIPLIER[resolvedStatType] ?? 0;
    stats[resolvedStatType] = (stats[resolvedStatType] ?? 0) + (stats.stat ?? 0) * multiplier;
  }

  return stats;
}
