import { GItem, ItemKey } from "typed-adventureland";

import { activeTechniqueSeries, buildUpgradeTechniqueChances } from "../upgradeChanceSeries";
import { PlannerContext, planUpgradePathBestOdds } from "../upgradePath";
import { PriceTable } from "../upgradePrices";

const ITEMS: Record<string, GItem> = {
  fireblade: {
    upgrade: true,
    g: 160000,
    igrace: 1,
    grades: [7, 9, 10, 12],
  } as unknown as GItem,
};

const PRICES: PriceTable = {
  fireblade: 160000,
  scroll0: 100,
  scroll1: 400,
  scroll2: 1600,
  scroll3: 6400,
  offeringp: 2_500_000,
  offering: 10_000_000,
  offeringx: 650_000_000,
  strscroll: 8000,
};

function ctx(): PlannerContext {
  return {
    lookup: (name: ItemKey) => ITEMS[name],
    prices: PRICES,
    toolkit: { allowPrimstacking: true },
  };
}

describe("upgradeChanceSeries", () => {
  it("includes kit + plan and lucky when luckySlot is on", () => {
    const plan = planUpgradePathBestOdds(ctx(), "fireblade" as ItemKey, 160_000, 7, {
      luckySlot: true,
    });
    expect(plan).not.toBeNull();
    const points = buildUpgradeTechniqueChances({
      ctx: ctx(),
      itemName: "fireblade" as ItemKey,
      steps: plan!.steps,
      luckySlot: true,
    });
    expect(points.length).toBe(7);
    for (const p of points) {
      expect(p.chances.kit).toBeGreaterThan(0);
      expect(p.chances.plan).toBeGreaterThan(0);
      expect(p.chances.lucky).toBeDefined();
    }
    const mid = points.find((p) => (p.chances.plan ?? 1) < 0.999);
    expect(mid).toBeDefined();
    expect(mid!.chances.lucky!).toBeGreaterThan(mid!.chances.plan!);
    const series = activeTechniqueSeries(points);
    expect(series).toContain("kit");
    expect(series).toContain("plan");
    expect(series).toContain("lucky");
  });
});
