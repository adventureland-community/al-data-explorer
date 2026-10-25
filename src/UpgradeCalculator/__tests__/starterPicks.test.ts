import { ItemKey } from "typed-adventureland";

import { BuySellItemPrices, ItemPrices, ItemsByNameTitleLevel } from "../../Market/merchantTypes";
import { buildStarterPicks, marketActivityScore, sampleKeys } from "../starterPicks";

function emptySide(): ItemPrices {
  return {
    amount: 0,
    minPrice: { price: 0 },
    maxPrice: { price: 0 },
    avgPrice: 0,
    merchants: {},
  };
}

function pricesWith(opts: {
  buyers?: string[];
  sellers?: string[];
  buyAmount?: number;
  sellAmount?: number;
}): BuySellItemPrices {
  const buying = emptySide();
  const selling = emptySide();
  for (const id of opts.buyers ?? []) {
    buying.merchants[id] = { merchant: { id, lastSeen: "" }, items: [] };
  }
  for (const id of opts.sellers ?? []) {
    selling.merchants[id] = { merchant: { id, lastSeen: "" }, items: [] };
  }
  buying.amount = opts.buyAmount ?? Object.keys(buying.merchants).length;
  selling.amount = opts.sellAmount ?? Object.keys(selling.merchants).length;
  return { buying, selling };
}

describe("marketActivityScore", () => {
  it("sums merchants and listed amounts across titles and levels", () => {
    const items: ItemsByNameTitleLevel = {
      fireblade: {
        "": [
          pricesWith({ buyers: ["a"], sellers: ["b", "c"], buyAmount: 2, sellAmount: 3 }),
          pricesWith({ sellers: ["d"], sellAmount: 1 }),
        ],
      },
    };
    // buyers 1 + sellers 2 + amounts 5, then sellers 1 + amount 1
    expect(marketActivityScore(items, "fireblade" as ItemKey)).toBe(1 + 2 + 2 + 3 + 1 + 1);
  });

  it("returns 0 for missing items", () => {
    expect(marketActivityScore({}, "missing" as ItemKey)).toBe(0);
  });
});

describe("sampleKeys", () => {
  it("returns a deterministic subset with a fixed rng", () => {
    const pool = ["a", "b", "c", "d", "e"] as unknown as ItemKey[];
    let i = 0;
    const seq = [0, 0, 0, 0, 0];
    const rng = () => seq[i++] ?? 0;
    expect(sampleKeys(pool, 3, rng)).toStrictEqual(["a", "b", "c"]);
  });

  it("does not mutate the pool", () => {
    const pool = ["a", "b", "c"] as unknown as ItemKey[];
    sampleKeys(pool, 2, () => 0.9);
    expect(pool).toStrictEqual(["a", "b", "c"]);
  });
});

describe("buildStarterPicks", () => {
  const available = [
    "helmet",
    "shoes",
    "coat",
    "pants",
    "gloves",
    "shield",
  ] as unknown as ItemKey[];

  it("keeps recent order and excludes them from market and random", () => {
    const marketItems = {
      shoes: { "": [pricesWith({ sellers: ["s1"], sellAmount: 5 })] },
      coat: { "": [pricesWith({ sellers: ["s1", "s2"], sellAmount: 10 })] },
      pants: { "": [pricesWith({ buyers: ["b1"], buyAmount: 1 })] },
    } as unknown as ItemsByNameTitleLevel;
    const picks = buildStarterPicks({
      available,
      recent: ["shoes", "helmet", "ghost"] as unknown as ItemKey[],
      marketItems,
      recentLimit: 4,
      marketLimit: 4,
      randomLimit: 2,
      rng: () => 0,
    });

    expect(picks.recent).toStrictEqual(["shoes", "helmet"]);
    expect(picks.market).toStrictEqual(["coat", "pants"]);
    expect(picks.random).toStrictEqual(["gloves", "shield"]);
    expect(picks.market).not.toContain("shoes");
  });

  it("skips market rows with zero activity", () => {
    const picks = buildStarterPicks({
      available,
      recent: [],
      marketItems: {},
      marketLimit: 4,
      randomLimit: 3,
      rng: () => 0,
    });
    expect(picks.market).toStrictEqual([]);
    expect(picks.random).toHaveLength(3);
  });

  it("ranks market by activity then key", () => {
    const marketItems = {
      gloves: { "": [pricesWith({ sellers: ["a"], sellAmount: 1 })] },
      coat: { "": [pricesWith({ sellers: ["a", "b"], sellAmount: 2 })] },
      pants: { "": [pricesWith({ sellers: ["a", "b"], sellAmount: 2 })] },
    } as unknown as ItemsByNameTitleLevel;
    const picks = buildStarterPicks({
      available,
      recent: [],
      marketItems,
      marketLimit: 3,
      randomLimit: 0,
      rng: () => 0,
    });
    // coat and pants tie on score; coat comes first alphabetically
    expect(picks.market).toStrictEqual(["coat", "pants", "gloves"]);
  });
});
