import {
  combineGoldOffers,
  listedTradesToOffers,
  preferStandOverEarthGold,
  splitMarketOffers,
  wantTradeSides,
  type GoldOfferRow,
} from "../marketOfferRows";
import { emptyBuySellPrices } from "../useMerchants";
import type { BuySellItemPrices, MerchantTradeItem } from "../merchantTypes";
import type { TradeRow } from "../../Trades/tradeViewModel";

function goldRow(
  merchantName: string,
  price: number,
  quantity: number,
  id: string,
  source: "stand" | "earth" = "stand",
): GoldOfferRow {
  return {
    id,
    merchantName,
    price,
    quantity,
    slotCount: 1,
    source,
    item: { name: "suckerpunch", price, q: quantity } as MerchantTradeItem,
  };
}

describe("marketOfferRows", () => {
  it("combines same merchant + same price stand slots", () => {
    const combined = combineGoldOffers([
      goldRow("merchBot", 3_300_000_000, 1, "a"),
      goldRow("merchBot", 3_300_000_000, 1, "b"),
      goldRow("merchBot", 3_300_000_000, 1, "c"),
      goldRow("other", 3_300_000_000, 1, "d"),
    ]);
    expect(combined).toHaveLength(2);
    const bot = combined.find((r) => r.merchantName === "merchBot");
    expect(bot?.quantity).toBe(3);
    expect(bot?.slotCount).toBe(3);
    expect(bot?.price).toBe(3_300_000_000);
  });

  it("does not merge stand and earth gold even at the same price", () => {
    const combined = combineGoldOffers([
      goldRow("Bob", 1_000_000, 1, "s", "stand"),
      goldRow("Bob", 1_000_000, 2, "e", "earth"),
    ]);
    expect(combined).toHaveLength(2);
  });

  it("hides Earth gold when the same merchant already has that price on a stand", () => {
    const filtered = preferStandOverEarthGold([
      goldRow("EagleSell", 1_100_000_000, 1, "s", "stand"),
      goldRow("EagleSell", 1_100_000_000, 1, "e", "earth"),
      goldRow("EagleSell", 1_200_000_000, 1, "e2", "earth"),
      goldRow("Other", 1_100_000_000, 1, "eo", "earth"),
    ]);
    expect(filtered).toHaveLength(3);
    expect(filtered.find((r) => r.id === "e")).toBeUndefined();
    expect(filtered.find((r) => r.id === "e2")?.price).toBe(1_200_000_000);
    expect(filtered.find((r) => r.merchantName === "Other")?.source).toBe("earth");
  });

  it("splitMarketOffers drops Earth sell when stand already lists the same ask", () => {
    const prices: BuySellItemPrices = {
      ...emptyBuySellPrices(),
      selling: {
        ...emptyBuySellPrices().selling,
        merchants: {
          EagleSell: {
            items: [{ name: "suckerpunch", price: 1_100_000_000, q: 1 } as MerchantTradeItem],
          },
        },
      },
    };
    const listed = [
      {
        owner: "eagle",
        ownerLabel: "EagleSell",
        side: "WTS",
        listing: { name: "suckerpunch", level: 0 },
        tradeSide: { price: 1_100_000_000, quantity: 1 },
      },
    ] as TradeRow[];

    const offers = splitMarketOffers(prices, listed, { name: "suckerpunch", level: 0 });
    expect(offers.sellGold).toHaveLength(1);
    expect(offers.sellGold[0]).toMatchObject({
      merchantName: "EagleSell",
      price: 1_100_000_000,
      source: "stand",
    });
  });

  it("renders incoming want as offered item → viewed item (not viewed→viewed)", () => {
    const prices: BuySellItemPrices = {
      ...emptyBuySellPrices(),
      wantedBy: [
        {
          merchantName: "buffett",
          offered: {
            name: "cxjar",
            q: 1,
            data: "hairdo608",
            want: { name: "suckerpunch" },
          } as MerchantTradeItem,
          want: { name: "suckerpunch" },
        },
      ],
    };
    const { incomingWant } = splitMarketOffers(prices);
    expect(incomingWant).toHaveLength(1);
    const sides = wantTradeSides(incomingWant[0], { name: "suckerpunch", level: 0 });
    expect(sides).not.toBeNull();
    expect(sides!.give.name).toBe("cxjar");
    expect(sides!.receive.name).toBe("suckerpunch");
  });

  it("merges Earth gold WTS/WTB into buy/sell and item trades into want panels", () => {
    const listed = [
      {
        owner: "o1",
        ownerLabel: "PillsHere",
        side: "WTS",
        listing: { name: "suckerpunch", level: 0 },
        tradeSide: { price: 1_300_000_000, quantity: 1 },
      },
      {
        owner: "o2",
        ownerLabel: "BuyerBob",
        side: "WTB",
        listing: { name: "suckerpunch", level: 0 },
        tradeSide: { price: 900_000_000, quantity: 2 },
      },
      {
        owner: "o3",
        ownerLabel: "BarterAnn",
        side: "WTS",
        listing: { name: "suckerpunch", level: 0 },
        tradeSide: {
          trades: [{ item: { name: "fallen" }, give: 1, receive: 1 }],
        },
      },
      {
        owner: "o4",
        ownerLabel: "BarterBen",
        side: "WTB",
        listing: { name: "suckerpunch", level: 0 },
        tradeSide: {
          trades: [{ item: { name: "tshirt9" }, give: 1, receive: 2 }],
        },
      },
    ] as TradeRow[];

    const earth = listedTradesToOffers(listed, { name: "suckerpunch", level: 0 });
    expect(earth.sellGold).toHaveLength(1);
    expect(earth.sellGold[0]).toMatchObject({
      merchantName: "PillsHere",
      price: 1_300_000_000,
      source: "earth",
    });
    expect(earth.buyGold).toHaveLength(1);
    expect(earth.buyGold[0]).toMatchObject({
      merchantName: "BuyerBob",
      price: 900_000_000,
      quantity: 2,
      source: "earth",
    });
    expect(earth.outgoingWant).toHaveLength(1);
    expect(earth.outgoingWant[0].item.want?.name).toBe("fallen");
    expect(earth.outgoingWant[0].source).toBe("earth");
    expect(earth.incomingWant).toHaveLength(1);
    expect(earth.incomingWant[0].item.name).toBe("tshirt9");
    expect(earth.incomingWant[0].source).toBe("earth");

    const merged = splitMarketOffers(emptyBuySellPrices(), listed, {
      name: "suckerpunch",
      level: 0,
    });
    expect(merged.sellGold.some((r) => r.source === "earth")).toBe(true);
    expect(merged.buyGold.some((r) => r.source === "earth")).toBe(true);
    expect(merged.outgoingWant.some((r) => r.source === "earth")).toBe(true);
    expect(merged.incomingWant.some((r) => r.source === "earth")).toBe(true);
  });
});
