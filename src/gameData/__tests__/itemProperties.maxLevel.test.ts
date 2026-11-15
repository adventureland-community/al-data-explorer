import { getLevelString, getMaxLevel } from "../itemProperties";

describe("getMaxLevel", () => {
  it("reads upgrade max from grades[3]", () => {
    expect(getMaxLevel({ upgrade: { attack: 1 }, grades: [7, 9, 10, 12] })).toBe(12);
    expect(getMaxLevel({ upgrade: { attack: 1 }, grades: [0, 0, 8, 10] })).toBe(10);
    expect(getMaxLevel({ upgrade: { attack: 1 } })).toBe(12);
  });

  it("reads compound max from grades[3] (design clamp ≤7; zapper/trigger = 3)", () => {
    expect(getMaxLevel({ compound: { int: 1 }, grades: [4, 5, 6, 7] })).toBe(7);
    expect(getMaxLevel({ compound: { int: 1 }, grades: [0, 0, 1, 3] })).toBe(3);
    expect(getMaxLevel({ compound: { int: 1 } })).toBe(7);
  });

  it("returns undefined for non-enhanceable items", () => {
    expect(getMaxLevel({} as { upgrade?: unknown })).toBeUndefined();
  });
});

describe("getLevelString compound letters", () => {
  it("maps +5/+6/+7 like the game (V/S/R)", () => {
    const book = { compound: { int: 5 }, grades: [4, 5, 6, 7] } as never;
    expect(getLevelString(book, 5)).toBe("V");
    expect(getLevelString(book, 6)).toBe("S");
    expect(getLevelString(book, 7)).toBe("R");
  });
});
