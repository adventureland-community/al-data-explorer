import { GItem } from "typed-adventureland";

/** Grade thresholds: High / Rare / Legendary / Exalted — mirrors calculate_item_grade. */
export function getItemGrade(gItem: GItem, level: number): number {
  if (!(gItem.upgrade || gItem.compound)) return 0;
  const grades = (gItem.grades as number[] | undefined) ?? [9, 10, 11, 12];
  if (level >= (grades[3] ?? 12)) return 4;
  if (level >= (grades[2] ?? 11)) return 3;
  if (level >= (grades[1] ?? 10)) return 2;
  if (level >= (grades[0] ?? 9)) return 1;
  return 0;
}
