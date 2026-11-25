import { PlanSummaryStep } from "../../calculators";
import { oneshotPercent, sumAttempts } from "../upgradeCalcHelpers";

function recipeStep(
  partial: Partial<PlanSummaryStep> & { chance: number; attempts: number },
): PlanSummaryStep {
  return {
    fromLevel: 0,
    toLevel: 1,
    scrollKey: "scroll0",
    offeringKey: null,
    primstacking: 0,
    primstackingStatClicks: 0,
    primstackingNormal: 0,
    primstackingStatScrollEach: 0,
    statScrollGrace: 0,
    failstack: 0,
    ograce: 0,
    stepSpend: 0,
    runningTotal: 0,
    shrineMs: 0,
    ...partial,
  };
}

describe("upgradeCalcHelpers", () => {
  it("sumAttempts prefers consumeAttempts over local 1/p", () => {
    const steps = [
      recipeStep({ chance: 0.5, attempts: 2, consumeAttempts: 100 }),
      recipeStep({
        fromLevel: 1,
        toLevel: 2,
        chance: 0.5,
        attempts: 2,
        consumeAttempts: 50,
      }),
    ];
    expect(sumAttempts(steps)).toBeCloseTo(150);
  });

  it("oneshotPercent compounds with ×3 copy-tree exponents", () => {
    const steps = [
      recipeStep({ chance: 0.5, attempts: 2, scrollKey: "cscroll0" }),
      recipeStep({
        fromLevel: 1,
        toLevel: 2,
        chance: 0.5,
        attempts: 2,
        scrollKey: "cscroll0",
      }),
    ];
    // Upgrade lineage: 0.5 * 0.5 = 25%
    expect(oneshotPercent(steps, "upgrade")).toBeCloseTo(25);
    // Compound tree: 0.5^3 * 0.5^1 = 6.25%
    expect(oneshotPercent(steps, "compound")).toBeCloseTo(6.25);
  });
});
