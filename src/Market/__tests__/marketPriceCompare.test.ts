import {
  barterGoldCompare,
  barterValueSplit,
  estimateItemGold,
  estimateSourceLabel,
  formatCalcGoldRange,
  formatPct,
  formatSignedGold,
  goldVsBest,
  isParkingGoldPrice,
  itemCalcUnitRange,
  itemNpcUnitGold,
  leadAskPrice,
  marketUnitAsk,
  PARKING_GOLD,
} from "../marketPriceCompare";
import type { ItemsByNameTitleLevel } from "../merchantTypes";

describe("parking asks", () => {
  it("treats ~100G (incl. just-under display rounding) as parking", () => {
    expect(isParkingGoldPrice(PARKING_GOLD)).toBe(true);
    expect(isParkingGoldPrice(99_999_999_999)).toBe(true);
    expect(isParkingGoldPrice(100_000_000_000)).toBe(true);
    expect(isParkingGoldPrice(98_000_000_000)).toBe(false);
    expect(isParkingGoldPrice(1_100_000_000)).toBe(false);
  });

  it("picks the first non-parking ask as lead", () => {
    expect(
      leadAskPrice([
        { price: 1_100_000_000 },
        { price: 100_000_000_000 },
        { price: 1_200_000_000 },
      ]),
    ).toBe(1_100_000_000);
    expect(leadAskPrice([{ price: 100_000_000_000 }, { price: 200_000_000_000 }])).toBe(
      100_000_000_000,
    );
  });
});

describe("goldVsBest", () => {
  it("marks best bid with zero diff", () => {
    expect(goldVsBest(1_000_000, 1_000_000)).toStrictEqual({
      diff: 0,
      pct: 0,
      isBest: true,
    });
  });

  it("shows how far below the top bid", () => {
    expect(goldVsBest(800_000, 1_000_000)).toStrictEqual({
      diff: -200_000,
      pct: -20,
      isBest: false,
    });
  });

  it("shows how far above the best ask", () => {
    expect(goldVsBest(1_200_000, 1_000_000)).toStrictEqual({
      diff: 200_000,
      pct: 20,
      isBest: false,
    });
  });
});

describe("estimateItemGold / calc", () => {
  const G = {
    items: {
      scroll0: { g: 200 },
      scroll1: { g: 400 },
      scroll2: { g: 1200 },
      scroll3: { g: 6400 },
      scroll4: { g: 50_000_000_000 },
      cscroll0: { g: 240 },
      offeringp: { g: 2_500_000 },
      offering: { g: 10_000_000 },
      offeringx: { g: 650_000_000 },
      blade: { g: 10000, upgrade: { attack: 10 }, igrace: 1, grades: [9, 10, 11, 12] },
      gemfragment: { g: 500 },
      // Flat items (no upgrade/compound) — used to assert Calc stays empty.
      cxjar: { g: 1, type: "jar" },
      suckerpunch: { g: 3_200_000 },
    },
  } as never;

  const market = {
    blade: {
      "\0": [
        {
          buying: {
            amount: 0,
            goldValueSum: 0,
            goldQty: 0,
            goldOfferCount: 0,
            wantOfferCount: 0,
            minPrice: { price: 0 },
            maxPrice: { price: 50_000 },
            avgPrice: 0,
            merchants: {},
          },
          selling: {
            amount: 0,
            goldValueSum: 0,
            goldQty: 0,
            goldOfferCount: 0,
            wantOfferCount: 0,
            minPrice: { price: 80_000 },
            maxPrice: { price: 0 },
            avgPrice: 0,
            merchants: {},
          },
          wantedBy: [],
        },
      ],
    },
  } as ItemsByNameTitleLevel;

  it("prefers market ask over calc", () => {
    expect(estimateItemGold({ name: "blade", level: 0, q: 2 }, { market, G })).toStrictEqual({
      gold: 160_000,
      source: "market-ask",
    });
  });

  it("ignores parking asks when valuing items for barters", () => {
    const parkedOnly = {
      gemfragment: {
        "\0": [
          {
            buying: {
              amount: 0,
              goldValueSum: 0,
              goldQty: 0,
              goldOfferCount: 0,
              wantOfferCount: 0,
              minPrice: { price: 0 },
              maxPrice: { price: 0 },
              avgPrice: 0,
              merchants: {},
            },
            selling: {
              amount: 1,
              goldValueSum: 100_000_000_000,
              goldQty: 1,
              goldOfferCount: 1,
              wantOfferCount: 0,
              minPrice: { price: 100_000_000_000 },
              maxPrice: { price: 100_000_000_000 },
              avgPrice: 100_000_000_000,
              merchants: {
                ParkMerch: {
                  merchant: { id: "p", lastSeen: "" },
                  items: [{ name: "gemfragment", price: 100_000_000_000, q: 1 }],
                },
              },
            },
            wantedBy: [],
          },
        ],
      },
    } as ItemsByNameTitleLevel;

    expect(marketUnitAsk(parkedOnly, { name: "gemfragment", level: 0 })).toBeUndefined();
    // Parking-only asks are ignored; no NPC/catalog fallback.
    expect(
      estimateItemGold({ name: "gemfragment", level: 0, q: 1 }, { market: parkedOnly, G }),
    ).toBeUndefined();
  });

  it("does not use NPC or catalog for calc estimates", () => {
    expect(estimateItemGold({ name: "gemfragment", level: 0, q: 1 }, { G })).toBeUndefined();
    expect(estimateSourceLabel("calc")).toBe("upgrade/compound calc");
  });

  it("splits barter market value from calc", () => {
    const split = barterValueSplit(
      {
        give: { name: "blade", level: 0, q: 1 },
        receive: { name: "gemfragment", level: 0, q: 10 },
      },
      { market, G, light: false },
    );
    // blade has a market ask; gemfragment does not → partial Value, no market Diff.
    expect(split.market.compare).toBeNull();
    expect(split.market.give?.source).toBe("market-ask");
    expect(split.market.receive).toBeUndefined();
    // Flat / +0 items have no upgrade EV → no Calc pair.
    expect(split.calc).toBeNull();
  });

  it("skips Calc for items that cannot upgrade or compound", () => {
    expect(estimateItemGold({ name: "gemfragment", level: 0, q: 1 }, { G })).toBeUndefined();
    expect(
      estimateItemGold({ name: "cxjar", level: 0, q: 1, data: "hairdo608" }, { G }),
    ).toBeUndefined();
    // Upgradeable base, but +0 has no upgrade-path EV.
    expect(estimateItemGold({ name: "blade", level: 0, q: 1 }, { G })).toBeUndefined();
    const split = barterValueSplit(
      {
        give: { name: "cxjar", level: 0, q: 1, data: "hairdo608" },
        receive: { name: "suckerpunch", level: 0, q: 1 },
      },
      { G, light: false },
    );
    expect(split.calc).toBeNull();
  });

  it("falls back to upgrade-path mid between cheapest and fewest", () => {
    const range = itemCalcUnitRange({ name: "blade", level: 3 }, { G });
    expect(range?.kind).toBe("upgrade-path");
    if (range?.kind !== "upgrade-path") throw new Error("expected upgrade-path");
    expect(range.cheapest).not.toBeNull();
    expect(range.fewest).not.toBeNull();
    expect(range.high).toBeGreaterThanOrEqual(range.low);
    expect(estimateItemGold({ name: "blade", level: 3 }, { G })).toStrictEqual({
      gold: (range.low + range.high) / 2,
      source: "calc",
    });
  });

  it("uses NPC point range for non-upgraded items", () => {
    const npc = itemNpcUnitGold({ name: "gemfragment", level: 0 }, G);
    expect(npc).toBe(300);
    expect(itemCalcUnitRange({ name: "gemfragment", level: 0 }, { G })).toStrictEqual({
      kind: "npc",
      low: 300,
      high: 300,
    });
  });

  it("values barter sides only when both have market or upgrade calc", () => {
    const compare = barterGoldCompare(
      {
        give: { name: "blade", level: 0, q: 1 },
        receive: { name: "gemfragment", level: 0, q: 10 },
      },
      { market, G },
    );
    // give has market; receive has neither market nor upgrade EV.
    expect(compare).toBeNull();
  });
});

describe("format helpers", () => {
  it("formats signed gold, pct, and calc ranges", () => {
    expect(formatSignedGold(-200_000)).toBe("−200k");
    expect(formatSignedGold(0)).toBe("0");
    expect(formatPct(-20)).toBe("−20%");
    expect(formatPct(12.34)).toBe("+12.3%");
    expect(formatCalcGoldRange(1_000_000, 1_000_000)).toBe("1M");
    expect(formatCalcGoldRange(12_000_000, 48_000_000)).toBe("12M–48M");
  });
});
