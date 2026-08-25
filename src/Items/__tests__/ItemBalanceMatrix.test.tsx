import { isEquippable, isValidLevel, type LevelStats } from "../../gameData/compareStats";
import { pickRowStatKeys } from "../components/ItemBalanceMatrix";

describe("ItemBalanceMatrix filtering", () => {
  it("treats materials as non-equippable", () => {
    expect(isEquippable({ type: "material" } as never)).toBe(false);
    expect(isEquippable({ type: "weapon", wtype: "staff" } as never)).toBe(true);
  });

  it("marks invalid upgrade levels as blank cells", () => {
    const item = { type: "weapon", compound: { stat: 1 } } as never;
    expect(isValidLevel(item, 0)).toBe(true);
    expect(isValidLevel(item, 7)).toBe(true);
    expect(isValidLevel(item, 8)).toBe(false);
  });
});

describe("pickRowStatKeys", () => {
  it("keeps armor in the row set when it only matches baseline at some levels", () => {
    // Fiery Gloves vs a baseline that ties on armor at +2/+3 but differs elsewhere.
    const levelStats: LevelStats[] = [
      { armor: 11, dex: 0, range: 0, resistance: 6, stat: 1 },
      { armor: 13, dex: 0, range: 0, resistance: 8, stat: 2 },
      { armor: 14, dex: 0, range: 0, resistance: 9, stat: 3 },
      { armor: 15, dex: 0, range: 0, resistance: 11, stat: 4 },
      { armor: 17, dex: 0, range: 0, resistance: 12, stat: 5 },
    ];
    const baseline: LevelStats[] = [
      { armor: 10, dex: 2, range: 29, resistance: 2, stat: 0 },
      { armor: 12, dex: 2, range: 34, resistance: 0, stat: 0 },
      { armor: 14, dex: 4, range: 37, resistance: 4, stat: 0 },
      { armor: 15, dex: 5, range: 31, resistance: 0, stat: 0 },
      { armor: 18, dex: 6, range: 34, resistance: 0, stat: 0 },
    ];

    const keys = pickRowStatKeys(levelStats, baseline);
    expect(keys).toContain("armor");
    expect(keys).toContain("dex");
    expect(keys).toContain("range");
    expect(keys).toContain("resistance");
    expect(keys).toContain("stat");
  });
});
