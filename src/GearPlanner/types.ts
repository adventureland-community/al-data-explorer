import { ItemInfo } from "adventureland";
import { SlotType } from "adventureland/dist/src/entities/slots";
import { ClassKey, GClass } from "adventureland/dist/src/types/GTypes/classes";

export type SelectedCharacterClass = {
  className: ClassKey;
} & GClass;

export type SavedLoadout = {
  gear: { [slot in SlotType]?: ItemInfo };
  classKey: ClassKey | undefined;
  level: number;
};

export type SavedLoadouts = {
  [key: string]: SavedLoadout;
};
