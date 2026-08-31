import { comboDamageMultiplier } from "../comboMultiplier";
import { estimateTotalDps, monsterToCombatEntity, resolveCombatStatsFromLoadout } from "../index";
import { matrixItemAtLevel } from "../resolveCombatStats";

describe("comboDamageMultiplier", () => {
  it("returns 1 for single stack", () => {
    expect(comboDamageMultiplier(1, 100)).toBe(1);
  });

  it("ramps at combo 2 and caps by attack", () => {
    expect(comboDamageMultiplier(2, 100)).toBeCloseTo(1.62);
    expect(comboDamageMultiplier(2, 1000)).toBeCloseTo(1.2);
  });

  it("uses combo/4 above 10 stacks", () => {
    expect(comboDamageMultiplier(12, 50)).toBeCloseTo(3);
  });
});

describe("combo in estimateTotalDps", () => {
  const { readFileSync } = require("fs");
  const { join } = require("path");
  const data = JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8"));
  const G = data;
  const warrior = { className: "warrior", ...data.classes.warrior };
  const ent = monsterToCombatEntity(data.monsters.ent);
  const gear = { mainhand: matrixItemAtLevel("axe", 0) };
  const stats = resolveCombatStatsFromLoadout({
    characterClass: warrior,
    level: 80,
    gear,
    G,
  });

  it("increases auto DPS with mobbing combo stacks", () => {
    const solo = estimateTotalDps(stats, ent, G, gear, { classKey: "warrior", comboStacks: 1 });
    const mob = estimateTotalDps(stats, ent, G, gear, { classKey: "warrior", comboStacks: 5 });
    expect(mob.autoAttackDps).toBeGreaterThan(solo.autoAttackDps);
  });
});

describe("burst skill rotation", () => {
  const { readFileSync } = require("fs");
  const { join } = require("path");
  const data = JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8"));
  const G = data;
  const mage = { className: "mage", ...data.classes.mage };
  const ent = monsterToCombatEntity(data.monsters.ent);
  const gear = { mainhand: matrixItemAtLevel("firestaff", 0) };
  const stats = resolveCombatStatsFromLoadout({
    characterClass: mage,
    level: 80,
    gear,
    G,
  });

  it("mage burst adds skill DPS when MP pool is set", () => {
    const withBurst = estimateTotalDps(stats, ent, G, gear, {
      classKey: "mage",
      useSkillRotation: true,
      playerLevel: 80,
      playerMp: stats.mp,
    });
    const without = estimateTotalDps(stats, ent, G, gear, { classKey: "mage" });
    expect(withBurst.abilityLines?.some((l) => l.key === "skill:burst")).toBe(true);
    expect(withBurst.totalDps).toBeGreaterThan(without.totalDps);
  });
});
