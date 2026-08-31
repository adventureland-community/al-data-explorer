import { avoidanceHitFactor, incDmgAmpMult, missHitFactor } from "../hitModifiers";
import { estimateHitDamage } from "../estimateHitDamage";
import type { CombatEntity } from "../types";

describe("miss and avoidance", () => {
  it("missHitFactor reduces expected hit rate", () => {
    expect(missHitFactor({ miss: 20 })).toBeCloseTo(0.8);
    expect(missHitFactor({})).toBe(1);
  });

  it("avoidanceHitFactor reduces expected hit rate", () => {
    expect(avoidanceHitFactor({ avoidance: 10 })).toBeCloseTo(0.9);
  });

  it("combined miss and avoidance multiply in estimateHitDamage", () => {
    const source: CombatEntity = {
      attack: 100,
      frequency: 1,
      damage_type: "physical",
      miss: 20,
    };
    const target = { armor: 0, avoidance: 10 };
    const { damage } = estimateHitDamage(source, target);
    expect(damage).toBeCloseTo(100 * 0.8 * 0.9);
  });
});

describe("incdmgamp", () => {
  it("amplifies damage taken on cursed targets", () => {
    expect(incDmgAmpMult({ incdmgamp: 20 })).toBeCloseTo(1.2);
    const source: CombatEntity = { attack: 100, frequency: 1, damage_type: "physical" };
    const base = estimateHitDamage(source, { armor: 0 }).damage;
    const cursed = estimateHitDamage(source, { armor: 0, incdmgamp: 20 }).damage;
    expect(cursed / base).toBeCloseTo(1.2);
  });
});
