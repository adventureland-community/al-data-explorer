import { damageMultiplier } from "../damageMultiplier";
import {
  averageRogueStackBonus,
  buildSustainLines,
  evasionHitFactor,
  onHitSustain,
  rogueStackDpsBoost,
  targetFortitudeMult,
} from "../hitModifiers";
import { estimateHitDamage } from "../estimateHitDamage";

describe("hitModifiers", () => {
  it("evasion reduces physical hit factor", () => {
    expect(evasionHitFactor({ damage_type: "physical" }, { evasion: 20 })).toBeCloseTo(0.8);
    expect(evasionHitFactor({ damage_type: "magical" }, { evasion: 20 })).toBe(1);
  });

  it("FOR on target reduces damage via damage_multiplier", () => {
    const mult = targetFortitudeMult({ for: 10 });
    expect(mult).toBeCloseTo(damageMultiplier(50), 4);
  });

  it("lifesteal scales with hit and target hp cap", () => {
    const full = onHitSustain({ lifesteal: 10 }, 500, 10_000);
    const capped = onHitSustain({ lifesteal: 10 }, 500, 100);
    expect(full.lifestealHp).toBe(50);
    expect(capped.lifestealHp).toBe(10);
  });

  it("rogue stack average grows with hit count", () => {
    expect(averageRogueStackBonus(10)).toBe(5.5);
    expect(averageRogueStackBonus(4000)).toBe((2000 + 1) / 2);
  });

  it("estimateHitDamage applies evasion and FOR", () => {
    const source = { attack: 100, frequency: 1, damage_type: "physical" as const };
    const plain = estimateHitDamage(source, { armor: 0 });
    const evasive = estimateHitDamage(source, { armor: 0, evasion: 50 });
    const fort = estimateHitDamage(source, { armor: 0, for: 20 });
    expect(evasive.damage).toBeLessThan(plain.damage);
    expect(fort.damage).toBeLessThan(plain.damage);
  });

  it("buildSustainLines returns per-second heal and mana", () => {
    const lines = buildSustainLines({ lifesteal: 5, manasteal: 3 }, 200, 2);
    expect(lines.find((l) => l.key === "lifesteal")?.perSecond).toBe(20);
    expect(lines.find((l) => l.key === "manasteal")?.perSecond).toBe(12);
  });

  it("rogueStackDpsBoost only applies to rogue", () => {
    expect(
      rogueStackDpsBoost({
        classKey: "mage",
        frequency: 2,
        hitDamage: 50,
        sourceAttack: 50,
        simDurationMs: 30_000,
      }),
    ).toBeNull();
    expect(
      rogueStackDpsBoost({
        classKey: "rogue",
        frequency: 2,
        hitDamage: 50,
        sourceAttack: 50,
        simDurationMs: 30_000,
      })?.dps,
    ).toBeGreaterThan(0);
  });
});
