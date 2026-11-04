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

/**
 * Discord (vetto): compound suckerpunch +4 shopping list showed ×6 bases with
 * ~98% "destroy risk". Legacy 1/Π(p) ≈ 5.6; with 3^n consume → hundreds.
 */
describe("suckerpunch compound +4 (Discord repro)", () => {
  it("lists far more than 6 bases after 3^n path scaling", () => {
    const itemKey = "suckerpunch";
    const itemValue = 1_000_000_000;
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

    expect(legacyCopies).toBeCloseTo(5.61, 1); // Discord buy ×6
    expect(bases).toBeCloseTo(legacyCopies * 3 ** recipe.length, 4);
    expect(Math.ceil(bases)).toBeGreaterThan(6);
  });
});
