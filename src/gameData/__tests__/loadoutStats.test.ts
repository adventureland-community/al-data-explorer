import { readFileSync } from "fs";
import { join } from "path";
import { ItemKey } from "typed-adventureland";

import { computeLoadoutStats } from "../loadoutStats";

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
});
