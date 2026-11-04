import { readFileSync } from "fs";
import { join } from "path";
import { GItem, ItemKey } from "typed-adventureland";

import {
  applyShinyPolishToSummary,
  pickShinyPolish,
  planUpgradePathBestOdds,
  PlannerContext,
  PriceTable,
  summarizeUpgradePlan,
} from "../../calculators";

const G = JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8"));

/**
 * Discord (vetto): shiny Lolipop +10 shopping list showed 11 High / 9 Primling
 * next to hundreds of bases. Expect hundreds+ after path-restart fix.
 */
describe("lolipop shiny +10 shopping list (Discord repro)", () => {
  it("fewest + shiny scales High scrolls and Primlings with path restarts", () => {
    const itemKey = "glolipop";
    const itemValue = 3_500_000;
    const priceKeys = [
      itemKey,
      "scroll0",
      "scroll1",
      "scroll2",
      "scroll3",
      "scroll4",
      "offeringp",
      "offering",
      "offeringx",
      "strscroll",
      "dexscroll",
      "bronzeingot",
      "bronzenugget",
    ];
    const prices: PriceTable = {};
    for (const k of priceKeys) {
      if (k === itemKey) {
        prices[k] = itemValue;
        continue;
      }
      const g = G.items[k]?.g;
      if (typeof g === "number") prices[k] = g;
    }
    const ctx: PlannerContext = {
      lookup: (name: ItemKey) => G.items[name] as GItem,
      prices,
    };

    const plan = planUpgradePathBestOdds(ctx, itemKey as ItemKey, itemValue, 10);
    expect(plan).not.toBeNull();
    let summary = summarizeUpgradePlan(plan!, prices, "upgrade", {
      itemKey,
      itemValue,
      forceAcquire: true,
    });
    const polish = pickShinyPolish({
      gItem: G.items[itemKey] as GItem,
      itemValue,
      prices,
    });
    expect(polish).not.toBeNull();
    summary = applyShinyPolishToSummary({ summary, polish: polish!, targetLevel: 10 });

    const maces = summary.materials.find((m) => m.itemKey === itemKey)?.expectedQty ?? 0;
    const high = summary.materials.find((m) => m.itemKey === "scroll1")?.expectedQty ?? 0;
    const prim = summary.materials.find((m) => m.itemKey === "offeringp")?.expectedQty ?? 0;
    expect(maces).toBeGreaterThan(100);
    expect(high).toBeGreaterThan(100); // was ~11 before fix
    expect(prim).toBeGreaterThan(100); // was ~9 before fix
  });
});
