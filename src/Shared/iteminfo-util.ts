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

/** Native `title` tooltip text for an item instance (name, level, key, type, quantity). */
export function getItemInstanceTitle(itemInfo: ItemInfo, G: GData) {
  const itemKey = itemInfo.name as ItemKey;
  const gItem = G.items[itemKey];
  const quantity = itemInfo.q ?? 1;

  if (!gItem) {
    return quantity > 1 ? `${itemKey}\nx${quantity.toLocaleString()}` : itemKey;
  }

  const titleName = getTitleName(itemInfo, G);
  const itemName = getItemName(itemKey, gItem);
  const levelString = getLevelString(gItem, itemInfo.level);

  let htmlTitle = itemName;
  if (titleName) {
    htmlTitle = `${titleName} ${htmlTitle}`;
  }
  if (levelString) {
    htmlTitle = `+${levelString} ${htmlTitle}`;
  }
  htmlTitle += `\n${itemKey}`;
  htmlTitle += `\n${gItem.type}`;
  if (quantity > 1) {
    htmlTitle += `\nx${quantity.toLocaleString()}`;
  }
  return htmlTitle;
}
