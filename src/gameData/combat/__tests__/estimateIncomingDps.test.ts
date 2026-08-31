import { readFileSync } from "fs";
import { join } from "path";

import { estimateIncomingDps } from "../estimateIncomingDps";
import {
  estimateTotalDps,
  incomingReflectionFactor,
  monsterToCombatEntity,
  outgoingReflectionRisk,
} from "../index";
import { resolveCombatStatsFromLoadout, matrixItemAtLevel } from "../resolveCombatStats";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as {
    classes: Record<string, unknown>;
    monsters: Record<string, unknown>;
  };
}

describe("estimateIncomingDps", () => {
  const player = {
    attack: 100,
    frequency: 2,
    damage_type: "physical" as const,
    armor: 200,
    resistance: 100,
    evasion: 40,
    hp: 1000,
    reflection: 50,
  };

  it("monster physical DPS is reduced by player armor and evasion", () => {
    const monster = {
      attack: 500,
      frequency: 1.2,
      damage_type: "physical" as const,
    };
    const incoming = estimateIncomingDps(monster, player);
    expect(incoming.totalDps).toBeGreaterThan(0);
    expect(incoming.totalDps).toBeLessThan(500 * 1.2);
    expect(incoming.evasionFactor).toBeCloseTo(0.6);
    expect(incoming.secondsToDeath).toBeGreaterThan(0);
  });

  it("player reflection blocks magical monster DPS", () => {
    const monster = {
      attack: 400,
      frequency: 1,
      damage_type: "magical" as const,
    };
    const withReflect = estimateIncomingDps(monster, player);
    const noReflect = estimateIncomingDps(monster, { ...player, reflection: 0 });
    expect(withReflect.totalDps).toBeLessThan(noReflect.totalDps);
    expect(withReflect.reflectionFactor).toBe(0.5);
  });

  it("zapper zap ability adds incoming DPS beyond autos", () => {
    const data = loadG();
    const G = data as never;
    const zapper = data.monsters.zapper0 as { abilities?: Record<string, unknown> };
    const monster = monsterToCombatEntity(zapper as never);
    const incoming = estimateIncomingDps(monster, player, { G, abilities: zapper.abilities });
    expect(incoming.abilityDps).toBeGreaterThan(0);
    expect(incoming.abilityLines?.some((l) => l.key === "mability:zap")).toBe(true);
    expect(incoming.totalDps).toBeGreaterThan(incoming.autoAttackDps);
  });

  it("dragold multi_burn adds fireball ability DPS", () => {
    const data = loadG();
    const G = data as never;
    const dragold = data.monsters.dragold as {
      attack: number;
      frequency: number;
      abilities?: Record<string, unknown>;
    };
    const monster = monsterToCombatEntity(dragold as never);
    const incoming = estimateIncomingDps(monster, player, { G, abilities: dragold.abilities });
    expect(incoming.abilityLines?.some((l) => l.key === "mability:multi_burn")).toBe(true);
    expect(incoming.abilityDps).toBeGreaterThan(0);
  });

  it("monster crit increases expected incoming auto DPS", () => {
    const monster = {
      attack: 500,
      frequency: 1,
      damage_type: "physical" as const,
      crit: 20,
    };
    const withCrit = estimateIncomingDps(monster, player);
    const withoutCrit = estimateIncomingDps({ ...monster, crit: 0 }, player);
    expect(withCrit.critFactor).toBeGreaterThan(1);
    expect(withCrit.autoAttackDps).toBeGreaterThan(withoutCrit.autoAttackDps);
  });
});

describe("assumeMarked outgoing DPS", () => {
  const data = loadG();
  const G = data as never;
  const ranger = { className: "ranger", ...(data.classes.ranger as object) } as never;
  const ent = monsterToCombatEntity(data.monsters.ent as never);
  const gear = { mainhand: matrixItemAtLevel("bow", 0) };
  const stats = resolveCombatStatsFromLoadout({
    characterClass: ranger,
    level: 80,
    gear,
    G,
  });

  it("increases total DPS by 10% when marked is assumed", () => {
    const plain = estimateTotalDps(stats, ent, G, gear, { classKey: "ranger" });
    const marked = estimateTotalDps(stats, ent, G, gear, {
      classKey: "ranger",
      assumeMarked: true,
    });
    expect(marked.totalDps / plain.totalDps).toBeCloseTo(1.1, 1);
    expect(marked.debuffLines?.some((l) => l.key === "marked")).toBe(true);
  });
});

describe("reflection helpers", () => {
  it("outgoingReflectionRisk applies to magical vs reflective targets", () => {
    const risk = outgoingReflectionRisk({ damage_type: "magical" }, { reflection: 20 }, 100, 2);
    expect(risk?.perSecond).toBe(40);
  });

  it("incomingReflectionFactor is 1 for physical", () => {
    expect(incomingReflectionFactor({ damage_type: "physical" }, { reflection: 100 })).toBe(1);
  });
});
