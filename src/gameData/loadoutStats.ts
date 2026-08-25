import { GItem, ItemInfo, SlotType, StatType } from "typed-adventureland";

import { CustomGData } from "../GDataContext";
import { calculateClassStatByLevel } from "./classLevelStats";
import { calculateItemStatsByLevel } from "./itemProperties";
import { addItemSetStats, modifyPlayerStatsByAttributes } from "../Utils";
import { objectEntries } from "../types/ObjectHelpers";

export type LoadoutClassDef = {
  className: string;
  stats: Partial<Record<string, number>>;
  lstats: Partial<Record<string, number>>;
  main_stat?: string;
  mainhand?: Record<string, Partial<Record<string, number>>>;
  offhand?: Record<string, Partial<Record<string, number>>>;
  doublehand?: Record<string, Partial<Record<string, number>>>;
};

const MAIN_STAT_TYPES: StatType[] = ["str", "int", "dex", "vit", "for"];

/**
 * True when mainhand wtype is listed under class.doublehand.
 * Grounded in adventureland_mongodb main node/server.js can_equip_item / calculate_player_stats.
 */
export function isDoublehandWeapon(
  characterClass: LoadoutClassDef | undefined,
  gItem: GItem | undefined,
): boolean {
  if (!characterClass?.doublehand || !gItem?.wtype) return false;
  return Boolean(characterClass.doublehand[gItem.wtype]);
}

export function loadoutHasDoublehandConflict(
  characterClass: LoadoutClassDef | undefined,
  gear: { [slot in SlotType]?: ItemInfo },
  items: CustomGData["items"],
): boolean {
  const main = gear.mainhand;
  const off = gear.offhand;
  if (!main || !off) return false;
  return isDoublehandWeapon(characterClass, items[main.name]);
}

/** Clear offhand when equipping a doublehand mainhand (state invariant). */
export function withDoublehandEquipInvariant(
  characterClass: LoadoutClassDef | undefined,
  gear: { [slot in SlotType]?: ItemInfo },
  slot: SlotType,
  itemInfo: ItemInfo | undefined,
  items: CustomGData["items"],
): { [slot in SlotType]?: ItemInfo } {
  const next = { ...gear };
  if (itemInfo == null) {
    delete next[slot];
    return next;
  }
  next[slot] = itemInfo;
  if (slot === "mainhand" && isDoublehandWeapon(characterClass, items[itemInfo.name])) {
    delete next.offhand;
  }
  if (slot === "offhand") {
    const main = next.mainhand;
    if (main && isDoublehandWeapon(characterClass, items[main.name])) {
      delete next.mainhand;
    }
  }
  return next;
}

function applySlotMods(
  stats: { [T in StatType]?: number },
  mods: Partial<Record<string, number>> | undefined,
): void {
  if (!mods) return;
  for (const [stat, value] of Object.entries(mods)) {
    if (typeof value !== "number") continue;
    if (stat === "frequency") {
      // server apply_stats: player.frequency += prop.frequency / 100
      stats.frequency = (stats.frequency ?? 0) + value / 100;
    } else {
      stats[stat as StatType] = (stats[stat as StatType] ?? 0) + value;
    }
  }
}

/**
 * Aggregate class base + gear + set bonuses + mainhand slot table mods.
 * Doublehand/mainhand mods are player slot mods, not item def extras.
 */
export function computeLoadoutStats(args: {
  characterClass: LoadoutClassDef;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  G: CustomGData;
}): { [T in StatType]?: number } {
  const { characterClass, level, gear, G } = args;
  const stats: { [T in StatType]?: number } = {};

  for (const stat of MAIN_STAT_TYPES) {
    const base = characterClass.stats[stat] ?? 0;
    const lstat = characterClass.lstats[stat] ?? 0;
    stats[stat] = calculateClassStatByLevel(base, lstat, level);
  }

  // Base hp/mp from class if present on def (many callers also set these separately)
  for (const [stat, value] of Object.entries(characterClass.stats)) {
    if (MAIN_STAT_TYPES.includes(stat as StatType)) continue;
    if (typeof value === "number") {
      stats[stat as StatType] = value;
    }
  }

  for (const [, itemInfo] of objectEntries(gear)) {
    if (!itemInfo) continue;
    const gItem = G.items[itemInfo.name];
    if (!gItem) continue;
    const itemStats = calculateItemStatsByLevel(gItem, itemInfo.level, itemInfo.stat_type, {
      class: characterClass.className,
    });
    for (const [stat, value] of objectEntries(itemStats)) {
      stats[stat] = (stats[stat] ?? 0) + (value ?? 0);
    }
  }

  addItemSetStats(G, stats, gear);

  const main = gear.mainhand;
  if (main) {
    const gItem = G.items[main.name];
    const wtype = gItem?.wtype;
    if (wtype) {
      const slotMods =
        characterClass.doublehand?.[wtype] ?? characterClass.mainhand?.[wtype] ?? undefined;
      applySlotMods(stats, slotMods);
    }
  }

  modifyPlayerStatsByAttributes(level, stats);
  return stats;
}
