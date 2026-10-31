import { DEFAULT_MERCHANT_TAX } from "../../calculators";
import { parsePriceOverrides, parseUpgradeCalcParams } from "../useUpgradeCalcParams";

describe("useUpgradeCalcParams URL codec", () => {
  it("round-trips price overrides via px", () => {
    const sp = new URLSearchParams(
      "item=fallen&lucky=1&ssgrace=1&px=fallen:3000000000,scroll0:100",
    );
    const params = parseUpgradeCalcParams(sp);
    expect(params.item).toBe("fallen");
    expect(params.luckySlot).toBe(true);
    expect(params.statScrollGrace).toBe(true);
    expect(parsePriceOverrides(sp)).toStrictEqual({ fallen: 3_000_000_000, scroll0: 100 });
  });

  it("ignores malformed px entries", () => {
    const sp = new URLSearchParams("px=bad,fallen:-1,ok:1.5,x:NaN");
    expect(parsePriceOverrides(sp)).toStrictEqual({ ok: 1.5 });
  });

  it("keeps material px when item changes but drops the previous item key", () => {
    // Document intended write shape: callers strip the old item override in patch().
    const before = parsePriceOverrides(
      new URLSearchParams("px=fallen:3000000000,scroll0:100,offeringp:50"),
    );
    const after = { ...before };
    delete after.fallen;
    expect(after).toStrictEqual({ scroll0: 100, offeringp: 50 });
  });

  it("defaults useMarketPrices on and parses mkt=0", () => {
    expect(parseUpgradeCalcParams(new URLSearchParams("item=rod")).useMarketPrices).toBe(true);
    expect(parseUpgradeCalcParams(new URLSearchParams("item=rod&mkt=0")).useMarketPrices).toBe(
      false,
    );
  });

  it("defaults failstack and ograce on; parses fs=0 and ograce=0", () => {
    const defaults = parseUpgradeCalcParams(new URLSearchParams("item=rod"));
    expect(defaults.failstack).toBe(true);
    expect(defaults.ograce).toBe(true);
    const off = parseUpgradeCalcParams(new URLSearchParams("item=rod&fs=0&ograce=0"));
    expect(off.failstack).toBe(false);
    expect(off.ograce).toBe(false);
  });

  it("parses tax percent into a fraction and defaults to 2.5%", () => {
    expect(parseUpgradeCalcParams(new URLSearchParams()).taxRate).toBe(DEFAULT_MERCHANT_TAX);
    expect(parseUpgradeCalcParams(new URLSearchParams("tax=4")).taxRate).toBe(0.04);
    expect(parseUpgradeCalcParams(new URLSearchParams("tax=7.5")).taxRate).toBe(0.075);
    expect(parseUpgradeCalcParams(new URLSearchParams("tax=100")).taxRate).toBe(
      DEFAULT_MERCHANT_TAX,
    );
    expect(parseUpgradeCalcParams(new URLSearchParams("tax=-1")).taxRate).toBe(
      DEFAULT_MERCHANT_TAX,
    );
  });
});
