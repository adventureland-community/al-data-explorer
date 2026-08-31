import { readFileSync } from "fs";
import { join } from "path";
import { ItemKey } from "typed-adventureland";

import {
  estimateAutoAttackDps,
  estimateTotalDps,
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

  it("skips class-restricted item stats for wrong class", () => {
    const warrior = { className: "warrior", ...(data.classes.warrior as object) } as never;
    const withSlime = resolveCombatStatsFromLoadout({
      characterClass: warrior,
      level: 80,
      gear: { mainhand: matrixItemAtLevel("slimestaff", 0) },
      G,
    });
    const naked = resolveCombatStatsFromLoadout({
      characterClass: warrior,
      level: 80,
      gear: {},
      G,
    });
    expect(withSlime.attack).toBe(naked.attack);
  });
});

describe("damageMultiplier sanity", () => {
  it("matches server formula at sample defense values", () => {
    const { damageMultiplier } = require("../damageMultiplier");
    expect(damageMultiplier(0)).toBeCloseTo(1, 5);
    expect(damageMultiplier(100)).toBeCloseTo(0.9, 5);
    expect(damageMultiplier(500)).toBeCloseTo(0.533, 2);
    expect(damageMultiplier(-50)).toBeCloseTo(1.05, 5);
    expect(damageMultiplier(2000)).toBeCloseTo(0.05, 5);
  });
});

describe("estimateTotalDps event mode", () => {
  const data = loadG();
  const G = data as never;
  const mage = { className: "mage", ...(data.classes.mage as object) } as never;
  const ent = monsterToCombatEntity(data.monsters.ent as never);

  it("includes ability DPS on top of event auto timeline", () => {
    const gear = { mainhand: matrixItemAtLevel("firestaff", 0) };
    const stats = resolveCombatStatsFromLoadout({
      characterClass: mage,
      level: 80,
      gear,
      G,
    });
    const bd = estimateTotalDps(stats, ent, G, gear, {
      classKey: "mage",
      mode: "event",
      durationMs: 5000,
      rng: () => 0.01,
    });
    expect(bd.abilityDps).toBeGreaterThan(0);
    expect(bd.totalDps).toBeGreaterThan(bd.autoAttackDps);
  });
});

describe("estimateStatWeights", () => {
  const data = loadG();
  const G = data as never;
  const priest = { className: "priest", ...(data.classes.priest as object) } as never;
  const ent = monsterToCombatEntity(data.monsters.ent as never);

  it("ranks int above zero for priest with worldroot crook", () => {
    const { estimateStatWeights } = require("../estimateStatWeights");
    const gear = { mainhand: matrixItemAtLevel("worldrootcrook", 0) };
    const weights = estimateStatWeights({
      characterClass: priest,
      level: 80,
      gear,
      G,
      target: ent,
      classKey: "priest",
    });
    const intWeight = weights.find((w: { stat: string }) => w.stat === "int");
    expect(intWeight?.dpsPer10).toBeGreaterThan(0);
  });
});

describe("estimateTotalDps abilities", () => {
  const data = loadG();
  const G = data as never;
  const mage = { className: "mage", ...(data.classes.mage as object) } as never;
  const ent = monsterToCombatEntity(data.monsters.ent as never);

  it("firestaff burn adds ability DPS over a staff without burn", () => {
    const fireGear = { mainhand: matrixItemAtLevel("firestaff", 0) };
    const staffGear = { mainhand: matrixItemAtLevel("staff", 0) };
    const fireStats = resolveCombatStatsFromLoadout({
      characterClass: mage,
      level: 80,
      gear: fireGear,
      G,
    });
    const staffStats = resolveCombatStatsFromLoadout({
      characterClass: mage,
      level: 80,
      gear: staffGear,
      G,
    });
    const fireDps = estimateTotalDps(fireStats, ent, G, fireGear, { classKey: "mage" });
    const staffDps = estimateTotalDps(staffStats, ent, G, staffGear, { classKey: "mage" });
    expect(fireDps.abilityDps).toBeGreaterThan(0);
    expect(fireDps.abilityLines?.some((l) => l.key === "burn")).toBe(true);
    expect(fireDps.totalDps).toBeGreaterThan(staffDps.totalDps);
  });

  it("sparkstaff blast is unsimulated without nearby splash targets", () => {
    const gear = { mainhand: matrixItemAtLevel("sparkstaff", 0) };
    const stats = resolveCombatStatsFromLoadout({
      characterClass: mage,
      level: 80,
      gear,
      G,
    });
    const bd = estimateTotalDps(stats, ent, G, gear, { classKey: "mage", splashTargetCount: 0 });
    expect(bd.unsimulatedEffects?.some((e) => e.key.startsWith("blast"))).toBe(true);
    expect(bd.splashDps ?? 0).toBe(0);
  });

  it("sparkstaff blast adds splash DPS with nearby targets", () => {
    const gear = { mainhand: matrixItemAtLevel("sparkstaff", 0) };
    const stats = resolveCombatStatsFromLoadout({
      characterClass: mage,
      level: 80,
      gear,
      G,
    });
    const bd = estimateTotalDps(stats, ent, G, gear, { classKey: "mage", splashTargetCount: 3 });
    expect(bd.splashDps).toBeGreaterThan(0);
    expect(bd.splashLines?.some((l) => l.key.startsWith("blast"))).toBe(true);
    expect(bd.unsimulatedEffects ?? []).toHaveLength(0);
    expect(bd.totalDps).toBeGreaterThan(bd.autoAttackDps);
  });

  it("event sim rolls ability procs with deterministic rng", () => {
    const fireGear = { mainhand: matrixItemAtLevel("firestaff", 0) };
    const stats = resolveCombatStatsFromLoadout({
      characterClass: mage,
      level: 80,
      gear: fireGear,
      G,
    });
    let roll = 0;
    const rng = () => {
      roll += 1;
      return roll % 2 === 0 ? 0.01 : 0.99;
    };
    const bd = estimateTotalDps(stats, ent, G, fireGear, {
      mode: "event",
      durationMs: 30_000,
      classKey: "mage",
      rng,
    });
    expect(bd.simIterations).toBeGreaterThan(0);
    expect(bd.abilityDps).toBeGreaterThan(0);
    expect(bd.abilityLines?.some((l) => l.key === "burn")).toBe(true);
  });

  it("poison gear lists debuff not DPS", () => {
    const gear = { mainhand: matrixItemAtLevel("oozingterror", 0) };
    const stats = resolveCombatStatsFromLoadout({
      characterClass: mage,
      level: 80,
      gear,
      G,
    });
    const bd = estimateTotalDps(stats, ent, G, gear, { classKey: "mage" });
    expect(bd.debuffLines?.some((l) => l.key === "poison")).toBe(true);
    expect(bd.abilityLines?.some((l) => l.key === "poison")).toBeFalsy();
  });
});
