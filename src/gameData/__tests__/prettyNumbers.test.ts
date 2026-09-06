import {
  formatCharacterStatValue,
  formatCompactNumber,
  formatCompactNumberDisplay,
  formatItemStatValue,
  toPrettyFloat,
} from "../prettyNumbers";

describe("prettyNumbers (game client parity)", () => {
  it("toPrettyFloat truncates to 2 decimals like to_pretty_float", () => {
    expect(toPrettyFloat(0.325)).toBe("0.32");
    expect(toPrettyFloat(6)).toBe("6");
    expect(toPrettyFloat(0.15)).toBe("0.15");
  });

  it("formatCompactNumber collapses float noise without inventing decimals", () => {
    expect(formatCompactNumber(1.2000000000000002)).toBe("1.2");
    expect(formatCompactNumber(1.3999999999999999)).toBe("1.4");
    expect(formatCompactNumber(2.0000000000000004)).toBe("2");
    expect(formatCompactNumber(55)).toBe("55");
  });

  it("formatCompactNumberDisplay marks cleaned values with ~ and exact title", () => {
    expect(formatCompactNumberDisplay(55)).toStrictEqual({ text: "55" });
    expect(formatCompactNumberDisplay(1.2000000000000002)).toStrictEqual({
      text: "~1.2",
      title: "exact 1.2000000000000002",
    });
    expect(formatCompactNumberDisplay(1.2000000000000002, { signed: true })).toStrictEqual({
      text: "~+1.2",
      title: "exact +1.2000000000000002",
    });
    expect(formatCompactNumberDisplay(-1.2000000000000002, { signed: true })).toStrictEqual({
      text: "~-1.2",
      title: "exact -1.2000000000000002",
    });
    // Literals JS already stringifies cleanly stay unmarked.
    expect(formatCompactNumberDisplay(1.3999999999999999)).toStrictEqual({ text: "1.4" });
  });

  it("formats evasion and luck like the character sheet", () => {
    expect(formatCharacterStatValue("evasion", 0.325)).toBe("0.32%");
    expect(formatCharacterStatValue("crit", 6)).toBe("6%");
    expect(formatCharacterStatValue("luck", 2)).toBe("102%");
    expect(formatCharacterStatValue("frequency", 1.234)).toBe("123");
    expect(formatCharacterStatValue("armor", 10.7)).toBe("11");
  });

  it("formats item instance luck as signed x-points", () => {
    expect(formatItemStatValue("luck", 2)).toBe("+2%");
    expect(formatItemStatValue("evasion", 0.325)).toBe("0.32%");
  });
});
