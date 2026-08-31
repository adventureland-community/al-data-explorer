import { readFileSync } from "fs";
import { join } from "path";

import { estimateTotalDps, monsterToCombatEntity, resolveBestAutoSwing } from "../index";
import { resolveCombatStatsFromLoadout, matrixItemAtLevel } from "../resolveCombatStats";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as {
    classes: Record<string, unknown>;
    monsters: Record<string, unknown>;
  };
}

describe("resolveBestAutoSwing", () => {
  const data = loadG();
  const G = data as never;
  const ranger = { className: "ranger", ...(data.classes.ranger as object) } as never;
  const gear = { mainhand: matrixItemAtLevel("bow", 0) };
  const stats = resolveCombatStatsFromLoadout({
    characterClass: ranger,
    level: 80,
    gear,
    G,
  });
  const ent = monsterToCombatEntity(data.monsters.ent as never);

  it("piercingshot beats plain attack vs armored target", () => {
    const swing = resolveBestAutoSwing(stats, ent, G, {
      classKey: "ranger",
      playerLevel: 80,
      mainhandWtype: "bow",
    });
    expect(swing.skillKey).toBe("piercingshot");
    expect(swing.perSwingDamage).toBeGreaterThan(0);
  });

  it("3shot gains DPS with nearby splash targets", () => {
    const solo = resolveBestAutoSwing(stats, ent, G, {
      classKey: "ranger",
      playerLevel: 80,
      mainhandWtype: "bow",
      splashTargetCount: 0,
    });
    const mobbing = resolveBestAutoSwing(stats, ent, G, {
      classKey: "ranger",
      playerLevel: 80,
      mainhandWtype: "bow",
      splashTargetCount: 2,
    });
    expect(mobbing.perSwingDamage).toBeGreaterThan(solo.perSwingDamage);
  });
});

describe("attack-share in estimateTotalDps", () => {
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

  it("skill rotation uses piercingshot for ranger autos", () => {
    const withShare = estimateTotalDps(stats, ent, G, gear, {
      classKey: "ranger",
      useSkillRotation: true,
      playerLevel: 80,
      mainhandWtype: "bow",
    });
    const plain = estimateTotalDps(stats, ent, G, gear, { classKey: "ranger" });
    expect(withShare.abilityLines?.some((l) => l.key === "skill:piercingshot")).toBe(true);
    expect(withShare.autoAttackDps).toBeGreaterThan(plain.autoAttackDps);
  });
});
