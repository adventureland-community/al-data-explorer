import { groupItemsByNameAndLevel } from "../useMerchants";
import type { Merchant } from "../merchantTypes";
import { instanceVariantKey } from "../../gameData/itemInstanceData";
import { splitMarketOffers } from "../marketOfferRows";

describe("groupItemsByNameAndLevel", () => {
  it("does not merge cxjar listings with different data", () => {
    const merchants = [
      {
        id: "Alice",
        lastSeen: new Date().toISOString(),
        map: "main",
        serverIdentifier: "I",
        serverRegion: "EU",
        x: 0,
        y: 0,
        slots: {
          trade1: { name: "cxjar", q: 2, data: "breyes", price: 1000 },
          trade2: { name: "cxjar", q: 1, data: "bathat", price: 2000 },
        },
      },
    ] as unknown as Merchant[];

    const grouped = groupItemsByNameAndLevel(merchants);
    const byVariant = grouped.cxjar ?? {};
    const breyesKey = instanceVariantKey({ data: "breyes" });
    const bathatKey = instanceVariantKey({ data: "bathat" });

    expect(byVariant[breyesKey]?.[0]?.selling.amount).toBe(2);
    expect(byVariant[bathatKey]?.[0]?.selling.amount).toBe(1);
    expect(Object.keys(byVariant)).toHaveLength(2);
  });

  it("computes qty-weighted avg and indexes official want barters", () => {
    const merchants = [
      {
        id: "RellMer",
        lastSeen: new Date().toISOString(),
        map: "main",
        serverIdentifier: "I",
        serverRegion: "US",
        x: 0,
        y: 0,
        slots: {
          trade1: { name: "suckerpunch", level: 0, price: 1_200_000_000, q: 1 },
          trade2: { name: "suckerpunch", level: 0, want: { name: "fallen" } },
          trade3: { name: "suckerpunch", level: 0, want: { name: "dartgun", level: 6 } },
        },
      },
      {
        id: "buffett",
        lastSeen: new Date().toISOString(),
        map: "main",
        serverIdentifier: "I",
        serverRegion: "US",
        x: 1,
        y: 1,
        slots: {
          trade1: { name: "cxjar", q: 1, data: "hairdo608", want: { name: "suckerpunch" } },
        },
      },
    ] as unknown as Merchant[];

    const grouped = groupItemsByNameAndLevel(merchants);
    const punch = grouped.suckerpunch?.[instanceVariantKey({})]?.[0];
    expect(punch).toBeDefined();
    expect(punch!.selling.goldOfferCount).toBe(1);
    expect(punch!.selling.wantOfferCount).toBe(2);
    expect(punch!.selling.avgPrice).toBe(1_200_000_000);
    expect(punch!.wantedBy).toHaveLength(1);
    expect(punch!.wantedBy[0].merchantName).toBe("buffett");

    const offers = splitMarketOffers(punch!);
    expect(offers.sellGold).toHaveLength(1);
    expect(offers.outgoingWant).toHaveLength(2);
    expect(offers.incomingWant).toHaveLength(1);
    expect(offers.incomingWant[0].item.name).toBe("cxjar");
  });

  it("combines identical gold slots from one merchant when splitting offers", () => {
    const merchants = [
      {
        id: "merchBot",
        lastSeen: new Date().toISOString(),
        map: "main",
        serverIdentifier: "I",
        serverRegion: "US",
        x: 0,
        y: 0,
        slots: {
          trade1: { name: "suckerpunch", level: 0, price: 3_300_000_000, q: 1 },
          trade2: { name: "suckerpunch", level: 0, price: 3_300_000_000, q: 1 },
          trade3: { name: "suckerpunch", level: 0, price: 3_300_000_000, q: 1 },
        },
      },
    ] as unknown as Merchant[];

    const grouped = groupItemsByNameAndLevel(merchants);
    const punch = grouped.suckerpunch?.[instanceVariantKey({})]?.[0];
    const offers = splitMarketOffers(punch!);
    expect(offers.sellGold).toHaveLength(1);
    expect(offers.sellGold[0].quantity).toBe(3);
    expect(offers.sellGold[0].slotCount).toBe(3);
    expect(offers.sellGold[0].merchantName).toBe("merchBot");
  });
});
