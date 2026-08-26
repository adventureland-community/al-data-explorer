import { parseDropEntry } from "./dropTable";

export type NestedLeafShare = {
  itemKey: string;
  probability: number;
  quantity: number | null;
};

/** Expand an open nested table into leaf shares for display (exchange or kill open row). */
export function nestedLeafShares(
  drops: Record<string, unknown>,
  nestedTable: string,
  openProbability: number,
): NestedLeafShare[] {
  const nested = drops[nestedTable];
  if (!Array.isArray(nested) || !(openProbability > 0)) return [];
  let total = 0;
  for (const entry of nested) {
    if (Array.isArray(entry) && typeof entry[0] === "number") total += entry[0];
  }
  if (total <= 0) return [];
  const leaves: NestedLeafShare[] = [];
  for (const entry of nested) {
    const parsed = parseDropEntry("table", nestedTable, entry, "weighted", total);
    for (const row of parsed) {
      if (!row.itemKey || row.probability == null) continue;
      leaves.push({
        itemKey: row.itemKey,
        probability: openProbability * row.probability,
        quantity: row.quantity,
      });
    }
  }
  return leaves;
}
