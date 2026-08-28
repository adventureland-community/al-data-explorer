import { craftRowKey, formatCraftCost, parseCraftRow, totalCraftCost } from "../craftRecipe";

describe("parseCraftRow", () => {
  it("parses quantity, item, and optional level", () => {
    expect(parseCraftRow([2, "gem0"])).toStrictEqual({
      quantity: 2,
      itemKey: "gem0",
      level: undefined,
      title: undefined,
    });
    expect(parseCraftRow([1, "blade", 9])).toStrictEqual({
      quantity: 1,
      itemKey: "blade",
      level: 9,
      title: undefined,
    });
    expect(parseCraftRow([1, "open", "armorx"] as never)).toStrictEqual({
      quantity: 1,
      itemKey: "open",
      level: undefined,
      title: "armorx",
    });
  });

  it("builds stable row keys", () => {
    expect(craftRowKey({ itemKey: "blade" as never, level: 9, quantity: 1 })).toBe("blade-9--1");
    expect(craftRowKey({ itemKey: "open" as never, title: "armorx" as never, quantity: 1 })).toBe(
      "open-0-armorx-1",
    );
  });
});

describe("formatCraftCost", () => {
  it("formats gold amounts with a g suffix", () => {
    expect(formatCraftCost(100000)).toBe("100,000g");
  });
});

describe("totalCraftCost", () => {
  it("multiplies per-craft cost by batch count", () => {
    expect(totalCraftCost(5000, 3)).toBe(15000);
  });
});
