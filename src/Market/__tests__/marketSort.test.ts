import type { ItemKey } from "typed-adventureland";

import {
  compareMarketRows,
  defaultDirectionFor,
  nextMarketSort,
  sortMarketRows,
  type MarketSortRow,
} from "../marketSort";
import type { BuySellItemPrices, ItemPrices } from "../merchantTypes";

function emptySide(): ItemPrices {
  return {
    amount: 0,
    goldValueSum: 0,
    goldQty: 0,
    goldOfferCount: 0,
    wantOfferCount: 0,
    minPrice: { price: 0 },
    maxPrice: { price: 0 },
    avgPrice: 0,
    merchants: {},
  };
}

function prices(partial: {
  buyMin?: number;
  sellMin?: number;
  buyMerchants?: string[];
  sellMerchants?: string[];
}): BuySellItemPrices {
  const buying = emptySide();
  const selling = emptySide();
  const buyNames = partial.buyMerchants ?? (partial.buyMin != null ? ["buyer"] : []);
  const sellNames = partial.sellMerchants ?? (partial.sellMin != null ? ["seller"] : []);

  for (const name of buyNames) {
    buying.merchants[name] = {
      merchant: { id: name, lastSeen: "" },
      items: [],
    };
  }
  for (const name of sellNames) {
    selling.merchants[name] = {
      merchant: { id: name, lastSeen: "" },
      items: [],
    };
  }
  if (partial.buyMin != null) {
    buying.minPrice = { price: partial.buyMin, merchant: "buyer" };
    buying.amount = 1;
  }
  if (partial.sellMin != null) {
    selling.minPrice = { price: partial.sellMin, merchant: "seller" };
    selling.amount = 1;
  }
  return { buying, selling, wantedBy: [] };
}

function row(
  itemName: string,
  opts: {
    sellMin?: number;
    buyMin?: number;
    title?: string;
    level?: number;
  } = {},
): MarketSortRow {
  return {
    itemName: itemName as ItemKey,
    title: opts.title ?? "",
    level: opts.level ?? 0,
    prices: prices({ sellMin: opts.sellMin, buyMin: opts.buyMin }),
  };
}

describe("marketSort", () => {
  it("defaults price columns to desc and name to asc", () => {
    expect(defaultDirectionFor("name")).toBe("asc");
    expect(defaultDirectionFor("sellMin")).toBe("desc");
  });

  it("toggles direction on the same key", () => {
    expect(nextMarketSort({ key: "sellMin", direction: "desc" }, "sellMin")).toStrictEqual({
      key: "sellMin",
      direction: "asc",
    });
  });

  it("sorts selling min high to low and keeps missing sellers last", () => {
    const rows = [
      row("cheap", { sellMin: 100 }),
      row("nosell", { buyMin: 50 }),
      row("pricey", { sellMin: 5_000_000 }),
      row("mid", { sellMin: 10_000 }),
    ];

    const sorted = sortMarketRows(rows, { key: "sellMin", direction: "desc" });
    expect(sorted.map((r) => r.itemName)).toStrictEqual(["pricey", "mid", "cheap", "nosell"]);
  });

  it("falls back to name when sell mins match", () => {
    const a = row("boots", { sellMin: 1000 });
    const b = row("armor", { sellMin: 1000 });
    expect(compareMarketRows(a, b, { key: "sellMin", direction: "desc" })).toBeGreaterThan(0);
  });
});
