import { GItem, ItemKey, SlotType, StatType } from "typed-adventureland";

import type { ItemTitleDefs } from "./itemProperties";

export type StatScrollOption = {
  stat: StatType;
  itemKey: ItemKey;
  name: string;
};

/**
 * Stat scrolls from G.items (`type: "pscroll"`). Prefer this over a hard-coded list
 * so icons and names stay in sync with game data.
 */
export function listStatScrollOptions(
  items: Record<string, GItem | undefined> | undefined,
): StatScrollOption[] {
  if (!items) return [];
  const out: StatScrollOption[] = [];
  for (const [key, def] of Object.entries(items)) {
    if (!def || def.type !== "pscroll") continue;
    const stat =
      typeof (def as { stat?: unknown }).stat === "string"
        ? ((def as { stat: string }).stat as StatType)
        : undefined;
    if (!stat) continue;
    out.push({
      stat,
      itemKey: key as ItemKey,
      name: def.name ?? key,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** True when the item can take a property/stat scroll (`G.items.*.stat` points). */
export function itemAcceptsStatScroll(gItem: GItem | undefined): boolean {
  if (!gItem) return false;
  const { stat } = gItem as { stat?: unknown };
  return typeof stat === "number" && stat !== 0;
}

export type TitleOption = {
  key: string;
  label: string;
  /** Numeric luck from the title def, if any. */
  luck?: number;
  type: string;
};

function titleType(def: Record<string, unknown> | undefined): string {
  return typeof def?.type === "string" ? def.type : "all_items";
}

function titleLabel(key: string, def: Record<string, unknown> | undefined): string {
  const name = typeof def?.title === "string" ? def.title : key;
  return name;
}

/** True for weapon defs (not shields / quivers / sources). */
function isWeaponItem(gItem: GItem): boolean {
  if (gItem.type === "weapon") return true;
  if (!gItem.wtype) return false;
  const kind = String(gItem.type);
  return kind !== "shield" && kind !== "quiver" && kind !== "source";
}

/**
 * Whether a G.titles entry can apply to this item.
 * `type` on titles is the item kind the title is meant for (cape, helmet, mainhand weapon, …),
 * not “only while equipped in that slot”. Warriors can put a Sniper's sword in offhand;
 * stats still apply from item.p.
 */
export function titleAppliesToItem(
  titleDef: Record<string, unknown> | undefined,
  gItem: GItem | undefined,
  slot?: SlotType | false,
): boolean {
  const t = titleType(titleDef);
  if (t === "all_items") return true;

  if (t === "mainhand") {
    if (gItem) return isWeaponItem(gItem);
    return slot === "mainhand" || slot === "offhand";
  }

  if (t === "weapon") {
    if (gItem) return isWeaponItem(gItem);
    return slot === "mainhand" || slot === "offhand";
  }

  // Apparel / slot-named types (cape, helmet, pants, orb, …)
  if (gItem) return t === gItem.type;
  return Boolean(slot && t === slot);
}

export function listTitleOptions(
  titles: ItemTitleDefs | undefined,
  gItem: GItem | undefined,
  slot?: SlotType | false,
): TitleOption[] {
  if (!titles) return [];
  const out: TitleOption[] = [];
  for (const [key, def] of Object.entries(titles)) {
    if (!titleAppliesToItem(def, gItem, slot)) continue;
    out.push({
      key,
      label: titleLabel(key, def),
      luck: typeof def.luck === "number" ? def.luck : undefined,
      type: titleType(def),
    });
  }
  out.sort((a, b) => {
    const aLuck = a.luck != null ? 0 : 1;
    const bLuck = b.luck != null ? 0 : 1;
    if (aLuck !== bLuck) return aLuck - bLuck;
    return a.label.localeCompare(b.label);
  });
  return out;
}

/** Titles that add luck (Lucky, Festive, …) and apply to the item/slot. */
export function listLuckTitleOptions(
  titles: ItemTitleDefs | undefined,
  gItem: GItem | undefined,
  slot?: SlotType | false,
): TitleOption[] {
  return listTitleOptions(titles, gItem, slot).filter((t) => t.luck != null && t.luck !== 0);
}
