import { formatCharacterStatValue, formatItemStatValue, toPrettyFloat } from "../prettyNumbers";

describe("prettyNumbers (game client parity)", () => {
  it("toPrettyFloat truncates to 2 decimals like to_pretty_float", () => {
    expect(toPrettyFloat(0.325)).toBe("0.32");
    expect(toPrettyFloat(6)).toBe("6");
    expect(toPrettyFloat(0.15)).toBe("0.15");
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
