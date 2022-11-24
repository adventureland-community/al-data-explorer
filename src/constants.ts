import { ClassKey, StatType } from "typed-adventureland";
import { MainStatType } from "./GDataContext";

export const CLASS_COLOR_NUMBER: { [type in ClassKey]: number } = {
  merchant: 0x7f7f7f,
  mage: 0x3e6eed,
  warrior: 0xf07f2f,
  priest: 0xeb4d82,
  ranger: 0x8a512b,
  paladin: 0xa3b4b9,
  rogue: 0x44b75c,
};

export const CLASS_COLOR: { [type in ClassKey]: string } = {
  merchant: "#7f7f7f",
  mage: "#3e6eed",
  warrior: "#f07f2f",
  priest: "#eb4d82",
  ranger: "#8a512b",
  paladin: "#a3b4b9",
  rogue: "#44b75c",
};

export const ATTRIBUTES: {
  [key in
    | StatType
    | MainStatType
    | "heal"
    | "xrange"
    | "miss"
    | "courage"
    | "mcourage"
    | "pcourage"
    | "fear"]?: { description: string };
} = {
  for: { description: "10 Fortitude, 10% PVP Damage Reduction" },
  attack: { description: "" },
  heal: { description: "" },
  frequency: { description: "attacks/second" },
  speed: { description: "run speed, pixels/second" },
  range: { description: "attack range in pixels" },
  xrange: {
    description: "extra range allowance - increases 5/second - max 25",
  },
  armor: { description: "" },
  resistance: { description: "" },
  mp_cost: { description: "" },
  evasion: { description: "" },
  miss: { description: "% of attacks you miss" },
  reflection: { description: "magical attack reflection" },
  lifesteal: { description: "" },
  manasteal: { description: "" },
  rpiercing: { description: "resistance piercing" },
  apiercing: { description: "armor piercing" },
  crit: { description: "% chance to hit 2X" },
  dreturn: { description: "damage return" },
  courage: {
    description: "max amount of physical targets before getting scared",
  },
  mcourage: {
    description: "max amount of magical targets before getting scared",
  },
  pcourage: { description: "max amount of pure targets before getting scared" },
  fear: { description: "courage excess" },
};
