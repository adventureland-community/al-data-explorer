import { ClassKey } from "typed-adventureland";

import { isClassKey, titleCaseKey } from "../gameData/classSkills";

export const CLASS_DISPLAY_ORDER = [
  "Warrior",
  "Mage",
  "Priest",
  "Ranger",
  "Rogue",
  "Paladin",
  "Merchant",
] as const;

export function classNameToKey(className: string): ClassKey | undefined {
  const key = className.trim().toLowerCase();
  return isClassKey(key) ? key : undefined;
}

export function classKeyToName(classKey: ClassKey): string {
  return titleCaseKey(classKey);
}

export function sortClassNames(names: string[]): string[] {
  const known = CLASS_DISPLAY_ORDER.filter((name) => names.includes(name));
  const rest = names
    .filter((name) => !(CLASS_DISPLAY_ORDER as readonly string[]).includes(name))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...rest];
}
