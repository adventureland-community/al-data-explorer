import { ItemKey, GItem, GData, TitleKey, ItemInfo } from "typed-adventureland";
import { getLevelString } from "../Utils";

export const tshirtNames: { [key in ItemKey]?: string } = {
  tshirt88: "Lucky", // Luck and all
  tshirt9: "Manasteal", // Manasteal
  tshirt3: "XP", // XP
  tshirt8: "Attack MP", // Attack MP cost
  tshirt7: "Armor piercing", // Armor piercing
  tshirt6: "Res. piercing", // Res. piercing
  tshirt4: "Speed", // Speed
};

export function getItemName(itemKey: ItemKey, gItem: GItem) {
  return itemKey in tshirtNames ? `${tshirtNames[itemKey]} ${gItem.name}` : gItem.name;
}
export function getTitleName(itemInfo: any, G: GData) {
  const titleKey = itemInfo.p as TitleKey;
  const titleName = titleKey && G.titles[titleKey] ? `${G.titles[titleKey].title}` : "";
  return titleName;
}

/**
 * Human-readable item label with optional title and level, e.g. "+6 Green Pumpkin Head".
 * Matches the naming used in {@link getItemInstanceTitle}.
 */
export function formatItemDisplayName(
  itemInfo: { name: string; level?: number; p?: string },
  G: GData,
): string {
  const itemKey = itemInfo.name as ItemKey;
  const gItem = G.items[itemKey];
  if (!gItem) {
    return itemInfo.level ? `${itemKey} +${itemInfo.level}` : itemKey;
  }

  const titleName = getTitleName(itemInfo, G);
  const itemName = getItemName(itemKey, gItem);
  const levelString = getLevelString(gItem, itemInfo.level);

  let label = itemName;
  if (titleName) {
    label = `${titleName} ${label}`;
  }
  // Level 0 is the base item — don't prefix "+0".
  if (levelString !== undefined && levelString !== null && levelString !== 0) {
    label = `+${levelString} ${label}`;
  }
  return label;
}

/** Native `title` tooltip text for an item instance (name, level, key, type, quantity). */
export function getItemInstanceTitle(itemInfo: ItemInfo, G: GData) {
  const itemKey = itemInfo.name as ItemKey;
  const gItem = G.items[itemKey];
  const quantity = itemInfo.q ?? 1;

  if (!gItem) {
    return quantity > 1 ? `${itemKey}\nx${quantity.toLocaleString()}` : itemKey;
  }

  let htmlTitle = formatItemDisplayName(itemInfo, G);
  htmlTitle += `\n${itemKey}`;
  htmlTitle += `\n${gItem.type}`;
  if (quantity > 1) {
    htmlTitle += `\nx${quantity.toLocaleString()}`;
  }
  return htmlTitle;
}
