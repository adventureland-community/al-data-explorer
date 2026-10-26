import { GItem, ItemKey } from "typed-adventureland";

import {
  buildItemUpgradeSnapshot,
  buildUpgradeCalcHref,
  itemUpgradeMode,
} from "../itemUpgradeSnapshot";
import { PriceTable } from "../upgradePrices";
import { GItems } from "../types";

const ITEMS = {
  blade: { upgrade: true, g: 1000, igrace: 1, grades: [9, 10, 11, 12] } as unknown as GItem,
  helmet: {
    upgrade: true,
    g: 3200,
    igrace: 1,
    stat: 1,
    grades: [7, 9, 10, 12],
  } as unknown as GItem,
  hpamulet: { compound: true, g: 3200, igrace: 1, grades: [9, 10, 11, 12] } as unknown as GItem,
  scroll0: { g: 100 } as unknown as GItem,
  scroll1: { g: 400 } as unknown as GItem,
  scroll2: { g: 1600 } as unknown as GItem,
  scroll3: { g: 6400 } as unknown as GItem,
  scroll4: { g: 50_000_000_000 } as unknown as GItem,
  cscroll0: { g: 100 } as unknown as GItem,
  cscroll1: { g: 400 } as unknown as GItem,
  cscroll2: { g: 1600 } as unknown as GItem,
  cscroll3: { g: 6400 } as unknown as GItem,
  offeringp: { g: 2_500_000 } as unknown as GItem,
  offering: { g: 10_000_000 } as unknown as GItem,
  offeringx: { g: 650_000_000 } as unknown as GItem,
  strscroll: { g: 8000 } as unknown as GItem,
} as GItems;

const PRICES: PriceTable = {
  blade: 1000,
  helmet: 3200,
  hpamulet: 3200,
  scroll0: 100,
  scroll1: 400,
  scroll2: 1600,
  scroll3: 6400,
  scroll4: 50_000_000_000,
  cscroll0: 100,
  cscroll1: 400,
  cscroll2: 1600,
  cscroll3: 6400,
  offeringp: 2_500_000,
  offering: 10_000_000,
  offeringx: 650_000_000,
  strscroll: 8000,
};

describe("itemUpgradeSnapshot", () => {
  it("detects upgrade vs compound mode", () => {
    expect(itemUpgradeMode(ITEMS.blade)).toBe("upgrade");
    expect(itemUpgradeMode(ITEMS.hpamulet)).toBe("compound");
    expect(itemUpgradeMode({ g: 1 } as GItem)).toBeNull();
  });

  it("builds calculator deep links with non-default targets", () => {
    expect(buildUpgradeCalcHref({ itemKey: "blade", mode: "upgrade", target: 7 })).toBe(
      "/upgrade?item=blade",
    );
    expect(buildUpgradeCalcHref({ itemKey: "blade", mode: "upgrade", target: 9 })).toBe(
      "/upgrade?item=blade&target=9",
    );
    expect(buildUpgradeCalcHref({ itemKey: "hpamulet", mode: "compound", target: 3 })).toBe(
      "/upgrade?mode=compound&item=hpamulet",
    );
    expect(buildUpgradeCalcHref({ itemKey: "hpamulet", mode: "compound", target: 5 })).toBe(
      "/upgrade?mode=compound&item=hpamulet&target=5",
    );
  });

  it("returns null below +1", () => {
    expect(
      buildItemUpgradeSnapshot({
        itemKey: "blade" as ItemKey,
        gItem: ITEMS.blade,
        level: 0,
        items: ITEMS,
        prices: PRICES,
      }),
    ).toBeNull();
  });

  it("plans a fewest-copies upgrade path to the viewed level", () => {
    const snap = buildItemUpgradeSnapshot({
      itemKey: "blade" as ItemKey,
      gItem: ITEMS.blade,
      level: 3,
      items: ITEMS,
      prices: PRICES,
    });
    expect(snap).not.toBeNull();
    expect(snap!.mode).toBe("upgrade");
    expect(snap!.targetLevel).toBe(3);
    expect(snap!.calcHref).toBe("/upgrade?item=blade&target=3");
    expect(snap!.planEv).not.toBeNull();
    expect(snap!.planEv!).toBeGreaterThan(0);
    expect(snap!.lastStep).not.toBeNull();
    expect(snap!.lastStep!.toLevel).toBe(3);
    expect(snap!.inboundBaseChance).not.toBeNull();
    expect(snap!.inboundBaseChance!).toBeGreaterThan(0);
  });

  it("plans a fewest-copies compound path", () => {
    const snap = buildItemUpgradeSnapshot({
      itemKey: "hpamulet" as ItemKey,
      gItem: ITEMS.hpamulet,
      level: 2,
      items: ITEMS,
      prices: { ...PRICES, helmet: 3200 },
    });
    expect(snap).not.toBeNull();
    expect(snap!.mode).toBe("compound");
    expect(snap!.targetLevel).toBe(2);
    expect(snap!.calcHref).toContain("mode=compound");
    expect(snap!.planEv).not.toBeNull();
  });

  it("caps compound targets at the calculator max", () => {
    const snap = buildItemUpgradeSnapshot({
      itemKey: "hpamulet" as ItemKey,
      gItem: ITEMS.hpamulet,
      level: 7,
      items: ITEMS,
      prices: PRICES,
    });
    expect(snap).not.toBeNull();
    expect(snap!.targetLevel).toBe(5);
    expect(snap!.calcHref).toContain("target=5");
  });
});
