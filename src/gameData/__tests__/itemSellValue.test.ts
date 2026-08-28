import { calculateItemNpcSellValue } from "../itemSellValue";

describe("calculateItemNpcSellValue", () => {
  const G = {
    items: {
      scroll0: { g: 200 },
      scroll1: { g: 400 },
      scroll2: { g: 1200 },
      cscroll0: { g: 240 },
      cscroll1: { g: 480 },
      cscroll2: { g: 1440 },
    },
  } as never;

  it("returns 60% of base gold for plain items", () => {
    expect(calculateItemNpcSellValue({ name: "sword", level: 0 }, { g: 1000 } as never, G)).toBe(
      600,
    );
  });

  it("uses full base gold for cash items", () => {
    expect(
      calculateItemNpcSellValue({ name: "gem", level: 0 }, { g: 1000, cash: 289 } as never, G),
    ).toBe(1000);
  });

  it("scales upgrade levels like calculate_item_value", () => {
    const value = calculateItemNpcSellValue(
      { name: "blade", level: 1 },
      { g: 10000, upgrade: { attack: 10 }, grades: [9, 10, 11, 12] } as never,
      G,
    );
    expect(value).toBeGreaterThan(6000);
  });
});
