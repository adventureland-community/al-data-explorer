import { GItem, ItemKey } from "typed-adventureland";

import { applyLuckySlotChance, getCompoundChance, getUpgradeChance } from "../upgradeChance";

const ITEMS: Record<string, GItem> = {
  blade: { upgrade: true, g: 1000, igrace: 1, grades: [9, 10, 11, 12] } as unknown as GItem,
  hpamulet: { compound: true, g: 3200, igrace: 1, grades: [9, 10, 11, 12] } as unknown as GItem,
};

const lookup = (name: ItemKey) => ITEMS[name];

describe("upgradeChance", () => {
  it("matches +0 blade scroll0 no offering base chance", () => {
    const { chance } = getUpgradeChance(lookup, { name: "blade", level: 0, grace: 0 }, 0, null);
    expect(chance).toBeCloseTo(0.9999999, 6);
  });

  it("returns zero when scroll grade is too low", () => {
    const { chance } = getUpgradeChance(lookup, { name: "blade", level: 10, grace: 0 }, 0, null);
    expect(chance).toBe(0);
  });

  it("boosts chance with high-grade scroll when above item grade", () => {
    const base = getUpgradeChance(lookup, { name: "blade", level: 10, grace: 0 }, 1, null).chance;
    const high = getUpgradeChance(lookup, { name: "blade", level: 10, grace: 0 }, 2, null).chance;
    expect(high).toBeGreaterThan(base);
  });

  it("applyLuckySlotChance increases effective chance", () => {
    const raw = 0.25;
    expect(applyLuckySlotChance(raw)).toBeGreaterThan(raw);
    expect(applyLuckySlotChance(0.99)).toBeLessThanOrEqual(1);
  });

  it("maps ~88% game chance to ~90.09% expected with Lucky Slot", () => {
    // Discord: calculator showed 90.09% while in-game UI showed ~88%.
    expect(applyLuckySlotChance(0.88)).toBeCloseTo(0.9009230769230769, 10);
  });

  it("compound chance uses igrade table", () => {
    const { chance } = getCompoundChance(lookup, { name: "hpamulet", level: 0, grace: 0 }, 0, null);
    expect(chance).toBeCloseTo(0.99, 6);
  });

  it("failstack increases upgrade chance when an offering is used", () => {
    // Without an offering, low-level grace is crushed and failstack can be a no-op.
    // Offering grade 1 = Primling (G.items.offeringp.grade).
    const base = getUpgradeChance(lookup, { name: "blade", level: 8, grace: 0 }, 0, 1).chance;
    const stacked = getUpgradeChance(
      lookup,
      { name: "blade", level: 8, grace: 0 },
      0,
      1,
      undefined,
      { failstack: 9 },
    ).chance;
    expect(stacked).toBeGreaterThan(base);
  });

  it("server ugrace further increases chance for same failstack", () => {
    const personal = getUpgradeChance(
      lookup,
      { name: "blade", level: 8, grace: 0 },
      0,
      1,
      undefined,
      { failstack: 9, useServerUgrace: false },
    ).chance;
    const withServer = getUpgradeChance(
      lookup,
      { name: "blade", level: 8, grace: 0 },
      0,
      1,
      undefined,
      { failstack: 9, useServerUgrace: true },
    ).chance;
    expect(withServer).toBeGreaterThan(personal);
  });

  it("uses G offering grades so Primling matches High-grade items", () => {
    // Discord: wingedboots +7→+8 with Primling + failstack hits ~45% (cap) in-game
    // when server ugrace is included; old 0-based offering indices under-counted.
    ITEMS.wingedboots = {
      upgrade: true,
      g: 150000,
      grades: [4, 8, 10, 12],
    } as unknown as GItem;
    const { chance, chanceCap } = getUpgradeChance(
      lookup,
      { name: "wingedboots" as ItemKey, level: 7, grace: 0 },
      2,
      1, // Primling
      undefined,
      { failstack: 18, useServerUgrace: true },
    );
    expect(chanceCap).toBeCloseTo(0.45, 6);
    // igrace +1 (zero-grade item) + failstack 18 + server ugrace → cap.
    expect(chance).toBeCloseTo(0.45, 6);
  });

  it("ograce increases compound chance", () => {
    const base = getCompoundChance(
      lookup,
      { name: "hpamulet", level: 2, grace: 0 },
      0,
      null,
    ).chance;
    const stacked = getCompoundChance(
      lookup,
      { name: "hpamulet", level: 2, grace: 0 },
      0,
      null,
      undefined,
      { ograce: 10 },
    ).chance;
    expect(stacked).toBeGreaterThan(base);
  });

  it("returns chanceCap alongside chance", () => {
    const { chance, chanceCap } = getUpgradeChance(
      lookup,
      { name: "blade", level: 7, grace: 0 },
      0,
      null,
    );
    expect(chanceCap).toBeGreaterThan(0);
    expect(chance).toBeLessThanOrEqual(chanceCap + 1e-12);
  });

  it("forces booster compounds to near-certain success", () => {
    ITEMS.xpbooster = {
      compound: true,
      type: "booster",
      g: 1e7,
      // grades[0]=0 → getItemGrade(level 0) is High (1); need scroll ≥ 1
      grades: [0, 10, 6, 7],
    } as unknown as GItem;
    const { chance, chanceCap } = getCompoundChance(
      lookup,
      { name: "xpbooster" as ItemKey, level: 0, grace: 0 },
      1,
      1,
    );
    expect(chance).toBeGreaterThan(0.999);
    expect(chanceCap).toBe(1);
  });
});
