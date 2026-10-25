import type { GCraft } from "typed-adventureland";

import {
  craftCostToMaterialLines,
  craftExpectedCost,
  craftMaterialsForCopies,
  listUnresolvedCraftLeaves,
} from "../craftCost";

const craft = {
  blade: {
    cost: 100,
    items: [
      [2, "metal"],
      [1, "wood"],
    ],
  },
  sword: {
    cost: 50,
    items: [
      [1, "blade"],
      [1, "hilt"],
    ],
  },
  loop: { cost: 1, items: [[1, "loop"]] },
} as unknown as Record<string, GCraft>;

describe("craftExpectedCost", () => {
  it("sums fee + priced leaves for a flat recipe", () => {
    const result = craftExpectedCost({
      itemKey: "blade",
      prices: { metal: 10, wood: 5 },
      craft,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fee).toBe(100);
    expect(result.cost).toBe(100 + 2 * 10 + 5);
    expect(result.leaves).toStrictEqual([
      { itemKey: "metal", quantity: 2, unitPrice: 10, total: 20 },
      { itemKey: "wood", quantity: 1, unitPrice: 5, total: 5 },
    ]);
  });

  it("recurses into nested crafts when the intermediate has no price", () => {
    const result = craftExpectedCost({
      itemKey: "sword",
      prices: { metal: 10, wood: 5, hilt: 20 },
      craft,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // sword fee 50 + blade fee 100 + 2 metal + wood + hilt
    expect(result.cost).toBe(50 + 100 + 20 + 5 + 20);
    expect(result.leaves.map((l) => l.itemKey).sort()).toStrictEqual(["hilt", "metal", "wood"]);
  });

  it("uses the intermediate market price instead of exploding when priced", () => {
    const result = craftExpectedCost({
      itemKey: "sword",
      prices: { blade: 500, hilt: 20 },
      craft,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cost).toBe(50 + 500 + 20);
    expect(result.leaves).toStrictEqual([
      { itemKey: "blade", quantity: 1, unitPrice: 500, total: 500 },
      { itemKey: "hilt", quantity: 1, unitPrice: 20, total: 20 },
    ]);
  });

  it("lists unresolved leaves when prices are missing", () => {
    const result = craftExpectedCost({
      itemKey: "blade",
      prices: { wood: 5 },
      craft,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.unresolved).toStrictEqual(["metal"]);
    expect(
      listUnresolvedCraftLeaves({ itemKey: "blade", prices: { wood: 5 }, craft }),
    ).toStrictEqual(["metal"]);
  });

  it("treats craft cycles as unresolved", () => {
    const result = craftExpectedCost({
      itemKey: "loop",
      prices: {},
      craft,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.unresolved).toContain("loop");
  });
});

describe("craftMaterialsForCopies", () => {
  it("scales leaves and fee by expected copies", () => {
    const result = craftExpectedCost({
      itemKey: "blade",
      prices: { metal: 10, wood: 5 },
      craft,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const mats = craftMaterialsForCopies({ craft: result, copies: 3 });
    expect(mats.find((m) => m.itemKey === "metal")?.expectedQty).toBe(6);
    expect(mats.find((m) => m.itemKey === "_craft_fee")?.total).toBe(300);
  });
});

describe("craftCostToMaterialLines", () => {
  it("returns per-craft lines (unscaled) for Acquire fold", () => {
    const result = craftExpectedCost({
      itemKey: "blade",
      prices: { metal: 10, wood: 5 },
      craft,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = craftCostToMaterialLines(result);
    expect(lines.find((m) => m.itemKey === "metal")).toStrictEqual({
      itemKey: "metal",
      expectedQty: 2,
      unitPrice: 10,
      total: 20,
    });
    expect(lines.find((m) => m.itemKey === "_craft_fee")?.expectedQty).toBe(1);
  });
});
