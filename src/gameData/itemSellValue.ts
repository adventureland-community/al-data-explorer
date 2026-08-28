import type { GData, GItem, ItemKey } from "typed-adventureland";

/** Minimal item fields used by Adventure Land's calculate_item_value. */
export type NpcSellValueItem = {
  name: ItemKey | string;
  level?: number;
  gift?: boolean;
  expires?: unknown;
};

/**
 * NPC merchant sell gold for one item — mirrors `calculate_item_value(item)` in game code.
 * Default multiplier is 60% of base `g` unless the item has a `cash` property.
 */
export function calculateItemNpcSellValue(
  item: NpcSellValueItem,
  gItem: GItem | undefined,
  G: GData,
  markupMultiplier = 0.6,
): number {
  if (!gItem) return 0;
  if (item.gift) return 1;

  const { cash } = gItem as GItem & { cash?: number };
  let value = (cash && gItem.g) || (gItem.g ?? 0) * markupMultiplier;
  let divide = 1;

  if (gItem.markup) value /= gItem.markup;

  const level = item.level ?? 0;
  const grades = (gItem.grades as number[] | undefined) ?? [11, 12];

  if (gItem.compound && level > 0) {
    for (let i = 1; i <= level; i++) {
      let grade = 0;
      if (i > (grades[1] ?? 12)) grade = 2;
      else if (i > (grades[0] ?? 11)) grade = 1;

      if (cash) value *= 1.5;
      else value *= 3.2;

      const scrollG = G.items[`cscroll${grade}` as ItemKey]?.g ?? 0;
      if (gItem.type !== "booster") value += scrollG / 2.4;
      else value *= 0.75;
    }
  }

  if (gItem.upgrade && level > 0) {
    let scrollValue = 0;
    for (let i = 1; i <= level; i++) {
      let grade = 0;
      if (i > (grades[1] ?? 12)) grade = 2;
      else if (i > (grades[0] ?? 11)) grade = 1;

      scrollValue += (G.items[`scroll${grade}` as ItemKey]?.g ?? 0) / 2;

      if (i >= 7) {
        value *= 3;
        scrollValue *= 1.32;
      } else if (i === 6) {
        value *= 2.4;
      } else if (i >= 4) {
        value *= 2;
      }

      if (i === 9) {
        value *= 2.64;
        value += 400000;
      }
      if (i === 10) value *= 5;
      if (i === 12) value *= 0.8;
    }
    value += scrollValue;
  }

  if (item.expires) divide = 8;

  return Math.round(value / divide) || 0;
}
