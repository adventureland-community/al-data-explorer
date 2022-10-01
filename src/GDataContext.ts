import {
  CharacterType,
  DamageType,
  GItem,
  ItemName,
  StatType,
  WeaponType,
} from "adventureland";
import { createContext } from "react";

export const GDataContext = createContext<GData>({});
export type GItems = {
  [T in ItemName]: GItem;
};

export type MainStatType = "dex" | "int" | "vit" | "str" | "for";

export type CharacterTypeData = {
    /** A list of items that the character can equip using both hands */
    doublehand: {
        [T in WeaponType]?: {
            [T in StatType]?: number;
        };
    };
    /** A list of items that the character can equip in its mainhand */
    mainhand: {
        [T in WeaponType]?: {
            [T in StatType]?: number;
        };
    };
    /** A list of items that the character can equip in its offhand */
    offhand: {
        [T in WeaponType]?: {
            [T in StatType]?: number;
        };
    };
    stats: {
        [T in MainStatType]: number;
    };
    lstats: {
        [T in MainStatType]: number;
    };
    resistance: number;
    frequency: number;
    damage_type: DamageType;
    mcourage: number;
    speed: number;
    armor: number;
    range: number;
    attack: number;
    description: string;
    hp: number;
    mp: number;
    pcourage: number;
    mp_cost: number;
    courage: number;
    output: number;
    main_stat: MainStatType;
};

export type GData = {
  items?: GItems;
  classes?: {
    [T in CharacterType]: CharacterTypeData;
  };
};
