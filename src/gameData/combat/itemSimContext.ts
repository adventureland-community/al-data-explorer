import { GItem, ItemInfo, ItemKey, SlotType } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import { getItemClassList } from "../itemMeta";
import { isDoublehandWeapon, LoadoutClassDef, withDoublehandEquipInvariant } from "../loadoutStats";
import { estimateTotalDps } from "./estimateTotalDps";
import {
  matrixItemAtLevel,
  monsterToCombatEntity,
  ResolvedCombatStats,
  resolveCombatStatsWithSwap,
} from "./resolveCombatStats";
import type { DpsBreakdown } from "./types";

export type ItemSimEquipNote = {
  kind: "info" | "warning" | "error";
  text: string;
};

export function canClassEquipItem(gItem: GItem, className: string): boolean {
  const allowed = getItemClassList(gItem);
  if (allowed.length === 0) return true;
  return allowed.includes(className);
}

/** Human-readable equip / sim scope notes for an item in combat context. */
export function getItemSimEquipNotes(args: {
  gItem: GItem;
  characterClass: LoadoutClassDef;
  className: string;
  slot?: SlotType;
  matrixMode?: boolean;
}): ItemSimEquipNote[] {
  const { gItem, characterClass, className, slot = "mainhand", matrixMode } = args;
  const notes: ItemSimEquipNote[] = [];

  const allowed = getItemClassList(gItem);
  if (allowed.length > 0) {
    if (!allowed.includes(className)) {
      notes.push({
        kind: "error",
        text: `${allowed.join(", ")} only — stats not applied for ${className}.`,
      });
    } else {
      notes.push({
        kind: "info",
        text: `Class-restricted: ${allowed.join(", ")}.`,
      });
    }
  }

  if (slot === "mainhand" && isDoublehandWeapon(characterClass, gItem)) {
    notes.push({
      kind: "info",
      text: `Two-handed (${
        gItem.wtype ?? "weapon"
      }): uses doublehand slot bonuses; offhand cleared.`,
    });
  }

  if (gItem.wtype && characterClass.mainhand?.[gItem.wtype]) {
    notes.push({
      kind: "info",
      text: `Mainhand ${gItem.wtype} bonuses apply for ${className}.`,
    });
  }

  if (matrixMode) {
    notes.push({
      kind: "warning",
      text: "Matrix sim swaps mainhand only — no offhand, rings, or dual-wield loadout.",
    });
  }

  return notes;
}

export type MatrixItemSimResult = {
  breakdown: DpsBreakdown;
  combatStats: ResolvedCombatStats;
  gear: { [slot in SlotType]?: ItemInfo };
  equipNotes: ItemSimEquipNote[];
  equippable: boolean;
};

/** Full matrix cell simulation: stats + DPS + equip notes. */
export function computeMatrixItemSim(args: {
  itemKey: ItemKey;
  upgradeLevel: number;
  characterClass: LoadoutClassDef;
  playerLevel: number;
  targetMonsterKey: string;
  G: CustomGData;
}): MatrixItemSimResult | null {
  const { itemKey, upgradeLevel, characterClass, playerLevel, G } = args;
  const gItem = G.items[itemKey];
  if (!gItem) return null;

  const { className } = characterClass;
  const itemInfo = matrixItemAtLevel(itemKey, upgradeLevel);
  const equippable = canClassEquipItem(gItem, className);

  const gear = withDoublehandEquipInvariant(characterClass, {}, "mainhand", itemInfo, G.items);

  const combatStats = resolveCombatStatsWithSwap({
    characterClass,
    level: playerLevel,
    gear: {},
    G,
    slot: "mainhand",
    itemInfo,
  });

  const targetEntity = monsterToCombatEntity(G.monsters[args.targetMonsterKey as never]);
  const breakdown = estimateTotalDps(combatStats, targetEntity, G, gear, {
    classKey: className,
  });

  const equipNotes = getItemSimEquipNotes({
    gItem,
    characterClass,
    className,
    matrixMode: true,
  });

  return { breakdown, combatStats, gear, equipNotes, equippable };
}
