import { GItem, ItemInfo, SetKey, SlotType, StatType } from "typed-adventureland";

import { SavedLoadout } from "../GearPlanner/types";
import { CustomGData } from "../GDataContext";
import { objectEntries } from "../types/ObjectHelpers";
import { calculateClassStatByLevel } from "./classLevelStats";
import { resolveItemInstanceStats } from "./itemProperties";

export type LoadoutClassDef = {
  className: string;
  stats: Partial<Record<string, number>>;
  lstats: Partial<Record<string, number>>;
  main_stat?: string;
  mainhand?: Record<string, Partial<Record<string, number>>>;
  offhand?: Record<string, Partial<Record<string, number>>>;
  doublehand?: Record<string, Partial<Record<string, number>>>;
};

export type EquippedPieceStats = {
  slot: SlotType;
  itemInfo: ItemInfo;
  stats: { [T in StatType]?: number };
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

/** One gear walk shared by loadout aggregation and luck projection. */
export function mapEquippedPieceStats(args: {
  gear: { [slot in SlotType]?: ItemInfo };
  G: CustomGData;
  classKey?: string;
}): EquippedPieceStats[] {
  const { gear, G, classKey } = args;
  const out: EquippedPieceStats[] = [];
  for (const [slot, itemInfo] of objectEntries(gear)) {
    if (!itemInfo) continue;
    const gItem = G.items[itemInfo.name];
    if (!gItem) continue;
    out.push({
      slot,
      itemInfo,
      stats: resolveItemInstanceStats({
        def: gItem,
        itemInfo,
        G,
        classKey,
      }),
    });
  }
  return out;
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

/** Set bonuses from equipped pieces — belongs behind the loadout seam. */
export function addItemSetStats(
  G: CustomGData,
  stats: { [T in StatType]?: number },
  gear: { [slot in SlotType]?: ItemInfo },
): void {
  const equippedSetCount: Partial<Record<SetKey, number>> = {};

  for (const [, itemInfo] of objectEntries(gear)) {
    if (!itemInfo) continue;
    const gItem = G.items[itemInfo.name];
    if (gItem?.set) {
      equippedSetCount[gItem.set] = (equippedSetCount[gItem.set] ?? 0) + 1;
    }
  }

  for (const [setKey, equippedCount] of objectEntries(equippedSetCount)) {
    const gSet = G.sets[setKey];
    if (typeof equippedCount !== "number") continue;

    for (let index = 1; index <= 16; index += 1) {
      if (equippedCount < index) continue;
      const setStats = gSet[index];
      if (!setStats) continue;
      for (const [stat, value] of objectEntries(setStats)) {
        stats[stat] = (stats[stat] ?? 0) + (value ?? 0);
      }
    }
  }
}

function calculatePlayerFrequency(player: {
  frequency: number;
  level: number;
  dex: number;
  int: number;
}) {
  return (
    player.frequency +
    Math.min(player.level, 80) / 164.0 +
    Math.min(160, player.dex) / 640.0 +
    Math.max(player.dex - 160) / 925.0 +
    player.int / 1575.0
  );
}

function calculatePlayerResistance(player: { resistance: number; int: number }) {
  return player.resistance + Math.min(player.int, 180) + Math.max(0, player.int - 180) * 0.25;
}

function calculatePlayerArmor(player: { armor: number; str: number }) {
  return player.armor + Math.min(player.str, 160) + Math.max(0, player.str - 160) * 0.25;
}

function calculatePlayerMaxHealthPoint(player: {
  max_hp: number;
  str: number;
  vit: number;
  level: number;
}) {
  return Math.max(1, player.max_hp + player.str * 21 + player.vit * (48 + player.level / 3.0));
}

function calculatePlayerMaxManaPoint(player: { max_mp: number; level: number; int: number }) {
  return player.max_mp + player.int * 15 + player.level * 5;
}

function calculatePlayerSpeed(player: { dex: number; str: number; level: number }) {
  return (
    Math.min(player.dex, 256) / 32.0 +
    Math.min(player.str, 256) / 64.0 +
    Math.min(player.level, 40) / 10.0 +
    Math.max(0, Math.min(player.level - 40, 20)) / 15.0 +
    Math.max(0, Math.min(86, player.level - 60)) / 16.0
  );
}

/** Attribute-derived player stats — belongs behind the loadout seam. */
export function modifyPlayerStatsByAttributes(
  level: number,
  player: { [T in StatType]?: number },
): void {
  player.hp = calculatePlayerMaxHealthPoint({
    max_hp: player.hp ?? 0,
    str: player.str ?? 0,
    vit: player.vit ?? 0,
    level,
  });

  player.mp = calculatePlayerMaxManaPoint({
    level,
    max_mp: player.mp ?? 0,
    int: player.int ?? 0,
  });

  player.frequency = calculatePlayerFrequency({
    level,
    frequency: player.frequency ?? 0,
    dex: player.dex ?? 0,
    int: player.int ?? 0,
  });

  player.armor = calculatePlayerArmor({
    armor: player.armor ?? 0,
    str: player.str ?? 0,
  });

  player.resistance = calculatePlayerResistance({
    resistance: player.resistance ?? 0,
    int: player.int ?? 0,
  });

  player.speed =
    (player.speed ?? 0) +
    calculatePlayerSpeed({
      dex: player.dex ?? 0,
      str: player.str ?? 0,
      level,
    });
}

/**
 * Aggregate class base + gear + set bonuses + mainhand slot table mods.
 * Class is optional so unequipped / gear-only planning still shows title & scroll stats.
 */
export function computeLoadoutStats(args: {
  characterClass?: LoadoutClassDef;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  G: CustomGData;
}): { [T in StatType]?: number } {
  const { characterClass, level, gear, G } = args;
  const stats: { [T in StatType]?: number } = {};

  if (characterClass) {
    for (const stat of MAIN_STAT_TYPES) {
      const base = characterClass.stats[stat] ?? 0;
      const lstat = characterClass.lstats[stat] ?? 0;
      stats[stat] = calculateClassStatByLevel(base, lstat, level);
    }

    for (const [stat, value] of Object.entries(characterClass.stats)) {
      if (MAIN_STAT_TYPES.includes(stat as StatType)) continue;
      if (typeof value === "number") {
        stats[stat as StatType] = value;
      }
    }
  }

  for (const piece of mapEquippedPieceStats({
    gear,
    G,
    classKey: characterClass?.className,
  })) {
    for (const [stat, value] of objectEntries(piece.stats)) {
      if (stat === "stat") continue;
      stats[stat] = (stats[stat] ?? 0) + (value ?? 0);
    }
  }

  addItemSetStats(G, stats, gear);

  if (characterClass) {
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
  }

  modifyPlayerStatsByAttributes(level, stats);
  return stats;
}

/** Shallow clone of equipped gear for loadout state updates. */
export function cloneLoadoutGear(gear: SavedLoadout["gear"]): SavedLoadout["gear"] {
  const next: SavedLoadout["gear"] = {};
  for (const [slot, item] of Object.entries(gear) as [SlotType, ItemInfo][]) {
    if (item) next[slot] = { ...item };
  }
  return next;
}
