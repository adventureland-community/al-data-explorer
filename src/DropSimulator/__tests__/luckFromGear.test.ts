import { readFileSync } from "fs";
import { join } from "path";
import { ItemKey } from "typed-adventureland";

import { computeLuckmFromGear, itemHasLuckStat, luckmToUiPercent } from "../luckFromGear";

function loadG() {
  const raw = JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8"));
  return raw as Parameters<typeof computeLuckmFromGear>[0]["G"];
}

describe("luckFromGear", () => {
  const G = loadG();
  const { items } = G;

  it("itemHasLuckStat detects luck on base, compound, or upgrade", () => {
    expect(itemHasLuckStat(items.ringofluck as never)).toBe(true);
    expect(itemHasLuckStat(items.elixirluck as never)).toBe(true);
    expect(itemHasLuckStat(items.coat1 as never)).toBe(false);
    expect(itemHasLuckStat(undefined)).toBe(false);
  });

  it("empty gear → luckm 1", () => {
    const result = computeLuckmFromGear({ gear: {}, G, partyXluck: 0 });
    expect(result.xluck).toBe(0);
    expect(result.luckm).toBe(1);
    expect(luckmToUiPercent(result.luckm)).toBe(100);
  });

  it("ringofluck +0 → luckm 1.1", () => {
    const result = computeLuckmFromGear({
      gear: { ring1: { name: "ringofluck" as ItemKey, level: 0 } },
      G,
    });
    expect(result.xluck).toBe(10);
    expect(result.luckm).toBeCloseTo(1.1, 5);
  });

  it("ringofluck +7 uses server compound scaling", () => {
    const result = computeLuckmFromGear({
      gear: { ring1: { name: "ringofluck" as ItemKey, level: 7 } },
      G,
    });
    expect(result.xluck).toBe(54);
    expect(result.luckm).toBeCloseTo(1.54, 3);
    expect(luckmToUiPercent(result.luckm)).toBe(154);
  });

  it("full luck stack sums all slots", () => {
    const result = computeLuckmFromGear({
      gear: {
        ring1: { name: "ringofluck" as ItemKey, level: 7 },
        orb: { name: "rabbitsfoot" as ItemKey, level: 7 },
        earring1: { name: "mearring" as ItemKey, level: 7 },
      },
      G,
    });
    expect(result.luckm).toBeCloseTo(2.505, 2);
    expect(result.breakdown).toHaveLength(3);
  });

  it("elixir slot luck counts", () => {
    const result = computeLuckmFromGear({
      gear: { elixir: { name: "elixirluck" as ItemKey, level: 0 } },
      G,
    });
    expect(result.xluck).toBe(16);
    expect(result.luckm).toBeCloseTo(1.16, 5);
  });

  it("party xluck adds on top of gear", () => {
    const result = computeLuckmFromGear({
      gear: { ring1: { name: "ringofluck" as ItemKey, level: 0 } },
      G,
      partyXluck: 20,
    });
    expect(result.xluck).toBe(30);
    expect(result.luckm).toBeCloseTo(1.3, 5);
  });

  it("festive title adds +1 xluck on capes without base luck", () => {
    const result = computeLuckmFromGear({
      gear: {
        cape: { name: "fcape" as ItemKey, level: 7, p: "festive" as never },
      },
      G,
    });
    expect(result.xluck).toBe(1);
    expect(result.luckm).toBeCloseTo(1.01, 5);
    expect(result.breakdown[0]?.titleKey).toBe("festive");
  });

  it("lucky title stacks with base item luck", () => {
    const result = computeLuckmFromGear({
      gear: {
        ring1: { name: "ringofluck" as ItemKey, level: 0, p: "lucky" as never },
      },
      G,
    });
    expect(result.xluck).toBe(12);
    expect(result.luckm).toBeCloseTo(1.12, 5);
  });

  it("sums luck from any slot with a luck stat", () => {
    const result = computeLuckmFromGear({
      gear: {
        chest: { name: "tshirt88" as ItemKey, level: 0 },
        ring1: { name: "ringofluck" as ItemKey, level: 0 },
      },
      G,
    });
    expect(result.xluck).toBe(22);
    expect(result.luckm).toBeCloseTo(1.22, 5);
  });

  it("counts lucky title on non-luck gear like fury", () => {
    const result = computeLuckmFromGear({
      gear: {
        helmet: { name: "fury" as ItemKey, level: 0, p: "lucky" as never },
      },
      G,
    });
    expect(result.xluck).toBe(2);
    expect(result.luckm).toBeCloseTo(1.02, 5);
  });
});
