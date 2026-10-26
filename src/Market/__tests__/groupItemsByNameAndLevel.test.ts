import { groupItemsByNameAndLevel } from "../useMerchants";
import type { Merchant } from "../merchantTypes";
import { instanceVariantKey } from "../../gameData/itemInstanceData";

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
});
