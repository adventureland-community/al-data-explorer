import { GItem, ItemInfo, ItemKey, SlotType } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import { getItemClassList } from "../itemMeta";
import {
  cloneLoadoutGear,
  isDoublehandWeapon,
  LoadoutClassDef,
  withDoublehandEquipInvariant,
} from "../loadoutStats";
import { estimateTotalDps } from "./estimateTotalDps";
import {
  matrixItemAtLevel,
  monsterToCombatEntity,
  ResolvedCombatStats,
  resolveCombatStatsFromLoadout,
  resolveCombatStatsWithSwap,
} from "./resolveCombatStats";
import type { DpsBreakdown } from "./types";

export type MatrixSimScope = "mainhand" | "loadout";

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
  simScope?: MatrixSimScope;
  baseGear?: { [slot in SlotType]?: ItemInfo };
}): ItemSimEquipNote[] {
  const {
    gItem,
    characterClass,
    className,
    slot = "mainhand",
    simScope = "mainhand",
    baseGear,
  } = args;
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

  if (simScope === "mainhand") {
    notes.push({
      kind: "warning",
      text: "Mainhand-only sim — rings, offhand, and dual-wield not included.",
    });
  } else {
    const pieceCount = Object.keys(baseGear ?? {}).length;
    notes.push({
      kind: "info",
      text:
        pieceCount > 0
          ? `Full loadout sim — swapping mainhand within ${pieceCount} equipped pieces.`
          : "Full loadout mode — import a loadout link to include offhand, rings, and sets.",
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
  simScope?: MatrixSimScope;
  baseGear?: { [slot in SlotType]?: ItemInfo };
}): MatrixItemSimResult | null {
  const {
    itemKey,
    upgradeLevel,
    characterClass,
    playerLevel,
    G,
    simScope = "mainhand",
    baseGear,
  } = args;
  const gItem = G.items[itemKey];
  if (!gItem) return null;

  const { className } = characterClass;
  const itemInfo = matrixItemAtLevel(itemKey, upgradeLevel);
  const equippable = canClassEquipItem(gItem, className);

  const loadoutBase = simScope === "loadout" ? cloneLoadoutGear(baseGear ?? {}) : {};
  const gear = withDoublehandEquipInvariant(
    characterClass,
    loadoutBase,
    "mainhand",
    itemInfo,
    G.items,
  );

  const combatStats =
    simScope === "loadout"
      ? resolveCombatStatsFromLoadout({
          characterClass,
          level: playerLevel,
          gear,
          G,
        })
      : resolveCombatStatsWithSwap({
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
    simScope,
    baseGear: loadoutBase,
  });

  return { breakdown, combatStats, gear, equipNotes, equippable };
}
