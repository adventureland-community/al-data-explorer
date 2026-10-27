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
export { itemAcceptsStatScroll } from "./statScroll";

export type TitleOption = {
  key: string;
  label: string;
  /** Numeric luck from the title def, if any. */
  luck?: number;
  type: string;
  /**
   * Natural = earn/type fit for this item. Transfer = non-misc Title that can
   * ride craft/dismantle onto a different item kind (server does not type-check).
   */
  source: "natural" | "transfer";
};

function titleType(def: Record<string, unknown> | undefined): string {
  return typeof def?.type === "string" ? def.type : "all_items";
}

function titleLabel(key: string, def: Record<string, unknown> | undefined): string {
  const name = typeof def?.title === "string" ? def.title : key;
  return name;
}

/** AdventureLand craft/dismantle skip Titles with `misc: true`. */
function titleIsMisc(titleDef: Record<string, unknown> | undefined): boolean {
  return titleDef?.misc === true;
}

/** True for weapon defs (not shields / quivers / sources). */
function isWeaponItem(gItem: GItem): boolean {
  if (gItem.type === "weapon") return true;
  if (!gItem.wtype) return false;
  const kind = String(gItem.type);
  return kind !== "shield" && kind !== "quiver" && kind !== "source";
}

/**
 * Natural / earn-slot fit for a G.titles entry — not exclusive legality.
 * `type` is the item kind the Title is meant for (cape, helmet, mainhand weapon, …),
 * not “only while equipped in that slot”. Warriors can put a Sniper's sword in offhand;
 * stats still apply from item.p. Non-misc Titles can also land via craft/dismantle.
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

function toTitleOption(
  key: string,
  def: Record<string, unknown>,
  source: "natural" | "transfer",
): TitleOption {
  return {
    key,
    label: titleLabel(key, def),
    luck: typeof def.luck === "number" ? def.luck : undefined,
    type: titleType(def),
    source,
  };
}

function sortTitleOptions(options: TitleOption[]): TitleOption[] {
  return options.sort((a, b) => {
    const aLuck = a.luck != null ? 0 : 1;
    const bLuck = b.luck != null ? 0 : 1;
    if (aLuck !== bLuck) return aLuck - bLuck;
    return a.label.localeCompare(b.label);
  });
}

/**
 * Titles selectable for planning: natural fits first, then other non-misc Titles
 * that can arrive via craft/dismantle transfer.
 */
export function listTitleOptions(
  titles: ItemTitleDefs | undefined,
  gItem: GItem | undefined,
  slot?: SlotType | false,
): TitleOption[] {
  if (!titles) return [];
  const natural: TitleOption[] = [];
  const transfer: TitleOption[] = [];
  for (const [key, def] of Object.entries(titles)) {
    if (titleAppliesToItem(def, gItem, slot)) {
      natural.push(toTitleOption(key, def, "natural"));
      continue;
    }
    if (titleIsMisc(def)) continue;
    transfer.push(toTitleOption(key, def, "transfer"));
  }
  return [...sortTitleOptions(natural), ...sortTitleOptions(transfer)];
}

/** Titles that add luck (Lucky, Festive, …), including transferable luck Titles. */
export function listLuckTitleOptions(
  titles: ItemTitleDefs | undefined,
  gItem: GItem | undefined,
  slot?: SlotType | false,
): TitleOption[] {
  return listTitleOptions(titles, gItem, slot).filter((t) => t.luck != null && t.luck !== 0);
}
