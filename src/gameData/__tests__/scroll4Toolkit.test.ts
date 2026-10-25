import { GItem, ItemKey } from "typed-adventureland";

import {
  allowedUpgradeScrollGrades,
  mergeUpgradeStepOverrides,
  planUpgradePath,
  planUpgradePathBestOdds,
  PlannerContext,
  recomputeUpgradePlan,
  upgradeStepOverrideKey,
} from "../upgradePath";
import { PriceTable } from "../upgradePrices";
import { buildStackTables } from "../upgradeStacks";

const ITEMS: Record<string, GItem> = {
  blade: { upgrade: true, g: 1000, igrace: 1, grades: [9, 10, 11, 12] } as unknown as GItem,
  fireblade: {
    upgrade: true,
    g: 160000,
    igrace: 1,
    grades: [7, 9, 10, 12],
  } as unknown as GItem,
};

const PRICES: PriceTable = {
  fireblade: 160000,
  blade: 1000,
  scroll0: 100,
  scroll1: 400,
  scroll2: 1600,
  scroll3: 6400,
  // Cheap enough that Cheapest will consider it when allowScroll4 is on.
  scroll4: 50,
  offeringp: 2_500_000,
  offering: 10_000_000,
  offeringx: 650_000_000,
  strscroll: 8000,
  helmet: 3200,
};

function makeCtx(allowScroll4: boolean, prices: PriceTable = PRICES): PlannerContext {
  return {
    lookup: (name: ItemKey) => ITEMS[name],
    prices,
    toolkit: { allowScroll4 },
  };
}

describe("scroll4 toolkit toggle", () => {
  const stacks = buildStackTables(PRICES);

  it("allowedUpgradeScrollGrades includes scroll4 when allowScroll4 for cheapest and fewest", () => {
    expect(allowedUpgradeScrollGrades(0, "cheapest", false)).not.toContain(4);
    expect(allowedUpgradeScrollGrades(0, "cheapest", true)).toContain(4);
    // Fewest must honor the toggle too — otherwise the UI cycle + chip are no-ops.
    expect(allowedUpgradeScrollGrades(0, "fewest", false)).not.toContain(4);
    expect(allowedUpgradeScrollGrades(0, "fewest", true)).toContain(4);
  });

  it("recomputeUpgradePlan keeps scroll4 override when allowScroll4 (cheapest + fewest)", () => {
    for (const costModel of ["cheapest", "fewest"] as const) {
      const base =
        costModel === "cheapest"
          ? planUpgradePath(makeCtx(true), "fireblade", 160_000, 2, { stacks })
          : planUpgradePathBestOdds(makeCtx(true), "fireblade", 160_000, 2);
      expect(base).not.toBeNull();
      const step0 = base!.steps[0];
      const key = upgradeStepOverrideKey(step0.fromLevel, step0.toLevel);
      const merged = mergeUpgradeStepOverrides(base!.steps, { [key]: { scrollGrade: 4 } });
      const recomputed = recomputeUpgradePlan({
        ctx: makeCtx(true),
        itemName: "fireblade",
        itemValue: 160_000,
        steps: merged,
        costModel,
        stacks: costModel === "cheapest" ? stacks : undefined,
      });
      expect(recomputed).not.toBeNull();
      expect(recomputed!.steps[0].scrollGrade).toBe(4);
    }
  });

  it("recomputeUpgradePlan clamps scroll4 when allowScroll4 is off", () => {
    const base = planUpgradePathBestOdds(makeCtx(true), "fireblade", 160_000, 2);
    expect(base).not.toBeNull();
    const step0 = base!.steps[0];
    const key = upgradeStepOverrideKey(step0.fromLevel, step0.toLevel);
    const merged = mergeUpgradeStepOverrides(base!.steps, { [key]: { scrollGrade: 4 } });
    const recomputed = recomputeUpgradePlan({
      ctx: makeCtx(false),
      itemName: "fireblade",
      itemValue: 160_000,
      steps: merged,
      costModel: "fewest",
    });
    expect(recomputed).not.toBeNull();
    expect(recomputed!.steps[0].scrollGrade).toBeLessThan(4);
  });

  it("Cheapest plan can pick scroll4 when allowScroll4 and scroll4 is cheap", () => {
    const off = planUpgradePath(makeCtx(false), "blade", 1000, 3, { stacks });
    const on = planUpgradePath(makeCtx(true), "blade", 1000, 3, { stacks });
    expect(off).not.toBeNull();
    expect(on).not.toBeNull();
    const offUses = off!.steps.some((s) => s.scrollGrade === 4);
    const onUses = on!.steps.some((s) => s.scrollGrade === 4);
    expect(offUses).toBe(false);
    expect(onUses).toBe(true);
  });

  it("Fewest plan can pick scroll4 when allowScroll4", () => {
    const off = planUpgradePathBestOdds(makeCtx(false), "blade", 1000, 3);
    const on = planUpgradePathBestOdds(makeCtx(true), "blade", 1000, 3);
    expect(off).not.toBeNull();
    expect(on).not.toBeNull();
    expect(off!.steps.some((s) => s.scrollGrade === 4)).toBe(false);
    expect(on!.steps.some((s) => s.scrollGrade === 4)).toBe(true);
  });
});
