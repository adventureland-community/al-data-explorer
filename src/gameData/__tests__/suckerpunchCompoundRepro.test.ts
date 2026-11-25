import { readFileSync } from "fs";
import { join } from "path";
import { GItem, ItemKey } from "typed-adventureland";

import {
  planCompoundPath,
  PlannerContext,
  PriceTable,
  summarizeCompoundPlan,
} from "../../calculators";

const G = JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8"));

/** Prices for compound + helmet-proxy ograce farms (scrolls required). */
function suckerpunchCtx(itemValue: number): { ctx: PlannerContext; prices: PriceTable } {
  const prices: PriceTable = {
    suckerpunch: itemValue,
    helmet: G.items.helmet.g,
    scroll0: G.items.scroll0.g,
    scroll1: G.items.scroll1.g,
    scroll2: G.items.scroll2.g,
    scroll3: G.items.scroll3.g,
    scroll4: G.items.scroll4?.g ?? 1e12,
    cscroll0: G.items.cscroll0.g,
    cscroll1: G.items.cscroll1.g,
    cscroll2: G.items.cscroll2.g,
    cscroll3: G.items.cscroll3.g,
    offeringp: 5_000_000,
    offering: G.items.offering.g,
    offeringx: 800_000_000,
    goldnugget: 120_000,
    strscroll: G.items.strscroll?.g,
  };
  return {
    prices,
    ctx: {
      lookup: (name: ItemKey) => G.items[name] as GItem,
      prices,
    },
  };
}

function expectedBases(
  plan: NonNullable<ReturnType<typeof planCompoundPath>>,
  prices: PriceTable,
  itemValue: number,
): number {
  const summary = summarizeCompoundPlan(plan, prices, {
    itemKey: "suckerpunch",
    itemValue,
    forceAcquire: true,
  });
  return summary.materials.find((m) => m.itemKey === "suckerpunch")?.expectedQty ?? 0;
}

/**
 * Discord (vetto): compound suckerpunch +4 shopping list showed ×6 bases with
 * ~98% "destroy risk". Legacy 1/Π(p) ≈ 5.12 (server graceAfter); with 3^n
 * consume → hundreds. (Older buggy ograce→graceAfter math showed ≈5.61.)
 */
describe("suckerpunch compound +4 (Discord repro)", () => {
  it("lists far more than 6 bases after 3^n path scaling", () => {
    const itemKey = "suckerpunch";
    const itemValue = 1_000_000_000;
    // Original Discord fixture (no helmet-scroll stack prices → ograce effectively off).
    const prices: PriceTable = {
      suckerpunch: itemValue,
      cscroll0: G.items.cscroll0.g,
      cscroll1: G.items.cscroll1.g,
      cscroll2: G.items.cscroll2.g,
      cscroll3: G.items.cscroll3.g,
      offeringp: 50_000_000,
      offering: G.items.offering.g,
      offeringx: 650_000_000,
      goldnugget: 120_000,
      strscroll: G.items.strscroll?.g,
    };
    const ctx: PlannerContext = {
      lookup: (name: ItemKey) => G.items[name] as GItem,
      prices,
    };

    const plan = planCompoundPath(ctx, itemKey as ItemKey, itemValue, 4, "costOptimal", {
      allowOgrace: true,
    });
    expect(plan).not.toBeNull();
    const summary = summarizeCompoundPlan(plan!, prices, {
      itemKey,
      itemValue,
      forceAcquire: true,
    });

    const bases = summary.materials.find((m) => m.itemKey === itemKey)?.expectedQty ?? 0;
    const recipe = summary.steps.filter((s) => s.kind !== "acquire");
    let survive = 1;
    for (let i = 0; i < recipe.length; i++) {
      survive *= 1 / recipe[i].attempts;
    }
    const legacyCopies = 1 / survive;

    expect(legacyCopies).toBeCloseTo(5.12, 1);
    expect(bases).toBeCloseTo(legacyCopies * 3 ** recipe.length, 4);
    expect(Math.ceil(bases)).toBeGreaterThan(6);
  });
});

/**
 * Discord: Fewest copies for suckerpunch +7 used to skip ograce and demand more
 * bases than Cheapest (~2.6M vs ~1.94M). With correct graceAfter (ograce is
 * chance-only), fewest may skip ograce when chance is already capped — the
 * invariant that matters is fewest bases ≤ cheapest (~1.94M ballpark).
 */
describe("suckerpunch compound +7 fewest vs cheapest (Discord repro)", () => {
  it.each([10_000_000_000, 1_000_000_000])(
    "fewest needs ≤ cheapest bases at price %s",
    (itemValue) => {
      const { ctx, prices } = suckerpunchCtx(itemValue);
      const cheap = planCompoundPath(ctx, "suckerpunch" as ItemKey, itemValue, 7, "costOptimal", {
        allowOgrace: true,
      });
      const fewest = planCompoundPath(ctx, "suckerpunch" as ItemKey, itemValue, 7, "bestOdds", {
        allowOgrace: true,
      });
      expect(cheap).not.toBeNull();
      expect(fewest).not.toBeNull();

      const cheapBases = expectedBases(cheap!, prices, itemValue);
      const fewestBases = expectedBases(fewest!, prices, itemValue);
      expect(fewestBases).toBeLessThanOrEqual(cheapBases + 1e-6);
      // Discord ballpark (~1.94M); the broken skip-ograce path was ~2.6M.
      expect(fewestBases).toBeLessThan(2_100_000);
    },
  );

  it("allowOgrace false keeps fewest at zero ograce", () => {
    const itemValue = 10_000_000_000;
    const { ctx, prices } = suckerpunchCtx(itemValue);
    const withOg = planCompoundPath(ctx, "suckerpunch" as ItemKey, itemValue, 7, "bestOdds", {
      allowOgrace: true,
    });
    const noOg = planCompoundPath(ctx, "suckerpunch" as ItemKey, itemValue, 7, "bestOdds", {
      allowOgrace: false,
    });
    expect(withOg).not.toBeNull();
    expect(noOg).not.toBeNull();
    expect(noOg!.path.every((s) => (s.ograce ?? 0) === 0)).toBe(true);
    // When chance is already capped, ograce does not reduce fewest bases.
    expect(expectedBases(noOg!, prices, itemValue)).toBeCloseTo(
      expectedBases(withOg!, prices, itemValue),
      4,
    );
  });
});
