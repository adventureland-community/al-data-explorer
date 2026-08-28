import { ItemKey } from "typed-adventureland";
import {
  analyzeCompoundCombines,
  analyzeCraftRecipes,
  bankItemMatchesFilters,
  computeBankSellBreakdown,
  computeCombineCounts,
  computeMissingForCraftCount,
  computePotentialCraftCount,
  computeStackConsolidation,
  EMPTY_BANK_FILTERS,
  filterBankChanges,
  getBankQuantities,
  getBankQuantityForIngredient,
  groupCombineSteps,
} from "../bankAnalysis";
import { AggregatedBankItem } from "../bankItems";

const hpot: AggregatedBankItem = {
  name: "hpot0",
  level: 0,
  q: 100,
  stack: 4,
  category: "Potions",
};

describe("computeStackConsolidation", () => {
  it("finds over-stacked items", () => {
    const G = {
      items: {
        hpot0: { name: "HP Potion", s: 50 },
      },
    } as any;

    const result = computeStackConsolidation([hpot], G);
    expect(result.totalSlotsSaved).toBe(2);
    expect(result.suggestions[0]?.optimalStacks).toBe(2);
  });
});

describe("getBankQuantities", () => {
  it("sums stack quantities by item key", () => {
    const quantities = getBankQuantities({
      items0: [{ name: "hpot0", q: 10 }, { name: "hpot0", q: 5 }, null],
    });
    expect(quantities.get("hpot0")).toBe(15);
  });
});

describe("bankItemMatchesFilters", () => {
  it("matches title and exchange flags", () => {
    const item: AggregatedBankItem = {
      name: "sword",
      level: 0,
      p: "lucky",
      q: 1,
      stack: 1,
      category: "Weapons",
    };
    const G = {
      items: {
        sword: { name: "Sword", e: 1 },
      },
    } as any;

    expect(
      bankItemMatchesFilters(item, G, {
        ...EMPTY_BANK_FILTERS,
        titles: ["lucky"],
      }),
    ).toBe(true);
    expect(
      bankItemMatchesFilters(item, G, {
        ...EMPTY_BANK_FILTERS,
        flags: { exchange: true },
      }),
    ).toBe(true);
    expect(
      bankItemMatchesFilters(item, G, {
        ...EMPTY_BANK_FILTERS,
        titles: ["festive"],
      }),
    ).toBe(false);
  });
});

describe("filterBankChanges", () => {
  it("filters gear and quantity changes", () => {
    const changes = [
      {
        kind: "changed" as const,
        item: hpot,
        deltaQ: 5,
      },
      {
        kind: "added" as const,
        item: { ...hpot, name: "sword" as ItemKey, level: 8, category: "Weapons" },
      },
    ];
    const G = {
      items: {
        hpot0: { name: "HP Potion" },
        sword: { name: "Sword", upgrade: {} },
      },
    } as any;

    expect(filterBankChanges(changes, "gear", G)).toHaveLength(1);
    expect(filterBankChanges(changes, "quantity", G)).toHaveLength(1);
  });
});

describe("computePotentialCraftCount", () => {
  it("uses the best-stocked ingredient batch count", () => {
    expect(
      computePotentialCraftCount([
        { need: 50, have: 38600 },
        { need: 3, have: 2 },
      ]),
    ).toBe(772);
  });
});

describe("computeMissingForCraftCount", () => {
  it("computes missing reagents for a target batch size", () => {
    const missing = computeMissingForCraftCount(
      [
        { key: "gem0" as ItemKey, name: "Wing", need: 50, have: 38600, missing: 0 },
        { key: "gem1" as ItemKey, name: "Slime", need: 3, have: 2, missing: 1 },
      ],
      772,
    );
    expect(missing.find((ingredient) => ingredient.key === "gem1")?.missing).toBe(772 * 3 - 2);
  });
});

describe("getBankQuantityForIngredient", () => {
  it("counts only items at the required level", () => {
    const bankData = {
      items0: [
        { name: "blade", level: 7, q: 10 },
        { name: "blade", level: 9, q: 3 },
      ],
    };

    expect(getBankQuantityForIngredient(bankData, "blade" as ItemKey, 9)).toBe(3);
    expect(getBankQuantityForIngredient(bankData, "blade" as ItemKey, 7)).toBe(10);
    expect(getBankQuantityForIngredient(bankData, "blade" as ItemKey)).toBe(0);
  });

  it("counts only open items with the required title", () => {
    const bankData = {
      items0: [
        { name: "open", p: "armorx", q: 8 },
        { name: "open", p: "gem0", q: 50 },
        { name: "open", q: 3 },
      ],
    };

    expect(
      getBankQuantityForIngredient(bankData, "open" as ItemKey, undefined, "armorx" as never),
    ).toBe(8);
    expect(
      getBankQuantityForIngredient(bankData, "open" as ItemKey, undefined, "gem0" as never),
    ).toBe(50);
    expect(getBankQuantityForIngredient(bankData, "open" as ItemKey)).toBe(61);
  });
});

describe("computeCombineCounts", () => {
  it("counts ready and potential shrine combines from bank stock", () => {
    expect(computeCombineCounts(8)).toStrictEqual({
      readyCount: 2,
      potentialCount: 3,
      missing: 1,
    });
    expect(computeCombineCounts(2)).toStrictEqual({
      readyCount: 0,
      potentialCount: 1,
      missing: 1,
    });
    expect(computeCombineCounts(9)).toStrictEqual({
      readyCount: 3,
      potentialCount: 3,
      missing: 0,
    });
  });
});

describe("computeBankSellBreakdown", () => {
  it("builds per-item sell lines from merchant buy offers and sorts by total value", () => {
    const bankItems: AggregatedBankItem[] = [
      { name: "hpot0", level: 0, q: 10, stack: 1, category: "Potions" },
      { name: "gem0", level: 0, q: 3, stack: 1, category: "Materials" },
    ];
    const merchantItems = {
      hpot0: {
        "": {
          0: {
            buying: {
              amount: 1,
              minPrice: { price: 100, merchant: "lowbuyer" },
              maxPrice: { price: 100, merchant: "lowbuyer" },
              avgPrice: 100,
              merchants: {},
            },
            selling: {
              amount: 0,
              minPrice: { price: 0 },
              maxPrice: { price: 0 },
              avgPrice: 0,
              merchants: {},
            },
          },
        },
      },
      gem0: {
        "": {
          0: {
            buying: {
              amount: 1,
              minPrice: { price: 500, merchant: "bestbuyer" },
              maxPrice: { price: 500, merchant: "bestbuyer" },
              avgPrice: 500,
              merchants: {},
            },
            selling: {
              amount: 0,
              minPrice: { price: 0 },
              maxPrice: { price: 0 },
              avgPrice: 0,
              merchants: {},
            },
          },
        },
      },
    } as any;

    const lines = computeBankSellBreakdown(bankItems, merchantItems);
    expect(lines).toHaveLength(2);
    expect(lines[0]?.item.name).toBe("gem0");
    expect(lines[0]?.unitPrice).toBe(500);
    expect(lines[0]?.merchantId).toBe("bestbuyer");
    expect(lines[0]?.priceSource).toBe("merchant");
    expect(lines[0]?.totalValue).toBe(1500);
    expect(lines[1]?.item.name).toBe("hpot0");
    expect(lines[1]?.totalValue).toBe(1000);
  });

  it("uses the highest merchant buy offer for an item", () => {
    const lines = computeBankSellBreakdown(
      [{ name: "vitbelt" as ItemKey, level: 3, q: 5, stack: 1, category: "Belts" }],
      {
        vitbelt: {
          "": {
            3: {
              buying: {
                amount: 2,
                minPrice: { price: 80, merchant: "cheap" },
                maxPrice: { price: 100, merchant: "generous" },
                avgPrice: 90,
                merchants: {},
              },
              selling: {
                amount: 0,
                minPrice: { price: 0 },
                maxPrice: { price: 0 },
                avgPrice: 0,
                merchants: {},
              },
            },
          },
        },
      } as any,
    );

    expect(lines[0]?.unitPrice).toBe(100);
    expect(lines[0]?.merchantId).toBe("generous");
    expect(lines[0]?.totalValue).toBe(500);
  });

  it("falls back to NPC gold when merchant data is missing", () => {
    const lines = computeBankSellBreakdown(
      [{ name: "sword", level: 0, q: 3, stack: 1, category: "Weapons" }],
      {},
      {
        items: {
          sword: { name: "Sword", g: 1200 },
        },
      } as any,
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]?.priceSource).toBe("npc");
    expect(lines[0]?.totalValue).toBe(2160);
  });

  it("sorts merchant buy offers before NPC-only sell values", () => {
    const lines = computeBankSellBreakdown(
      [
        { name: "sword", level: 0, q: 1, stack: 1, category: "Weapons" },
        { name: "hpot0", level: 0, q: 1, stack: 1, category: "Potions" },
      ],
      {
        hpot0: {
          "": {
            0: {
              buying: {
                amount: 1,
                minPrice: { price: 50, merchant: "buyer" },
                maxPrice: { price: 50, merchant: "buyer" },
                avgPrice: 50,
                merchants: {},
              },
              selling: {
                amount: 0,
                minPrice: { price: 0 },
                maxPrice: { price: 0 },
                avgPrice: 0,
                merchants: {},
              },
            },
          },
        },
      } as any,
      {
        items: {
          sword: { name: "Sword", g: 1000000 },
          hpot0: { name: "HP Potion", g: 100 },
        },
      } as any,
    );

    expect(lines).toHaveLength(2);
    expect(lines[0]?.item.name).toBe("hpot0");
    expect(lines[0]?.priceSource).toBe("merchant");
    expect(lines[1]?.item.name).toBe("sword");
    expect(lines[1]?.priceSource).toBe("npc");
  });
});

describe("analyzeCompoundCombines", () => {
  it("finds ready and potential compound combines", () => {
    const G = {
      items: {
        vitring: { name: "Vitality Ring", compound: { vit: 2 } },
      },
    } as any;

    const analysis = analyzeCompoundCombines(
      [{ name: "vitring", level: 0, q: 8, stack: 1, category: "Rings" }],
      G,
    );

    expect(analysis.ready).toHaveLength(1);
    expect(analysis.ready[0]?.combineReadyCount).toBe(2);
    expect(analysis.ready[0]?.effectiveHave).toBe(8);
    expect(analysis.potential).toHaveLength(2);
    expect(analysis.potential.find((step) => step.level === 0)?.potentialCombineCount).toBe(3);
    expect(analysis.potential.find((step) => step.level === 0)?.missing).toBe(1);
    expect(analysis.potential.find((step) => step.level === 1)?.potentialCombineCount).toBe(1);
  });

  it("cascades lower-level combine outputs into higher-level combines", () => {
    const G = {
      items: {
        vitring: { name: "Vitality Ring", compound: { vit: 2 } },
      },
    } as any;

    const analysis = analyzeCompoundCombines(
      [{ name: "vitring", level: 0, q: 9, stack: 1, category: "Rings" }],
      G,
    );

    expect(analysis.ready).toHaveLength(2);
    const l0 = analysis.ready.find((step) => step.level === 0);
    const l1 = analysis.ready.find((step) => step.level === 1);
    expect(l0?.combineReadyCount).toBe(3);
    expect(l1?.combineReadyCount).toBe(1);
    expect(l1?.have).toBe(0);
    expect(l1?.cascadeIn).toBe(3);
    expect(l1?.effectiveHave).toBe(3);
  });
});

describe("groupCombineSteps", () => {
  it("groups consecutive levels into one chain", () => {
    const steps = [
      {
        itemKey: "vitring" as ItemKey,
        level: 0,
        displayName: "Vitality Ring",
        have: 9,
        effectiveHave: 9,
        cascadeIn: 0,
        combineReadyCount: 3,
        potentialCombineCount: 3,
        missing: 0,
        outputLevel: 1,
      },
      {
        itemKey: "vitring" as ItemKey,
        level: 1,
        displayName: "Vitality Ring",
        have: 0,
        effectiveHave: 3,
        cascadeIn: 3,
        combineReadyCount: 1,
        potentialCombineCount: 1,
        missing: 0,
        outputLevel: 2,
      },
    ];

    expect(groupCombineSteps(steps)).toStrictEqual([steps]);
  });
});

describe("analyzeCraftRecipes", () => {
  it("returns ready and potential craft recipes from bank stock", () => {
    const G = {
      items: {
        gem0: { name: "Gem" },
        gem1: { name: "Rare Gem" },
        sword: { name: "Sword" },
        shield: { name: "Shield" },
      },
      craft: {
        sword: {
          items: [[2, "gem0"]],
          cost: 5000,
        },
        shield: {
          items: [
            [1, "gem0"],
            [1, "gem1"],
          ],
          cost: 0,
        },
      },
    } as any;

    const analysis = analyzeCraftRecipes(G, {
      items0: [
        { name: "gem0", q: 10 },
        { name: "gem1", q: 0 },
      ],
    });
    expect(analysis.ready).toHaveLength(1);
    expect(analysis.ready[0]?.craftableCount).toBe(5);
    expect(analysis.ready[0]?.craftCostPerCraft).toBe(5000);
    expect(analysis.potential).toHaveLength(1);
    expect(analysis.potential[0]?.outputKey).toBe("shield");
    expect(analysis.potential[0]?.potentialCraftCount).toBe(10);
    expect(
      analysis.potential[0]?.ingredients.find((ingredient) => ingredient.key === "gem1")?.missing,
    ).toBe(10);
  });

  it("parses leveled ingredients for craft analysis", () => {
    const G = {
      items: {
        blade: { name: "Blade", upgrade: {} },
        fsword: { name: "Fire Sword" },
      },
      craft: {
        fsword: {
          items: [[1, "blade", 9]],
          cost: 100000,
        },
      },
    } as any;

    const ready = analyzeCraftRecipes(G, {
      items0: [{ name: "blade", level: 9, q: 3 }],
    });
    expect(ready.ready).toHaveLength(1);
    expect(ready.ready[0]?.craftableCount).toBe(3);
    expect(ready.ready[0]?.ingredients[0]?.level).toBe(9);

    const almost = analyzeCraftRecipes(G, {
      items0: [{ name: "blade", level: 7, q: 10 }],
    });
    expect(almost.ready).toHaveLength(0);
    expect(almost.potential).toHaveLength(0);
  });

  it("lists ready recipes in almost when best-stocked ingredient allows more batches", () => {
    const G = {
      items: {
        gem0: { name: "Gem A" },
        gem1: { name: "Gem B" },
        box: { name: "Festive Box" },
      },
      craft: {
        box: {
          items: [
            [1, "gem0"],
            [1, "gem1"],
          ],
          cost: 1200,
        },
      },
    } as any;

    const analysis = analyzeCraftRecipes(G, {
      items0: [
        { name: "gem0", q: 80 },
        { name: "gem1", q: 8 },
      ],
    });

    expect(analysis.ready).toHaveLength(1);
    expect(analysis.ready[0]?.craftableCount).toBe(8);
    expect(analysis.potential).toHaveLength(1);
    expect(analysis.potential[0]?.outputKey).toBe("box");
    expect(analysis.potential[0]?.craftableCount).toBe(8);
    expect(analysis.potential[0]?.potentialCraftCount).toBe(80);
    expect(
      analysis.potential[0]?.ingredients.find((ingredient) => ingredient.key === "gem1")?.missing,
    ).toBe(72);
  });

  it("lists xbox in almost when a titled open ingredient allows more batches", () => {
    const G = {
      items: {
        open: { name: "Open" },
        harbringer: { name: "Harbinger" },
        t2quiver: { name: "T2 Quiver" },
        orboftemporal: { name: "Orb of Temporal" },
        xbox: { name: "Xmas Box" },
      },
      craft: {
        xbox: {
          items: [
            [1, "open", "armorx"],
            [1, "harbringer"],
            [1, "t2quiver"],
            [0.1, "orboftemporal"],
          ],
          cost: 1200,
        },
      },
    } as any;

    const analysis = analyzeCraftRecipes(G, {
      items0: [
        { name: "open", p: "armorx", q: 8 },
        { name: "open", p: "gem0", q: 100 },
        { name: "harbringer", q: 8 },
        { name: "t2quiver", q: 8 },
        { name: "orboftemporal", q: 1 },
      ],
    });

    expect(analysis.ready).toHaveLength(1);
    expect(analysis.ready[0]?.craftableCount).toBe(8);
    expect(analysis.potential.some((recipe) => recipe.outputKey === "xbox")).toBe(true);
    const xboxPotential = analysis.potential.find((recipe) => recipe.outputKey === "xbox");
    expect(xboxPotential?.potentialCraftCount).toBe(10);
    expect(xboxPotential?.craftableCount).toBe(8);
  });
});
