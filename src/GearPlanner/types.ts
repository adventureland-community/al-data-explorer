import { ClassKey, GClass } from "adventureland/dist/src/types/GTypes/classes";

export type SelectedCharacterClass = {
    className: ClassKey;
  } & GClass;