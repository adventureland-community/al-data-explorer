import { decodeStepOverrides, encodeStepOverrides, parseStepOverrides } from "../stepOverrideUrl";

describe("stepOverrideUrl", () => {
  it("round-trips step overrides via ov", () => {
    const overrides = {
      "0-1": { scrollGrade: 1, primstacking: 3, failstack: 12, ograce: 14, offering: 1 as const },
      "8-9": { scrollGrade: 2, primstacking: 0, offering: null },
    };
    const encoded = encodeStepOverrides(overrides);
    expect(encoded).toBeTruthy();
    expect(decodeStepOverrides(encoded)).toStrictEqual(overrides);
    const sp = new URLSearchParams();
    sp.set("ov", encoded!);
    expect(parseStepOverrides(sp)).toStrictEqual(overrides);
  });

  it("drops empty and invalid keys", () => {
    expect(encodeStepOverrides({})).toBeNull();
    expect(decodeStepOverrides("not-valid")).toStrictEqual({});
    expect(
      decodeStepOverrides(
        encodeStepOverrides({
          bad: { scrollGrade: 1 },
          "1-2": { scrollGrade: 99 },
        } as never),
      )["1-2"]?.scrollGrade,
    ).toBe(4);
  });
});
