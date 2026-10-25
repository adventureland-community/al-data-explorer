import { GItem, ItemKey } from "typed-adventureland";

import {
  expectedPlanShrineMs,
  formatShrineTime,
  mergeUpgradeStepOverrides,
  pickCompoundRoute,
  planCompoundPath,
  planUpgradePath,
  planUpgradePathBestOdds,
  PlannerContext,
  recomputeUpgradePlan,
  shrineClickMs,
  summarizeUpgradePlan,
  upgradeStepOverrideKey,
} from "../upgradePath";
import { PriceTable, primingSpend } from "../upgradePrices";

const ITEMS: Record<string, GItem> = {
  blade: { upgrade: true, g: 1000, igrace: 1, grades: [9, 10, 11, 12] } as unknown as GItem,
  helmet: {
    upgrade: true,
    g: 3200,
    igrace: 1,
    stat: 1,
    grades: [7, 9, 10, 12],
  } as unknown as GItem,
  hpamulet: { compound: true, g: 3200, igrace: 1, grades: [9, 10, 11, 12] } as unknown as GItem,
  loadeddice: {
    compound: true,
    g: 1000000,
    igrace: 1,
    grades: [7, 9, 10, 12],
  } as unknown as GItem,
  fireblade: {
    upgrade: true,
    g: 160000,
    igrace: 1,
    grades: [7, 9, 10, 12],
  } as unknown as GItem,
};

const PRICES: PriceTable = {
  helmet: 3200,
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

function ctx(extraItems?: Record<string, GItem>, prices: PriceTable = PRICES): PlannerContext {
  const items = { ...ITEMS, ...extraItems };
  return {
    lookup: (name: ItemKey) => items[name],
    prices,
  };
}

describe("upgradePath", () => {
  it("plans a single +0 to +1 upgrade step", () => {
    const plan = planUpgradePath(ctx(), "blade", 1000, 1);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].fromLevel).toBe(0);
    expect(plan!.steps[0].toLevel).toBe(1);
    expect(plan!.steps[0].chance).toBeGreaterThan(0.99);
    expect(Number.isFinite(plan!.totalExpectedCost)).toBe(true);
  });

  it("plans compound path to +1", () => {
    const plan = planCompoundPath(ctx(), "hpamulet", 3200, 1);
    expect(plan).not.toBeNull();
    expect(plan!.path).toHaveLength(1);
    expect(plan!.path[0].chance).toBeGreaterThan(0.9);
  });

  it("Loaded Die compound +3 returns finite costs for both strategies", () => {
    const cheap = planCompoundPath(ctx(), "loadeddice" as ItemKey, 1_000_000, 3, "costOptimal");
    const odds = planCompoundPath(ctx(), "loadeddice" as ItemKey, 1_000_000, 3, "bestOdds");
    expect(cheap).not.toBeNull();
    expect(odds).not.toBeNull();
    expect(cheap!.path).toHaveLength(3);
    expect(odds!.path).toHaveLength(3);
    expect(Number.isFinite(cheap!.totalExpectedCost)).toBe(true);
    expect(Number.isFinite(odds!.totalExpectedCost)).toBe(true);
    expect(odds!.totalExpectedCost).toBeGreaterThanOrEqual(cheap!.totalExpectedCost);
  });

  it("pickCompoundRoute strategies diverge", () => {
    const cheapScroll = {
      expCost: 1_000_000,
      chance: 0.4,
      grace: 0,
      scroll: 0,
      offering: null as null,
      primestack: 0,
      primestackCost: 0,
    };
    const nearOffering = {
      expCost: 1_150_000,
      chance: 0.55,
      grace: 0,
      scroll: 0,
      offering: 0 as const,
      primestack: 0,
      primestackCost: 0,
    };
    const expensiveBestOdds = {
      expCost: 2_000_000,
      chance: 0.7,
      grace: 0,
      scroll: 1,
      offering: 0 as const,
      primestack: 0,
      primestackCost: 0,
    };
    const candidates = [cheapScroll, nearOffering, expensiveBestOdds];

    expect(pickCompoundRoute(candidates, "costOptimal")?.chance).toBe(0.4);
    expect(pickCompoundRoute(candidates, "balanced")?.chance).toBe(0.55);
    expect(pickCompoundRoute(candidates, "bestOdds")?.chance).toBe(0.7);
  });

  it("bestOdds upgrade path returns ordered steps", () => {
    const plan = planUpgradePathBestOdds(ctx(), "blade", 1000, 3);
    expect(plan).not.toBeNull();
    expect(plan!.steps.map((s) => s.fromLevel)).toStrictEqual([0, 1, 2]);
    expect(Number.isFinite(plan!.totalExpectedCost)).toBe(true);
  });

  it("fireblade Cheapest to +7 returns finite ordered steps", () => {
    const plan = planUpgradePath(ctx(), "fireblade" as ItemKey, 160000, 7);
    expect(plan).not.toBeNull();
    expect(plan!.steps.map((s) => s.fromLevel)).toStrictEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(Number.isFinite(plan!.totalExpectedCost)).toBe(true);
    expect(plan!.totalExpectedCost).toBeGreaterThan(160000);
  }, 60000);

  it("server ugrace can change Cheapest EV", () => {
    const off = planUpgradePath(ctx(), "fireblade" as ItemKey, 160000, 5);
    const on = planUpgradePath(
      { ...ctx(), useServerUgrace: true },
      "fireblade" as ItemKey,
      160000,
      5,
    );
    expect(off).not.toBeNull();
    expect(on).not.toBeNull();
    expect(Number.isFinite(off!.totalExpectedCost)).toBe(true);
    expect(Number.isFinite(on!.totalExpectedCost)).toBe(true);
    // Server ugrace should not increase Cheapest EV.
    expect(on!.totalExpectedCost).toBeLessThanOrEqual(off!.totalExpectedCost + 1e-6);
  }, 60000);

  it("stat scroll grace is unused when disabled", () => {
    const plan = planUpgradePath(ctx(), "helmet" as ItemKey, 3200, 3);
    expect(plan).not.toBeNull();
    expect(plan!.steps.every((s) => (s.statScrollGrace ?? 0) === 0)).toBe(true);
  });

  it("stat scroll grace can appear when enabled on a stat-pool item", () => {
    // Cheap offering + free pscroll; disable primlings so +1 grace must use pscroll.
    const prices: PriceTable = {
      ...PRICES,
      offeringp: 100,
      strscroll: 1,
    };
    const on = planUpgradePath(
      {
        ...ctx(undefined, prices),
        toolkit: { allowStatScrollGrace: true, allowPrimlings: false },
      },
      "helmet" as ItemKey,
      3200,
      9,
    );
    const off = planUpgradePath(
      {
        ...ctx(undefined, prices),
        toolkit: { allowStatScrollGrace: false, allowPrimlings: false },
      },
      "helmet" as ItemKey,
      3200,
      9,
    );
    expect(on).not.toBeNull();
    expect(off).not.toBeNull();
    expect(on!.steps.some((s) => (s.statScrollGrace ?? 0) > 0)).toBe(true);
    expect(on!.totalExpectedCost).toBeLessThan(off!.totalExpectedCost + 1e-6);
  }, 60000);

  it("stat scroll grace is ignored for items without a stat pool", () => {
    const prices: PriceTable = { ...PRICES, offeringp: 5_000_000, strscroll: 1 };
    const plan = planUpgradePath(
      {
        ...ctx(undefined, prices),
        toolkit: { allowStatScrollGrace: true },
      },
      "blade",
      1000,
      3,
    );
    expect(plan).not.toBeNull();
    expect(plan!.steps.every((s) => (s.statScrollGrace ?? 0) === 0)).toBe(true);
  });

  it("primingSpend folds dex scrolls when cheaper than two primes", () => {
    const cheap = primingSpend({
      units: 4,
      itemGrade: 0,
      primingUnit: 100,
      statScrollUnit: 1,
      canStat: true,
    });
    expect(cheap.statClicks).toBe(2);
    expect(cheap.normalPrimes).toBe(0);
    expect(cheap.statScrollEach).toBe(1);
    expect(cheap.cost).toBe(2 * (100 + 1));

    const expensive = primingSpend({
      units: 4,
      itemGrade: 0,
      primingUnit: 100,
      statScrollUnit: 200,
      canStat: true,
    });
    expect(expensive.statClicks).toBe(0);
    expect(expensive.normalPrimes).toBe(4);
    expect(expensive.cost).toBe(400);
  });

  it("cheap dex scrolls never raise Cheapest EV on stat-pool items", () => {
    const cheap = planUpgradePath(
      { ...ctx(undefined, { ...PRICES, strscroll: 1 }), toolkit: { allowPrimlings: true } },
      "helmet" as ItemKey,
      3200,
      7,
    );
    const dear = planUpgradePath(
      { ...ctx(undefined, { ...PRICES, strscroll: 1e12 }), toolkit: { allowPrimlings: true } },
      "helmet" as ItemKey,
      3200,
      7,
    );
    expect(cheap).not.toBeNull();
    expect(dear).not.toBeNull();
    expect(cheap!.totalExpectedCost).toBeLessThanOrEqual(dear!.totalExpectedCost + 1e-6);
  }, 60000);

  it("shrineClickMs assumes Mass Production++ (/10)", () => {
    expect(shrineClickMs("compound", 5, 0)).toBe(1000);
    expect(shrineClickMs("upgrade", 4, 0)).toBeCloseTo((500 * 4 * 2) / 10);
    expect(shrineClickMs("upgrade", 4, 1)).toBeCloseTo((500 * 4 * 2 * 1.5) / 10);
  });

  it("expectedPlanShrineMs restarts on destroy, not on scroll4", () => {
    const steps = [
      { toLevel: 1, chance: 0.5, scrollGrade: 0 },
      { toLevel: 2, chance: 0.5, scrollGrade: 0 },
    ];
    const times = expectedPlanShrineMs(steps, "upgrade", 0);
    const click1 = shrineClickMs("upgrade", 1, 0);
    const click2 = shrineClickMs("upgrade", 2, 0);
    expect(times[0]).toBe(0);
    expect(times[1]).toBeCloseTo((0 + click1) * 2);
    expect(times[2]).toBeCloseTo((times[1] + click2) * 2);

    const survive = expectedPlanShrineMs(
      [{ toLevel: 1, chance: 0.5, scrollGrade: 4 }],
      "upgrade",
      0,
    );
    expect(survive[1]).toBeCloseTo(click1 * 2);
    expect(formatShrineTime(survive[1])).toMatch(/s$/);
  });

  it("summarizeUpgradePlan folds expected base copies into Acquire", () => {
    const plan = planUpgradePathBestOdds(ctx(), "fireblade", 160_000, 7);
    expect(plan).not.toBeNull();
    const summary = summarizeUpgradePlan(plan!, PRICES, "upgrade", {
      itemKey: "fireblade",
      itemValue: 160_000,
    });
    const acquire = summary.steps[0];
    expect(acquire.kind).toBe("acquire");
    expect(acquire.fromLevel).toBe(0);
    expect(acquire.scrollKey).toBe("fireblade");
    expect(acquire.attempts).toBeGreaterThan(1);
    expect(acquire.stepSpend).toBeCloseTo(acquire.attempts * 160_000, 4);
    const itemMat = summary.materials.find((m) => m.itemKey === "fireblade");
    expect(itemMat?.expectedQty).toBeCloseTo(acquire.attempts, 6);
    expect(itemMat?.total).toBeCloseTo(acquire.stepSpend, 4);
    const last = summary.steps[summary.steps.length - 1];
    expect(last.runningTotal).toBeCloseTo(summary.totalExpectedCost, 0);
  });

  it("recomputeUpgradePlan applies scroll override and cascades EV", () => {
    const base = planUpgradePathBestOdds(ctx(), "fireblade", 160_000, 3);
    expect(base).not.toBeNull();
    const step0 = base!.steps[0];
    const key = upgradeStepOverrideKey(step0.fromLevel, step0.toLevel);
    const grades = [step0.scrollGrade, step0.scrollGrade + 1].filter((g) => g <= 3);
    const altGrade = grades.find((g) => g !== step0.scrollGrade) ?? step0.scrollGrade;
    const merged = mergeUpgradeStepOverrides(base!.steps, {
      [key]: { scrollGrade: altGrade },
    });
    const recomputed = recomputeUpgradePlan({
      ctx: ctx(),
      itemName: "fireblade",
      itemValue: 160_000,
      steps: merged,
      costModel: "fewest",
    });
    expect(recomputed).not.toBeNull();
    expect(recomputed!.steps[0].scrollGrade).toBe(altGrade);
    expect(Number.isFinite(recomputed!.totalExpectedCost)).toBe(true);
    expect(altGrade === step0.scrollGrade || recomputed!.steps[0].chance !== step0.chance).toBe(
      true,
    );
  });
});
