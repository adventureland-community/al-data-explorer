import { ItemInfo, SetKey, SlotType, StatType } from "typed-adventureland";

import { CustomGData } from "./GDataContext";
import { objectEntries } from "./types/ObjectHelpers";

export { calculateItemStatsByLevel, getLevelString, getMaxLevel } from "./gameData/itemProperties";
export { calculateClassStatByLevel } from "./gameData/classLevelStats";

export function addItemSetStats(
  G: CustomGData,
  stats: { [T in StatType]?: number },
  gear: { [slot in SlotType]?: ItemInfo },
) {
  const equippedSetCount: Partial<Record<SetKey, number>> = {};

  for (const [, itemInfo] of objectEntries(gear)) {
    if (itemInfo) {
      const itemName = itemInfo.name;
      const gItem = G.items[itemName];
      if (gItem.set) {
        equippedSetCount[gItem.set] = (equippedSetCount[gItem.set] ?? 0) + 1;
      }
    }
  }

  for (const [setKey, equippedCount] of objectEntries(equippedSetCount)) {
    const gSet = G.sets[setKey];

    if (typeof equippedCount !== "number") {
      continue;
    }

    for (let index = 1; index <= 16; index++) {
      if (equippedCount >= index) {
        const setStats = gSet[index]!;

        for (const [stat, value] of objectEntries(setStats)) {
          stats[stat] = (stats[stat] ?? 0) + (value ?? 0);
        }
      }
    }
  }
}

export function calculatePlayerFrequency(player: {
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

export function calculatePlayerResistance(player: { resistance: number; int: number }) {
  return player.resistance + Math.min(player.int, 180) + Math.max(0, player.int - 180) * 0.25;
}
export function calculatePlayerArmor(player: { armor: number; str: number }) {
  return player.armor + Math.min(player.str, 160) + Math.max(0, player.str - 160) * 0.25;
}
export function calculatePlayerMaxHealthPoint(player: {
  max_hp: number;
  str: number;
  vit: number;
  level: number;
}) {
  return Math.max(1, player.max_hp + player.str * 21 + player.vit * (48 + player.level / 3.0));
}

export function calculatePlayerMaxManaPoint(player: {
  max_mp: number;
  level: number;
  int: number;
}) {
  return player.max_mp + player.int * 15 + player.level * 5;
}

export function calculatePlayerSpeed(player: { dex: number; str: number; level: number }) {
  return (
    Math.min(player.dex, 256) / 32.0 +
    Math.min(player.str, 256) / 64.0 +
    Math.min(player.level, 40) / 10.0 +
    Math.max(0, Math.min(player.level - 40, 20)) / 15.0 +
    Math.max(0, Math.min(86, player.level - 60)) / 16.0
  );
}

export function modifyPlayerStatsByAttributes(
  level: number,
  player: {
    [T in StatType]?: number;
  },
) {
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
