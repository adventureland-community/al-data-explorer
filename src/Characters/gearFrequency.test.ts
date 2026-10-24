import { gearFrequencyFromLoadouts } from "./gearFrequency";
import { CharacterLoadout } from "./fetchCharacterLoadout";

describe("gearFrequencyFromLoadouts", () => {
  it("counts unique items per character and tracks max level", () => {
    const loadouts: CharacterLoadout[] = [
      {
        name: "A",
        classKey: "warrior",
        level: 100,
        gear: {
          mainhand: { name: "fireblade", level: 9 },
          helmet: { name: "helmet", level: 8 },
        },
      },
      {
        name: "B",
        classKey: "warrior",
        level: 99,
        gear: {
          mainhand: { name: "fireblade", level: 10 },
          chest: { name: "coat", level: 7 },
        },
      },
    ];

    const mage: CharacterLoadout = {
      name: "C",
      classKey: "mage",
      level: 80,
      gear: { mainhand: { name: "fireblade", level: 7 } },
    };
    const rows = gearFrequencyFromLoadouts(loadouts, [...loadouts, mage]);
    expect(rows[0]).toMatchObject({ itemKey: "fireblade", count: 2, maxLevel: 10 });
    expect(rows[0].alsoUsedBy).toEqual(["mage"]);
    expect(rows.find((r) => r.itemKey === "helmet")?.count).toBe(1);
  });
});
