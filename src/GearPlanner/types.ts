import { CharacterType } from "adventureland";
import { CharacterTypeData } from "../GDataContext";

export type SelectedCharacterClass = {
    className: CharacterType;
  } & CharacterTypeData;