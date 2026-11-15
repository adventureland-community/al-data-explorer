import { isEquippable, isValidLevel, statDelta } from "../compareStats";

describe("compareStats", () => {
  it("skips non-equippable types", () => {
    expect(isEquippable({ type: "material", name: "x" } as any)).toBe(false);
    expect(isEquippable({ type: "weapon", name: "x" } as any)).toBe(true);
  });

  it("respects compound max level", () => {
    expect(isValidLevel({ compound: { stat: 1 }, name: "ring" } as any, 7)).toBe(true);
    expect(isValidLevel({ compound: { stat: 1 }, name: "ring" } as any, 8)).toBe(false);
    expect(
      isValidLevel({ compound: { stat: 1 }, grades: [0, 0, 1, 3], name: "zapper" } as any, 3),
    ).toBe(true);
    expect(
      isValidLevel({ compound: { stat: 1 }, grades: [0, 0, 1, 3], name: "zapper" } as any, 4),
    ).toBe(false);
  });

  it("computes stat delta as B minus A", () => {
    expect(statDelta(10, 15)).toBe(5);
    expect(statDelta(15, 10)).toBe(-5);
    expect(statDelta(undefined, 5)).toBe(5);
    expect(statDelta(10, undefined)).toBe(-10);
    expect(statDelta(undefined, undefined)).toBeNull();
  });
});
