import { calculateClassStatByLevel } from "../classLevelStats";
import { adoptExtras, calculateItemStatsByLevel } from "../itemProperties";
import {
  isDoublehandWeapon,
  loadoutHasDoublehandConflict,
  withDoublehandEquipInvariant,
} from "../loadoutStats";
import { pickRowStatKeys } from "../../Items/components/ItemBalanceMatrix";
import type { LevelStats } from "../compareStats";

describe("classLevelStats", () => {
  // Grounded in adventureland_mongodb main node/server.js calculate_player_stats
  it("uses subtract after level 80", () => {
    const base = 10;
    const lstat = 1;
    expect(calculateClassStatByLevel(base, lstat, 40)).toBe(10 + 40);
    expect(calculateClassStatByLevel(base, lstat, 41)).toBe(Math.floor(10 + 1 * (41 + 1)));
    expect(calculateClassStatByLevel(base, lstat, 81)).toBe(
      Math.floor(10 + 1 * (81 + 41 + 26 + 16 - 1)),
    );
    const at80 = calculateClassStatByLevel(base, lstat, 80);
    const at81 = calculateClassStatByLevel(base, lstat, 81);
    expect(at81 - at80).toBe(3); // effective 3× after the −(l-80) term
  });
});

describe("itemProperties adoptExtras / class", () => {
  it("merges tigerhelmet rogue crit extras", () => {
    const def = {
      name: "Tiger Helmet",
      type: "helmet",
      crit: 0.5,
      rogue: { crit: 2, upgrade: { crit: 0.25 } },
      upgrade: { armor: 1 },
    } as never;
    const base = calculateItemStatsByLevel(def, 0);
    const rogue = calculateItemStatsByLevel(def, 0, undefined, { class: "rogue" });
    expect(base.crit).toBe(0.5);
    expect(rogue.crit).toBe(2.5);
    const rogueUp = calculateItemStatsByLevel(def, 1, undefined, { class: "rogue" });
    expect(rogueUp.crit).toBeCloseTo(2.75);
  });

  it("adoptExtras merges nested upgrade keys", () => {
    const def: Record<string, unknown> = {
      crit: 1,
      upgrade: { armor: 2 },
    };
    adoptExtras(def, { crit: 2, upgrade: { crit: 0.25 } });
    expect(def.crit).toBe(3);
    expect(def.upgrade).toStrictEqual({ armor: 2, crit: 0.25 });
  });
});

describe("loadoutStats doublehand", () => {
  const cls = {
    className: "priest",
    stats: {},
    lstats: {},
    doublehand: { wand: { frequency: 40 } },
    mainhand: {},
  };

  it("detects doublehand weapons and clears offhand on equip", () => {
    expect(isDoublehandWeapon(cls, { wtype: "wand", type: "weapon" } as never)).toBe(true);
    const next = withDoublehandEquipInvariant(
      cls,
      { offhand: { name: "shield" as never, level: 0 }, mainhand: { name: "bow" as never } },
      "mainhand",
      { name: "wand" as never, level: 0 },
      {
        wand: { wtype: "wand", type: "weapon" },
        shield: { type: "shield" },
        bow: { wtype: "bow", type: "weapon" },
      } as never,
    );
    expect(next.offhand).toBeUndefined();
    expect(next.mainhand?.name).toBe("wand");
  });

  it("flags MH+OH conflict", () => {
    expect(
      loadoutHasDoublehandConflict(
        cls,
        {
          mainhand: { name: "wand" as never },
          offhand: { name: "shield" as never },
        },
        {
          wand: { wtype: "wand", type: "weapon" },
          shield: { type: "shield" },
        } as never,
      ),
    ).toBe(true);
  });
});

describe("pickRowStatKeys explosion priority", () => {
  it("includes explosion for alloyquiver-like stats", () => {
    const levelStats: LevelStats[] = [
      { explosion: 2, dex: 2, armor: 15, resistance: 12, range: 20 },
      { explosion: 3.5, dex: 3.25, armor: 18.5, resistance: 15, range: 23.5 },
    ];
    const keys = pickRowStatKeys(levelStats);
    expect(keys).toContain("explosion");
    expect(keys.indexOf("explosion")).toBeLessThan(keys.indexOf("armor"));
  });
});
