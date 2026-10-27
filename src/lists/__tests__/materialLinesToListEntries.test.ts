import { materialLinesToListEntries } from "../materialLinesToListEntries";

describe("materialLinesToListEntries", () => {
  const label = (key: string) => {
    if (key === "_stacks") return "Failstack / ograce farms";
    if (key === "_craft_fee") return "Craft fees";
    return key;
  };

  it("maps catalog materials to itemKey + ceil qty", () => {
    const rows = materialLinesToListEntries(
      [
        { itemKey: "scroll0", expectedQty: 2.2, unitPrice: 100, total: 220 },
        { itemKey: "helmet", expectedQty: 0.4, unitPrice: 50, total: 20 },
      ],
      label,
    );
    expect(rows).toStrictEqual([
      { itemKey: "scroll0", qty: 3 },
      { itemKey: "helmet", qty: 1 },
    ]);
  });

  it("turns pseudo-keys into free-text notes", () => {
    const rows = materialLinesToListEntries(
      [
        { itemKey: "_stacks", expectedQty: 1, unitPrice: 1000, total: 1000 },
        { itemKey: "_craft_fee", expectedQty: 1, unitPrice: 500, total: 500 },
        { itemKey: "scroll3", expectedQty: 1.1, unitPrice: 10, total: 11 },
      ],
      label,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]?.itemKey).toBeUndefined();
    expect(rows[0]?.qty).toBe(1);
    expect(rows[0]?.note).toMatch(/^Failstack \/ ograce farms \(plan EV .+g\)$/);
    expect(rows[1]?.note).toContain("Craft fees");
    expect(rows[2]).toStrictEqual({ itemKey: "scroll3", qty: 2 });
  });
});
