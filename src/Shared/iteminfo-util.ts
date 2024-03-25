import { ItemKey, GItem, GData, TitleKey } from "typed-adventureland";

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
  const titleName = titleKey && G.titles[titleKey] ? `${G.titles[titleKey].title} ` : "";
  return titleName;
}
