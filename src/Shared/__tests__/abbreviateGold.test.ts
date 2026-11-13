import { abbreviateGold, abbreviateNumber } from "../utils";

describe("abbreviateNumber (SI)", () => {
  it("keeps metric suffixes including G for billions", () => {
    expect(abbreviateNumber(1_000)).toBe("1k");
    expect(abbreviateNumber(1_000_000)).toBe("1M");
    expect(abbreviateNumber(1_000_000_000)).toBe("1G");
  });

  it("always returns a string, including small values", () => {
    expect(abbreviateNumber(42)).toBe("42");
    expect(abbreviateNumber(undefined, { empty: "—" })).toBe("—");
  });
});

describe("abbreviateGold (currency)", () => {
  it("uses finance suffixes so a billion is B not G", () => {
    expect(abbreviateGold(1_000)).toBe("1K");
    expect(abbreviateGold(1_000_000)).toBe("1M");
    expect(abbreviateGold(1_000_000_000)).toBe("1B");
    expect(abbreviateGold(1_000_000_000_000)).toBe("1T");
  });

  it("formats parking threshold as 99B and a round 100B as 100B", () => {
    expect(abbreviateGold(99_000_000_000)).toBe("99B");
    expect(abbreviateGold(100_000_000_000)).toBe("100B");
  });

  it("supports signed, unit, empty, and positiveOnly options", () => {
    expect(abbreviateGold(-200_000, { signed: true })).toBe("−200K");
    expect(abbreviateGold(1_000, { unit: "g" })).toBe("1Kg");
    // Fractional body follows the runtime locale (same as abbreviateNumber).
    const onePointFive = (1.5).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    expect(abbreviateGold(1_500, { unit: "g" })).toBe(`${onePointFive}Kg`);
    expect(abbreviateGold(Number.POSITIVE_INFINITY, { empty: "∞" })).toBe("∞");
    expect(abbreviateGold(0, { empty: "—", positiveOnly: true })).toBe("—");
    expect(abbreviateGold(null, { empty: "—" })).toBe("—");
  });
});
