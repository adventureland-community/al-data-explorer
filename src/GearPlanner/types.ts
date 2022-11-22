import { ItemInfo } from "typed-adventureland";
import { SlotType } from "typed-adventureland";
import { ClassKey, GClass } from "typed-adventureland";

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
