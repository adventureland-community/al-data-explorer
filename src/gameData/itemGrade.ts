import { GItem } from "typed-adventureland";

/** Grade thresholds: High / Rare / Legendary / Exalted — mirrors calculate_item_grade. */
export function getItemGrade(gItem: GItem, level: number): number {
  if (!(gItem.upgrade || gItem.compound)) return 0;
  // Missing grades[i] must not coerce (server compares against undefined → never matches).
  const grades = (gItem.grades as number[] | undefined) ?? [9, 10, 11, 12];
  if (grades[3] != null && level >= grades[3]) return 4;
  if (grades[2] != null && level >= grades[2]) return 3;
  if (grades[1] != null && level >= grades[1]) return 2;
  if (grades[0] != null && level >= grades[0]) return 1;
  return 0;
}
