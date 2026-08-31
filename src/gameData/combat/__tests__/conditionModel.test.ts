import { burnTickDamage, burnTicksInDuration, burnTotalDamageFromProc } from "../conditionModel";
import { collectSplashHitStats } from "../abilityProc";
import { damageMultiplier } from "../damageMultiplier";
import { estimateHitDamage } from "../estimateHitDamage";

describe("conditionModel burn", () => {
  it("tick damage is ceil(intensity/5)", () => {
    expect(burnTickDamage(100)).toBe(20);
    expect(burnTickDamage(101)).toBe(21);
  });

  it("full burn window has 23 ticks at 210ms interval", () => {
    expect(burnTicksInDuration(5000)).toBe(23);
  });

  it("burn total scales with hit damage", () => {
    const small = burnTotalDamageFromProc(50);
    const large = burnTotalDamageFromProc(200);
    expect(large).toBeGreaterThan(small);
    expect(small).toBe(burnTickDamage(50) * 23);
  });
});

describe("estimateHitDamage crit", () => {
  it("uses expected crit multiplier before mitigation semantics", () => {
    const source = {
      attack: 100,
      frequency: 1,
      damage_type: "physical" as const,
      crit: 50,
      critdamage: 100,
    };
    const target = { armor: 0, resistance: 0 };
    const { damage } = estimateHitDamage(source, target);
    // 50% crit at 3x → E[mult] = 1 + 0.5 * 2 = 2.0
    expect(damage).toBeCloseTo(200, 1);
  });
});

describe("splash mitigation", () => {
  it("does not apply piercing to splash targets", () => {
    const withPierce = collectSplashHitStats({ damage_type: "magical" }, { resistance: 100 }, [
      { key: "blast", label: "Blast", intensity: 40 },
    ]);
    const mult = damageMultiplier(100);
    expect(withPierce[0].damagePerTarget).toBeCloseTo((mult * 40) / 100, 4);
  });
});
