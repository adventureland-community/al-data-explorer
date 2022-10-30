import { GData } from "adventureland/dist/src/types/GTypes";
import { GItem, ItemKey } from "adventureland/dist/src/types/GTypes/items";
import { createContext } from "react";

export const GDataContext = createContext<CustomGData | undefined>(undefined);
export type GItems = {
  [T in ItemKey]: GItem;
};

export type MainStatType = "dex" | "int" | "vit" | "str" | "for";

export type CustomGData = GData & {
  positions: any;
  imagesets: any;
  timestamp: string;
};
