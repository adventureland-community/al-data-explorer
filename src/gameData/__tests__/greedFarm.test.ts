import { GItem, ItemKey } from "typed-adventureland";

import { compareGreedKits, minGreedEligibleLevel, planGreedFarm } from "../greedFarm";
import { PriceTable } from "../upgradePrices";

function fakeItem(partial: Partial<GItem> & { name?: string }): GItem {
  return {
    name: "Test",
    type: "weapon",
    g: 1000,
    upgrade: {},
    grades: [7, 9, 10, 12],
    ...partial,
  } as GItem;
}

const prices: PriceTable = {
  scroll0: 1000,
  scroll1: 40000,
  scroll2: 1_600_000,
  scroll3: 64_000_000,
  offeringp: 2_400_000,
  offering: 24_000_000,
  offeringx: 480_000_000,
};

describe("greedFarm", () => {
  it("reports min eligible level from grades[0]", () => {
    expect(minGreedEligibleLevel(fakeItem({ grades: [0, 4, 10, 12] }))).toBe(0);
    expect(minGreedEligibleLevel(fakeItem({ grades: [7, 9, 10, 12] }))).toBe(7);
  });

  it("rejects grade-0 farms", () => {
    const gItem = fakeItem({ grades: [7, 9, 10, 12] });
    const result = planGreedFarm({
      gItem,
      itemKey: "mace" as ItemKey,
      level: 0,
      scrollKey: "scroll0",
      offering: null,
      itemUnit: 3700,
      prices,
    });
    expect(result.eligible).toBe(false);
    expect(result.greedPerAttempt).toBe(0);
    expect(result.goldPerGreed).toBe(Infinity);
  });

  it("Lucky Slot raises successRate but keeps game-visible chance for edge buckets", () => {
    const gItem = fakeItem({ grades: [0, 4, 10, 12], g: 48000 });
    const off = planGreedFarm({
      gItem,
      itemKey: "sword" as ItemKey,
      level: 0,
      scrollKey: "scroll1",
      offering: null,
      itemUnit: 48000,
      prices,
      luckySlot: false,
    });
    const on = planGreedFarm({
      gItem,
      itemKey: "sword" as ItemKey,
      level: 0,
      scrollKey: "scroll1",
      offering: null,
      itemUnit: 48000,
      prices,
      luckySlot: true,
    });
    expect(on.chance).toBeCloseTo(off.chance, 10);
    expect(on.successRate).toBeGreaterThan(on.chance);
    expect(on.greedPerAttempt).toBeCloseTo(off.greedPerAttempt, 10);
  });

  it("prices gold per greed from attempt cost / P(greed)", () => {
    // grades[0]=0 → High at +0, so scroll grade must be ≥ 1
    const gItem = fakeItem({ grades: [0, 4, 10, 12], g: 48000 });
    const result = planGreedFarm({
      gItem,
      itemKey: "sword" as ItemKey,
      level: 0,
      scrollKey: "scroll1",
      offering: null,
      itemUnit: 48000,
      prices,
      targetCount: 2,
    });
    expect(result.eligible).toBe(true);
    expect(result.greedPerAttempt).toBeGreaterThan(0);
    expect(result.attemptCost).toBe(48000 + 40000);
    expect(result.attemptsPerGreed).toBeCloseTo(1 / result.greedPerAttempt, 8);
    expect(result.goldPerGreed).toBeCloseTo(result.attemptCost / result.greedPerAttempt, 4);
    expect(result.goldForTarget).toBeCloseTo(result.goldPerGreed * 2, 4);
  });

  it("accepts custom item unit prices (event / market gear)", () => {
    const gItem = fakeItem({ grades: [0, 7, 10, 12], g: 1 });
    const cheap = planGreedFarm({
      gItem,
      itemKey: "helmet1" as ItemKey,
      level: 0,
      scrollKey: "scroll1",
      offering: null,
      itemUnit: 100,
      prices,
    });
    const expensive = planGreedFarm({
      gItem,
      itemKey: "helmet1" as ItemKey,
      level: 0,
      scrollKey: "scroll1",
      offering: null,
      itemUnit: 1_000_000,
      prices,
    });
    expect(expensive.goldPerGreed).toBeGreaterThan(cheap.goldPerGreed);
  });

  it("ranks scroll kits by gold per greed", () => {
    const gItem = fakeItem({ grades: [0, 4, 10, 12] });
    const rows = compareGreedKits({
      gItem,
      itemKey: "sword" as ItemKey,
      level: 0,
      itemUnit: 48000,
      prices,
      offerings: [null],
    });
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.result.goldPerGreed).toBeGreaterThanOrEqual(rows[i - 1]!.result.goldPerGreed);
    }
  });

  it("rejects scroll below item grade (scroll0 cannot farm High+)", () => {
    const gItem = fakeItem({ grades: [0, 4, 10, 12] });
    const result = planGreedFarm({
      gItem,
      itemKey: "sword" as ItemKey,
      level: 0,
      scrollKey: "scroll0",
      offering: null,
      itemUnit: 48000,
      prices,
    });
    expect(result.eligible).toBe(false);
  });
});
