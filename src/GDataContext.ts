import { CharacterType, GItem, ItemName } from "adventureland";
import { createContext } from "react";

export const GDataContext = createContext<GData>({});
export type GItems = {
    [T in ItemName]: GItem;
  };

export type GData = {
  items?: GItems;
  classes?: { [T in CharacterType]: any };
};
