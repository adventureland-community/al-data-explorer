import { GItem, ItemInfo, ItemKey, SlotType } from "typed-adventureland";

import { CustomGData } from "../GDataContext";
import { mapEquippedPieceStats } from "../gameData/loadoutStats";
import { resolveItemInstanceStats } from "../gameData/itemProperties";

export function luckmToUiPercent(luckm: number): number {
  return Math.round(luckm * 100);
}

export function xluckToLuckm(xluck: number): number {
  return 1 + xluck / 100;
}

/** Item contributes xluck when equipped (base, compound, or upgrade luck). */
function statBlockHasLuck(block: unknown): boolean {
  if (!block || typeof block !== "object" || !("luck" in block)) return false;
  const { luck } = block as { luck?: unknown };
  return typeof luck === "number";
}

export function itemHasLuckStat(item: GItem | undefined): boolean {
  if (!item) return false;
  return (
    (typeof item.luck === "number" && item.luck !== 0) ||
    statBlockHasLuck(item.compound) ||
    statBlockHasLuck(item.upgrade)
  );
}

export type LuckBreakdownLine = {
  slot: SlotType | "party";
  label: string;
  itemKey: ItemKey | "";
  level: number;
  /** Title key (item.p) when it contributes stats. */
  titleKey?: string;
  xluck: number;
};

const SLOT_LABELS: Partial<Record<SlotType, string>> = {
  ring1: "Ring 1",
  ring2: "Ring 2",
  orb: "Orb",
  earring1: "Earring 1",
  earring2: "Earring 2",
  elixir: "Elixir",
  mainhand: "Mainhand",
  offhand: "Offhand",
  chest: "Chest",
  helmet: "Helmet",
  amulet: "Amulet",
  cape: "Cape",
  belt: "Belt",
  pants: "Pants",
  shoes: "Shoes",
  gloves: "Gloves",
};

export function gearPieceXluck(G: CustomGData, itemInfo: ItemInfo, classKey?: string): number {
  const def = G.items[itemInfo.name];
  if (!def) return 0;
  return (
    resolveItemInstanceStats({
      def,
      itemInfo,
      G,
      classKey,
    }).luck ?? 0
  );
}

/**
 * Project luckm from the shared loadout gear walk (+ optional party xluck).
 */
export function computeLuckmFromGear(args: {
  gear: { [slot in SlotType]?: ItemInfo };
  G: CustomGData;
  classKey?: string;
  partyXluck?: number;
}): { xluck: number; luckm: number; breakdown: LuckBreakdownLine[] } {
  const breakdown: LuckBreakdownLine[] = [];
  let xluck = 0;

  for (const piece of mapEquippedPieceStats({
    gear: args.gear,
    G: args.G,
    classKey: args.classKey,
  })) {
    const lineXluck = piece.stats.luck ?? 0;
    if (lineXluck === 0) continue;
    xluck += lineXluck;
    breakdown.push({
      slot: piece.slot,
      label: SLOT_LABELS[piece.slot] ?? piece.slot,
      itemKey: piece.itemInfo.name,
      level: piece.itemInfo.level ?? 0,
      titleKey: piece.itemInfo.p,
      xluck: lineXluck,
    });
  }

  const partyXluck = args.partyXluck ?? 0;
  if (partyXluck > 0) {
    xluck += partyXluck;
    breakdown.push({
      slot: "party",
      label: "Party luck",
      itemKey: "",
      level: 0,
      xluck: partyXluck,
    });
  }

  breakdown.sort((a, b) => b.xluck - a.xluck || a.label.localeCompare(b.label));
  return { xluck, luckm: xluckToLuckm(xluck), breakdown };
}

export const DROP_SIM_LUCK_STORAGE_KEY = "dropSimLuckPresets";
