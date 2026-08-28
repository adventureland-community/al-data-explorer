import type { GCraft, ItemInfoPValues, ItemKey } from "typed-adventureland";

export type CraftRecipeRow = GCraft["items"][number];

export type ParsedCraftRow = {
  quantity: number;
  itemKey: ItemKey;
  level?: number;
  /** Title/skin suffix when row[2] is a string (e.g. `[1, "open", "armorx"]`). */
  title?: ItemInfoPValues;
};

/** Parse a G craft/dismantle ingredient row `[qty, item]`, `[qty, item, level]`, or `[qty, item, title]`. */
export function parseCraftRow(row: CraftRecipeRow): ParsedCraftRow {
  const quantity = row[0] ?? 1;
  const itemKey = row[1] as ItemKey;
  const third = row[2];
  const level = typeof third === "number" ? third : undefined;
  const title = typeof third === "string" ? (third as ItemInfoPValues) : undefined;
  return { quantity, itemKey, level, title };
}

/** Stable React key for a craft ingredient row. */
export function craftRowKey(
  row: Pick<ParsedCraftRow, "itemKey" | "level" | "title" | "quantity">,
): string {
  return `${row.itemKey}-${row.level ?? 0}-${row.title ?? ""}-${row.quantity}`;
}

/** Format recipe gold cost for display (e.g. `100,000g`). */
export function formatCraftCost(amount: number): string {
  return `${amount.toLocaleString("en-US")}g`;
}

/** Total gold for crafting `batchCount` at `costPerCraft` each. */
export function totalCraftCost(costPerCraft: number, batchCount: number): number {
  return costPerCraft * batchCount;
}
