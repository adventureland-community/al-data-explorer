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

  it("compound chance uses igrade table", () => {
    const { chance } = getCompoundChance(lookup, { name: "hpamulet", level: 0, grace: 0 }, 0, null);
    expect(chance).toBeCloseTo(0.99, 6);
  });

  it("failstack increases upgrade chance when an offering is used", () => {
    // Without an offering, low-level grace is crushed and failstack can be a no-op.
    const base = getUpgradeChance(lookup, { name: "blade", level: 8, grace: 0 }, 0, 0).chance;
    const stacked = getUpgradeChance(
      lookup,
      { name: "blade", level: 8, grace: 0 },
      0,
      0,
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
      0,
      undefined,
      { failstack: 9, useServerUgrace: false },
    ).chance;
    const withServer = getUpgradeChance(
      lookup,
      { name: "blade", level: 8, grace: 0 },
      0,
      0,
      undefined,
      { failstack: 9, useServerUgrace: true },
    ).chance;
    expect(withServer).toBeGreaterThan(personal);
  });

  it("primestack increases compound chance", () => {
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
      { primestack: 10 },
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
