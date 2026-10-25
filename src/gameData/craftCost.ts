import type { GCraft } from "typed-adventureland";

import { parseCraftRow } from "./craftRecipe";
import { PriceTable, unitPrice } from "./upgradePrices";

export type CraftLeafLine = {
  itemKey: string;
  /** Quantity of this leaf per one craft of the root output. */
  quantity: number;
  unitPrice: number;
  total: number;
};

export type CraftCostOk = {
  ok: true;
  /** Gold to craft one output (recipe fee + priced leaves). */
  cost: number;
  /** NPC/craft gold fee from `G.craft[key].cost`. */
  fee: number;
  leaves: CraftLeafLine[];
};

export type CraftCostIncomplete = {
  ok: false;
  /** Ingredient keys with no price and no resolvable nested craft. */
  unresolved: string[];
  /** Partial gold if some leaves/fee were priced (informational). */
  partialCost: number;
  fee: number;
  leaves: CraftLeafLine[];
};

export type CraftCostResult = CraftCostOk | CraftCostIncomplete;

const DEFAULT_MAX_DEPTH = 8;

function recipeFor(craft: Record<string, GCraft> | undefined, itemKey: string): GCraft | undefined {
  if (!craft) return undefined;
  return craft[itemKey];
}

/**
 * Expected gold to craft one `itemKey` using `prices` for leaves.
 *
 * Resolution per ingredient:
 * 1. Finite `prices[ingredient]` → buy that leaf
 * 2. Else nested `G.craft[ingredient]` → recurse
 * 3. Else → unresolved (caller must set a price)
 *
 * `G.items[].g` is not consulted here — seed it into `prices` if you want vendor defaults.
 */
export function craftExpectedCost(args: {
  itemKey: string;
  prices: PriceTable;
  craft: Record<string, GCraft> | undefined;
  maxDepth?: number;
}): CraftCostResult {
  const maxDepth = args.maxDepth ?? DEFAULT_MAX_DEPTH;
  const unresolved = new Set<string>();
  const leafQty = new Map<string, number>();
  let feeTotal = 0;
  let ok = true;

  const visit = (key: string, mult: number, depth: number, stack: Set<string>) => {
    if (!(mult > 0) || !Number.isFinite(mult)) return;
    if (depth > maxDepth || stack.has(key)) {
      ok = false;
      unresolved.add(key);
      return;
    }

    const recipe = recipeFor(args.craft, key);
    if (!recipe?.items?.length) {
      const unit = unitPrice(args.prices, key);
      if (Number.isFinite(unit) && unit >= 0) {
        leafQty.set(key, (leafQty.get(key) ?? 0) + mult);
        return;
      }
      ok = false;
      unresolved.add(key);
      return;
    }

    const fee = typeof recipe.cost === "number" && Number.isFinite(recipe.cost) ? recipe.cost : 0;
    feeTotal += fee * mult;

    const nextStack = new Set(stack);
    nextStack.add(key);

    for (const row of recipe.items) {
      const parsed = parseCraftRow(row);
      const childKey = parsed.itemKey as string;
      const childQty = (parsed.quantity > 0 ? parsed.quantity : 1) * mult;
      const childUnit = unitPrice(args.prices, childKey);
      if (Number.isFinite(childUnit) && childUnit >= 0) {
        leafQty.set(childKey, (leafQty.get(childKey) ?? 0) + childQty);
        continue;
      }
      if (recipeFor(args.craft, childKey)?.items?.length) {
        visit(childKey, childQty, depth + 1, nextStack);
        continue;
      }
      ok = false;
      unresolved.add(childKey);
    }
  };

  const root = recipeFor(args.craft, args.itemKey);
  if (!root?.items?.length) {
    return {
      ok: false,
      unresolved: [args.itemKey],
      partialCost: 0,
      fee: 0,
      leaves: [],
    };
  }

  visit(args.itemKey, 1, 0, new Set());

  const leaves: CraftLeafLine[] = [];
  let leavesGold = 0;
  for (const [itemKey, quantity] of leafQty) {
    const unit = unitPrice(args.prices, itemKey);
    const total = Number.isFinite(unit) ? unit * quantity : Infinity;
    if (Number.isFinite(total)) leavesGold += total;
    leaves.push({
      itemKey,
      quantity,
      unitPrice: Number.isFinite(unit) ? unit : Infinity,
      total,
    });
  }
  leaves.sort((a, b) => a.itemKey.localeCompare(b.itemKey));

  const partialCost = feeTotal + leavesGold;
  if (!ok || unresolved.size) {
    return {
      ok: false,
      unresolved: [...unresolved].sort(),
      partialCost,
      fee: feeTotal,
      leaves,
    };
  }
  return { ok: true, cost: partialCost, fee: feeTotal, leaves };
}

/** Ingredient keys that still need a Toolkit price for a complete craft EV. */
export function listUnresolvedCraftLeaves(args: {
  itemKey: string;
  prices: PriceTable;
  craft: Record<string, GCraft> | undefined;
  maxDepth?: number;
}): string[] {
  const result = craftExpectedCost(args);
  return result.ok ? [] : result.unresolved;
}

export function itemHasCraftRecipe(
  craft: Record<string, GCraft> | undefined,
  itemKey: string,
): boolean {
  const recipe = recipeFor(craft, itemKey);
  return Boolean(recipe?.items?.length);
}

/** Scale craft leaves (and optional fee as `_craft_fee`) by expected output copies. */
export function craftMaterialsForCopies(args: {
  craft: CraftCostOk;
  copies: number;
}): { itemKey: string; expectedQty: number; unitPrice: number; total: number }[] {
  const copies = args.copies > 0 && Number.isFinite(args.copies) ? args.copies : 1;
  const lines: { itemKey: string; expectedQty: number; unitPrice: number; total: number }[] = [];
  for (const leaf of args.craft.leaves) {
    const expectedQty = leaf.quantity * copies;
    lines.push({
      itemKey: leaf.itemKey,
      expectedQty,
      unitPrice: leaf.unitPrice,
      total: leaf.unitPrice * expectedQty,
    });
  }
  if (args.craft.fee > 0) {
    lines.push({
      itemKey: "_craft_fee",
      expectedQty: copies,
      unitPrice: args.craft.fee,
      total: args.craft.fee * copies,
    });
  }
  return lines;
}

/** Per-output craft shopping lines (qty for one craft) for Acquire fold. */
export function craftCostToMaterialLines(
  craft: CraftCostOk,
): { itemKey: string; expectedQty: number; unitPrice: number; total: number }[] {
  return craftMaterialsForCopies({ craft, copies: 1 });
}
