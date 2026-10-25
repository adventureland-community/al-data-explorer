import { GItem } from "typed-adventureland";

export function itemAcceptsStatScroll(gItem: GItem | undefined): boolean {
  if (!gItem) return false;
  const { stat } = gItem as { stat?: unknown };
  return typeof stat === "number" && stat !== 0;
}
