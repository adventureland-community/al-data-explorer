import { GItem, ItemKey, ItemType, OffhandType, SlotType, WeaponType } from "typed-adventureland";

import { SelectedCharacterClass } from "./types";

/** Slot-type (+ optional class) filter shared by gear pickers. */
export function gearSlotFilter(
  slot: SlotType,
  selectedCharacterClass?: SelectedCharacterClass,
): (itemName: ItemKey, gItem: GItem) => boolean {
  const validTypes: ItemType[] = [];
  const validWeaponTypes: Array<WeaponType | OffhandType> = [];

  switch (slot) {
    case "mainhand":
      validTypes.push("weapon");
      if (selectedCharacterClass) {
        validWeaponTypes.push(...(Object.keys(selectedCharacterClass.mainhand) as WeaponType[]));
        validWeaponTypes.push(...(Object.keys(selectedCharacterClass.doublehand) as WeaponType[]));
      }
      break;
    case "offhand":
      if (selectedCharacterClass) {
        validTypes.push(...(Object.keys(selectedCharacterClass.offhand) as ItemType[]));
        validWeaponTypes.push(...(Object.keys(selectedCharacterClass.offhand) as OffhandType[]));
      }
      break;
    default:
      validTypes.push(slot.replace("1", "").replace("2", "") as ItemType);
      break;
  }

  return (itemName: ItemKey, gItem: GItem) => {
    const validType =
      validTypes.some((x) => x === gItem.type) || (gItem.wtype && gItem.type === "weapon");
    const validWeaponType = gItem.wtype ? validWeaponTypes.some((x) => x === gItem.wtype) : true;
    const validClass = selectedCharacterClass
      ? !gItem.class || gItem.class.some((x) => x === selectedCharacterClass.className)
      : true;
    return Boolean(validType && validWeaponType && validClass);
  };
}
