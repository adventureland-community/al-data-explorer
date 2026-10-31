import { readFileSync } from "fs";
import { join } from "path";
import { ItemKey } from "typed-adventureland";

import { computeLoadoutStats, contributionsForStat } from "../loadoutStats";

function loadG() {
  const raw = JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as {
    items: Record<string, unknown>;
    titles: Record<string, unknown>;
    classes: Record<string, unknown>;
    sets: Record<string, unknown>;
  };
  return raw;
}

describe("computeLoadoutStats titles and scrolls", () => {
  const data = loadG();
  const G = data as never;
  const mage = {
    className: "mage",
    ...(data.classes.mage as object),
  } as never;

  const furyLuckyEvasion = {
    helmet: {
      name: "fury" as ItemKey,
      level: 0,
      p: "lucky" as never,
      stat_type: "evasion" as const,
    },
  };

  it("applies lucky title luck and vit scroll instead of raw stat", () => {
    const stats = computeLoadoutStats({
      characterClass: mage,
      level: 1,
      gear: {
        helmet: {
          name: "partyhat" as ItemKey,
          level: 0,
          p: "lucky" as never,
          stat_type: "vit",
        },
      },
      G,
    });
    expect(stats.luck).toBe(2);
    expect(stats.vit).toBeGreaterThanOrEqual(1);
    expect(stats.stat).toBeUndefined();
  });

  it("includes title and scroll stats even when no class is selected", () => {
    const stats = computeLoadoutStats({
      level: 1,
      gear: furyLuckyEvasion,
      G,
    });
    expect(stats.luck).toBe(2);
    expect(stats.evasion).toBeCloseTo(0.325, 2);
    expect(stats.armor).toBe(10);
    expect(stats.apiercing).toBe(20);
    expect(stats.crit).toBe(6);
  });

  it("with a class still includes title luck and scroll evasion", () => {
    const stats = computeLoadoutStats({
      characterClass: mage,
      level: 1,
      gear: furyLuckyEvasion,
      G,
    });
    expect(stats.luck).toBe(2);
    expect(stats.evasion).toBeCloseTo(0.325, 2);
    expect(stats.armor).toBeGreaterThanOrEqual(10);
  });

  it("lists whiskey as the dominant apiercing contributor", () => {
    const gear = {
      mainhand: { name: "cave_locktooth" as ItemKey, level: 9 },
      chest: { name: "tshirt7" as ItemKey, level: 7 },
      helmet: { name: "fury" as ItemKey, level: 7 },
      gloves: { name: "goldenpowerglove" as ItemKey, level: 7 },
      pants: { name: "pants" as ItemKey, level: 8 },
      shoes: { name: "shoes" as ItemKey, level: 8 },
      elixir: { name: "whiskey" as ItemKey, level: 0 },
    };
    const rows = contributionsForStat({
      stat: "apiercing",
      gear,
      G,
      classKey: "warrior",
    });
    expect(rows[0]).toMatchObject({ kind: "gear", itemKey: "whiskey", value: 500 });
    const gearAp = rows.reduce((sum, r) => sum + r.value, 0);
    const sheet = computeLoadoutStats({
      characterClass: {
        className: "warrior",
        ...(data.classes.warrior as object),
      } as never,
      level: 80,
      gear,
      G,
    });
    expect(sheet.apiercing).toBe(857);
    expect(gearAp).toBe(857);
  });

  it("includes class doublehand slot-table mods in contributions", () => {
    const warrior = {
      className: "warrior",
      ...(data.classes.warrior as object),
    } as never;
    const gear = {
      mainhand: { name: "axe3" as ItemKey, level: 0 },
    };
    const rows = contributionsForStat({
      stat: "frequency",
      gear,
      G,
      characterClass: warrior,
    });
    const slot = rows.find((r) => r.kind === "slotMod");
    expect(slot).toMatchObject({
      kind: "slotMod",
      table: "doublehand",
      wtype: "axe",
      value: -0.1,
    });
  });
});
