import { marketRowMatchesSearch, parseMarketSearchQuery } from "../marketSearchQuery";
import { BuySellItemPrices } from "../merchantTypes";
import { listingKey } from "../../Trades/tradeViewModel";

function emptyPrices(): BuySellItemPrices {
  return {
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
      goldValueSum: 100,
      goldQty: 1,
      goldOfferCount: 1,
      wantOfferCount: 0,
      minPrice: { price: 100 },
      maxPrice: { price: 100 },
      avgPrice: 100,
      merchants: { Bob: { merchant: { id: "Bob", lastSeen: "" }, items: [] } },
    },
    wantedBy: [],
  };
}

describe("market search sucker", () => {
  it("parses free text", () => {
    expect(parseMarketSearchQuery("sucker")).toStrictEqual({
      groups: [[{ kind: "text", value: "sucker" }]],
    });
  });

  it("matches suckerpunch and not armorscroll by name alone", () => {
    const punch = {
      itemName: "suckerpunch" as const,
      title: "",
      level: 0,
      prices: emptyPrices(),
    };
    const scroll = {
      itemName: "armorscroll" as const,
      title: "",
      level: 0,
      prices: emptyPrices(),
    };
    expect(marketRowMatchesSearch(punch, undefined, "sucker")).toBe(true);
    expect(marketRowMatchesSearch(scroll, undefined, "sucker")).toBe(false);
    // Single-letter needles still hit name substrings ("armorscroll" contains "s").
    expect(marketRowMatchesSearch(scroll, undefined, "s")).toBe(true);
    expect(marketRowMatchesSearch(scroll, undefined, "armor")).toBe(true);
  });

  it("normalizes omitted bank level to 0 in listingKey", () => {
    expect(listingKey({ name: "suckerpunch", level: undefined })).toBe(
      listingKey({ name: "suckerpunch", level: 0 }),
    );
    expect(listingKey({ name: "armorscroll" })).toBe("armorscroll|0|");
  });
});
