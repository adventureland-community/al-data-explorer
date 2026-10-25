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
});
