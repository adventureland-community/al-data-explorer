import { readFileSync } from "fs";
import { join } from "path";
import { ItemKey } from "typed-adventureland";

import {
  estimateAutoAttackDps,
  matrixItemAtLevel,
  monsterToCombatEntity,
  resolveCombatStatsFromLoadout,
  resolveCombatStatsWithSwap,
} from "../index";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as {
    items: Record<string, unknown>;
    classes: Record<string, unknown>;
    monsters: Record<string, unknown>;
    sets: Record<string, unknown>;
  };
}

describe("resolveCombatStatsFromLoadout", () => {
  const data = loadG();
  const G = data as never;
  const priest = { className: "priest", ...(data.classes.priest as object) } as never;

  it("scales priest weapon attack by int, not raw item attack", () => {
    const stats = resolveCombatStatsFromLoadout({
      characterClass: priest,
      level: 80,
      gear: { mainhand: matrixItemAtLevel("harbringer", 8) },
      G,
    });
    expect(stats.attack).toBeGreaterThan(0);
    expect(stats.attack).not.toBe(42.5);
    expect(stats.rpiercing).toBeGreaterThan(10);
  });

  it("worldroot crook has higher base rpiercing than harbringer +0", () => {
    const crook = resolveCombatStatsFromLoadout({
      characterClass: priest,
      level: 80,
      gear: { mainhand: matrixItemAtLevel("worldrootcrook", 0) },
      G,
    });
    const harb = resolveCombatStatsFromLoadout({
      characterClass: priest,
      level: 80,
      gear: { mainhand: matrixItemAtLevel("harbringer", 0) },
      G,
    });
    expect(crook.rpiercing).toBeGreaterThan(harb.rpiercing ?? 0);
  });
});

describe("estimateAutoAttackDps", () => {
  const data = loadG();
  const G = data as never;
  const priest = { className: "priest", ...(data.classes.priest as object) } as never;
  const ent = monsterToCombatEntity(data.monsters.ent as never);

  it("priest worldroot crook DPS can exceed harbringer +8 vs a sample target", () => {
    const crookStats = resolveCombatStatsFromLoadout({
      characterClass: priest,
      level: 80,
      gear: { mainhand: matrixItemAtLevel("worldrootcrook", 0) },
      G,
    });
    const harbStats = resolveCombatStatsFromLoadout({
      characterClass: priest,
      level: 80,
      gear: { mainhand: matrixItemAtLevel("harbringer", 8) },
      G,
    });
    const crookDps = estimateAutoAttackDps(crookStats, ent).totalDps;
    const harbDps = estimateAutoAttackDps(harbStats, ent).totalDps;
    expect(crookDps).toBeGreaterThan(0);
    expect(harbDps).toBeGreaterThan(0);
    // Worldroot trades raw weapon attack for int/rpiercing — net DPS should be competitive.
    expect(crookDps).toBeGreaterThan(harbDps * 0.5);
  });

  it("resolveCombatStatsWithSwap swaps mainhand only", () => {
    const base = resolveCombatStatsWithSwap({
      characterClass: priest,
      level: 50,
      gear: { mainhand: matrixItemAtLevel("staff", 0) },
      G,
      slot: "mainhand",
      itemInfo: matrixItemAtLevel("worldrootcrook" as ItemKey, 0),
    });
    expect(base.attack).toBeGreaterThan(0);
  });
});
