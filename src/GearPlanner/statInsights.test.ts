import { damageMultiplier, effectiveDefense } from "./calculations";
import {
  mitigationCurveByPierce,
  pierceToHardCap,
  pierceWaste,
  statusChanceCurve,
  statusDurationCurve,
  statusResistInsight,
  wasteChipsForLoadout,
} from "./statInsights";

describe("pierceToHardCap", () => {
  it("returns pierce where multiplier hits 1.32", () => {
    const defense = 100;
    const p = pierceToHardCap(defense);
    expect(damageMultiplier(effectiveDefense(defense, p))).toBeCloseTo(1.32);
    if (p > 0) {
      expect(damageMultiplier(effectiveDefense(defense, p - 1))).toBeLessThan(1.32);
    }
  });
});

describe("pierceWaste", () => {
  it("flags unused rpiercing on physical", () => {
    const w = pierceWaste({
      damageType: "physical",
      apiercing: 10,
      rpiercing: 40,
      monsterArmor: 100,
    });
    expect(w.activePierceStat).toBe("apiercing");
    expect(w.unusedPierceStat).toBe("rpiercing");
    expect(w.unusedPierce).toBe(40);
    expect(w.hints.some((h) => h.includes("rpiercing"))).toBe(true);
  });

  it("flags unused apiercing on magical", () => {
    const w = pierceWaste({
      damageType: "magical",
      apiercing: 50,
      rpiercing: 5,
      monsterResistance: 80,
    });
    expect(w.activePierceStat).toBe("rpiercing");
    expect(w.unusedPierce).toBe(50);
  });

  it("reports pierce past hard cap", () => {
    const defense = 0;
    const cap = pierceToHardCap(defense);
    const w = pierceWaste({
      damageType: "physical",
      apiercing: cap + 20,
      monsterArmor: defense,
    });
    expect(w.piercePastHardCap).toBe(20);
    expect(w.multiplier).toBeCloseTo(1.32);
    expect(w.marginalMultFromPlusOne).toBeCloseTo(0);
  });

  it("pure ignores both pierces", () => {
    const w = pierceWaste({
      damageType: "pure",
      apiercing: 10,
      rpiercing: 10,
      monsterArmor: 500,
    });
    expect(w.multiplier).toBe(1);
    expect(w.hints.some((h) => /pure/i.test(h))).toBe(true);
  });
});

describe("mitigationCurveByPierce", () => {
  it("samples rising then capped multiplier", () => {
    const pts = mitigationCurveByPierce({ defense: 100, pierceFrom: 0, pierceTo: 600, steps: 30 });
    expect(pts[0]?.y).toBeCloseTo(90);
    expect(pts[pts.length - 1]?.y).toBeCloseTo(132);
  });
});

describe("statusResistInsight", () => {
  const conditions = {
    poisoned: { name: "Poison", defense: "pnresistance", debuff: true },
    burned: { name: "Burned", defense: "firesistance", debuff: true },
    stunned: { name: "Stunned", defense: "phresistance", debuff: true },
    frozen: { name: "Frozen", defense: "fzresistance", debuff: true },
    cursed: { name: "Cursed", debuff: true },
  };

  it("lists chance conditions and overcap at 100+", () => {
    const at50 = statusResistInsight("pnresistance", 50, conditions);
    expect(at50.chanceResistPercent).toBe(50);
    expect(at50.durationRemainingFraction).toBeCloseTo(0.5);
    expect(at50.overcap).toBe(false);
    expect(at50.chanceConditions.map((c) => c.key)).toContain("poisoned");

    const at120 = statusResistInsight("pnresistance", 120, conditions);
    expect(at120.chanceResistPercent).toBe(100);
    expect(at120.overcap).toBe(true);
    expect(at120.hints.length).toBeGreaterThan(0);
  });

  it("stresistance notes global debuff duration", () => {
    const s = statusResistInsight("stresistance", 25, conditions);
    expect(s.notes.some((n) => /debuff/i.test(n))).toBe(true);
    expect(s.durationRemainingFraction).toBeCloseTo(0.75);
  });
});

describe("status curves", () => {
  it("chance caps at 100 and duration hits 0 at 100", () => {
    const chance = statusChanceCurve(0, 150, 15);
    expect(chance[chance.length - 1]?.y).toBe(100);
    const dur = statusDurationCurve(0, 150, 15);
    const at100 = dur.find((p) => Math.abs(p.x - 100) < 1);
    expect(at100?.y).toBeCloseTo(0);
  });
});

describe("wasteChipsForLoadout", () => {
  it("includes unused pierce and status overcap chips", () => {
    const chips = wasteChipsForLoadout({
      damageType: "physical",
      apiercing: 0,
      rpiercing: 12,
      monsterArmor: 50,
      statusResists: { pnresistance: 100 },
    });
    expect(chips.some((c) => c.includes("rpiercing"))).toBe(true);
    expect(chips.some((c) => c.includes("pnresistance"))).toBe(true);
  });
});
