import { ItemKey } from "typed-adventureland";

import { instanceVariantKey } from "../itemInstanceData";
import { GItems, NpcShopSource } from "../types";
import { isGoldVendorBuyable, marketSellMinPrice, seedMissingPrices } from "../upgradePrices";

const PLAIN = instanceVariantKey({});

describe("isGoldVendorBuyable", () => {
  const items = {
    staff: { type: "weapon", name: "Staff", g: 2 },
    spidersilk: { type: "material", name: "Spider Silk", g: 1000 },
    shellitem: { type: "material", name: "Shell", g: 1, cash: 5 },
  } as unknown as GItems;

  it("requires a gold NPC shelf and positive .g", () => {
    const shops = new Map<ItemKey, NpcShopSource[]>([
      ["staff" as ItemKey, [{ npcId: "weapons", role: "merchant", name: "Weapons", token: null }]],
    ]);
    expect(isGoldVendorBuyable("staff", shops, items)).toBe(true);
    expect(isGoldVendorBuyable("spidersilk", shops, items)).toBe(false);
  });

  it("rejects token shops and shell (cash) items", () => {
    const shops = new Map<ItemKey, NpcShopSource[]>([
      [
        "spidersilk" as ItemKey,
        [{ npcId: "exchange", role: "token", name: "Tokens", token: "funtoken" }],
      ],
      [
        "shellitem" as ItemKey,
        [{ npcId: "shells", role: "merchant", name: "Shells", token: null }],
      ],
    ]);
    expect(isGoldVendorBuyable("spidersilk", shops, items)).toBe(false);
    expect(isGoldVendorBuyable("shellitem", shops, items)).toBe(false);
  });
});

describe("seedMissingPrices", () => {
  const items = {
    staff: { type: "weapon", name: "Staff", g: 2 },
    spidersilk: { type: "material", name: "Spider Silk", g: 1000 },
  } as unknown as GItems;

  const shops = new Map<ItemKey, NpcShopSource[]>([
    ["staff" as ItemKey, [{ npcId: "weapons", role: "merchant", name: "Weapons", token: null }]],
  ]);

  const market = {
    spidersilk: {
      [PLAIN]: [{ selling: { minPrice: { price: 1_000_000 } } }],
    },
    staff: {
      [PLAIN]: [{ selling: { minPrice: { price: 50_000 } } }],
    },
  };

  it("fills missing keys with market then catalog .g", () => {
    const prices = seedMissingPrices({
      prices: {},
      keys: ["spidersilk", "staff"],
      items,
      market,
      shopsByItem: shops,
    });
    expect(prices.spidersilk).toBe(1_000_000);
    expect(prices.staff).toBe(50_000);
  });

  it("does not overwrite existing prices by default", () => {
    const prices = seedMissingPrices({
      prices: { spidersilk: 1000 },
      keys: ["spidersilk"],
      items,
      market,
      shopsByItem: shops,
    });
    expect(prices.spidersilk).toBe(1000);
  });

  it("preferMarketForNonVendor replaces catalog .g with market for non-vendor keys", () => {
    const prices = seedMissingPrices({
      prices: { spidersilk: 1000, staff: 2 },
      keys: ["spidersilk", "staff"],
      items,
      market,
      shopsByItem: shops,
      preferMarketForNonVendor: true,
    });
    expect(prices.spidersilk).toBe(1_000_000);
    expect(prices.staff).toBe(2);
  });

  it("preferMarketForNonVendor leaves vendor shelf prices alone even when market is cheaper", () => {
    const prices = seedMissingPrices({
      prices: { staff: 2 },
      keys: ["staff"],
      items,
      market,
      shopsByItem: shops,
      preferMarketForNonVendor: true,
    });
    expect(prices.staff).toBe(2);
  });
});

describe("marketSellMinPrice", () => {
  it("reads untitled level-0 sell min", () => {
    const market = {
      rod: { [PLAIN]: [{ selling: { minPrice: { price: 42 } } }] },
    };
    expect(marketSellMinPrice(market, "rod")).toBe(42);
    expect(marketSellMinPrice(market, "missing")).toBeUndefined();
  });
});
