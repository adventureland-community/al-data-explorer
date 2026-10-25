import { GItem } from "typed-adventureland";

import { PlanSummaryStep } from "../upgradePath";
import {
  applyShinyPolishToSummary,
  BONUS_GRACE_CHANCE,
  DARK_TRISTONE_CHANCE,
  edgeBucketOdds,
  expectedBoosterExtras,
  expectedEdgeOutcomes,
  pickShinyPolish,
  shinyPolishChance,
  summarizeUpgradeSideEffects,
} from "../upgradeSideEffects";

function step(
  partial: Partial<PlanSummaryStep> & { fromLevel: number; chance: number },
): PlanSummaryStep {
  return {
    toLevel: partial.fromLevel + 1,
    scrollKey: "scroll0",
    offeringKey: null,
    primstacks: 0,
    priming: 0,
    primingStatClicks: 0,
    primingNormalPrimes: 0,
    primingStatScrollEach: 0,
    statScrollGrace: 0,
    failstack: 0,
    primestack: 0,
    attempts: 1 / partial.chance,
    stepSpend: 0,
    runningTotal: 0,
    shrineMs: 0,
    ...partial,
  };
}

describe("upgradeSideEffects", () => {
  it("splits the 1/10000 edge bucket by fractional position", () => {
    const odds = edgeBucketOdds(0.25005);
    expect(odds.frac).toBeCloseTo(0.5, 8);
    expect(odds.luckyPerAttempt).toBeCloseTo(0.5 / 10000, 12);
    expect(odds.greedPerAttempt).toBeCloseTo(0.5 / 10000, 12);
  });

  it("expected lucky+greed over a geometric step sum to 1/(p*10000)", () => {
    const p = 0.4;
    const { lucky, greed } = expectedEdgeOutcomes(p);
    expect(lucky + greed).toBeCloseTo(1 / (p * 10000), 12);
  });

  it("returns zeros at certainty and at zero chance", () => {
    expect(expectedEdgeOutcomes(1)).toStrictEqual({ lucky: 0, greed: 0 });
    expect(expectedEdgeOutcomes(0)).toStrictEqual({ lucky: 0, greed: 0 });
  });

  it("gates upgrade Lucky/Greed on grade ≥ 1", () => {
    const blade = {
      upgrade: true,
      g: 1000,
      grades: [9, 10, 11, 12],
    } as unknown as GItem;

    const low = summarizeUpgradeSideEffects({
      steps: [step({ fromLevel: 0, chance: 0.25005 })],
      gItem: blade,
      mode: "upgrade",
    });
    expect(low.steps[0].grade).toBe(0);
    expect(low.expectedLucky).toBe(0);
    expect(low.expectedGreed).toBe(0);
    expect(low.expectedBonusGrace).toBeCloseTo((1 / 0.25005) * BONUS_GRACE_CHANCE, 8);

    const high = summarizeUpgradeSideEffects({
      steps: [step({ fromLevel: 9, chance: 0.25005 })],
      gItem: blade,
      mode: "upgrade",
    });
    expect(high.steps[0].grade).toBe(1);
    expect(high.expectedLucky).toBeGreaterThan(0);
    expect(high.expectedGreed).toBeGreaterThan(0);
    expect(high.anyEligible).toBe(true);
  });

  it("allows compound Lucky without a grade gate; no Greed on compound", () => {
    const amulet = {
      compound: true,
      g: 3200,
      grades: [9, 10, 11, 12],
    } as unknown as GItem;

    const summary = summarizeUpgradeSideEffects({
      steps: [step({ fromLevel: 0, chance: 0.25005 })],
      gItem: amulet,
      mode: "compound",
    });
    expect(summary.expectedLucky).toBeGreaterThan(0);
    expect(summary.expectedGreed).toBe(0);
    expect(summary.expectedBonusGrace).toBe(0);
  });

  it("computes shiny polish chance and rejects under-tier materials", () => {
    expect(shinyPolishChance({ itemZeroGrade: 0, polishOffering: 0, itemValue: 1000 })).toBeCloseTo(
      0.16 * 2.8,
      8,
    );
    expect(shinyPolishChance({ itemZeroGrade: 0, polishOffering: 2, itemValue: 1000 })).toBeCloseTo(
      0.32 * 2.8,
      8,
    );
    expect(shinyPolishChance({ itemZeroGrade: 2, polishOffering: 1, itemValue: 1e9 })).toBeNull();
    expect(shinyPolishChance({ itemZeroGrade: 2, polishOffering: 2, itemValue: 1e9 })).toBeCloseTo(
      0.16 * 1,
      8,
    );
  });

  it("picks cheapest shiny polish and appends a plan step", () => {
    const blade = {
      upgrade: true,
      g: 1000,
      grades: [9, 10, 11, 12],
    } as unknown as GItem;
    const prices = { goldnugget: 120_000, bronzeingot: 40_000, goldingot: 2_000_000 };
    const polish = pickShinyPolish({ gItem: blade, itemValue: 1000, prices });
    expect(polish).not.toBeNull();
    expect(polish!.key).toBe("bronzeingot");

    const base = {
      steps: [step({ fromLevel: 0, chance: 0.9, stepSpend: 1000, runningTotal: 1000 })],
      materials: [] as { itemKey: string; expectedQty: number; unitPrice: number; total: number }[],
      totalExpectedCost: 1000,
    };
    const withShiny = applyShinyPolishToSummary({
      summary: base,
      polish: polish!,
      targetLevel: 7,
    });
    expect(withShiny.steps).toHaveLength(2);
    expect(withShiny.steps[1].kind).toBe("shiny");
    expect(withShiny.steps[1].offeringKey).toBe("bronzeingot");
    expect(withShiny.totalExpectedCost).toBeCloseTo(1000 + polish!.expectedCost, 4);
    expect(withShiny.materials.some((m) => m.itemKey === "bronzeingot")).toBe(true);
  });

  it("reports Dark Tri-Stone on ctristone 0→1 compound", () => {
    const tri = {
      compound: true,
      g: 50_000,
      grades: [1, 4, 6, 7],
    } as unknown as GItem;
    const hit = summarizeUpgradeSideEffects({
      steps: [step({ fromLevel: 0, toLevel: 1, chance: 0.9 })],
      gItem: tri,
      itemKey: "ctristone",
      mode: "compound",
    });
    expect(hit.darkTristone?.chance).toBe(DARK_TRISTONE_CHANCE);
    expect(hit.darkTristone?.expected).toBe(DARK_TRISTONE_CHANCE);

    const miss = summarizeUpgradeSideEffects({
      steps: [step({ fromLevel: 1, toLevel: 2, chance: 0.5 })],
      gItem: tri,
      itemKey: "ctristone",
      mode: "compound",
    });
    expect(miss.darkTristone).toBeNull();
  });

  it("sums booster offering extras across steps", () => {
    expect(expectedBoosterExtras(false)).toBe(0);
    const threeTerms = 0.12 + 0.12 * 0.06 + 0.12 * 0.06 * 0.03;
    expect(expectedBoosterExtras(true)).toBeGreaterThan(threeTerms);
    expect(expectedBoosterExtras(true)).toBeCloseTo(threeTerms, 3);

    const booster = {
      compound: true,
      type: "booster",
      g: 1e7,
      grades: [0, 10, 6, 7],
    } as unknown as GItem;
    const summary = summarizeUpgradeSideEffects({
      steps: [
        step({ fromLevel: 0, chance: 0.999, offeringKey: "offering" }),
        step({ fromLevel: 1, chance: 0.999, offeringKey: null }),
      ],
      gItem: booster,
      mode: "compound",
    });
    expect(summary.isBooster).toBe(true);
    expect(summary.expectedBoosterExtras).toBeCloseTo(expectedBoosterExtras(true), 8);
    expect(summary.steps[1].expectedBoosterExtras).toBe(0);
  });

  it("notes inactive Fast/Super Fast on weapons", () => {
    const blade = {
      upgrade: true,
      type: "weapon",
      wtype: "short_sword",
      g: 1000,
      grades: [9, 10, 11, 12],
    } as unknown as GItem;
    const summary = summarizeUpgradeSideEffects({
      steps: [step({ fromLevel: 0, chance: 0.9 })],
      gItem: blade,
      mode: "upgrade",
    });
    expect(summary.inactiveTitles.map((t) => t.key)).toStrictEqual(["fast", "superfast"]);
  });
});
