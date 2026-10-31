import {
  damageMultiplier,
  effectiveDefense,
  expectedHitDamage,
  hitDamageRange,
  mitigationBreakdown,
  theo_dps,
} from "./calculations";

describe("damageMultiplier (upstream damage_multiplier)", () => {
  it("matches golden bands from old_common_functions.js", () => {
    expect(damageMultiplier(0)).toBe(1);
    expect(damageMultiplier(100)).toBeCloseTo(0.9);
    expect(damageMultiplier(200)).toBeCloseTo(0.8);
    expect(damageMultiplier(400)).toBeCloseTo(0.615);
    expect(damageMultiplier(800)).toBeCloseTo(0.353);
    expect(damageMultiplier(1000)).toBeCloseTo(0.273);
  });

  it("increases damage for negative (overpierce) defense", () => {
    expect(damageMultiplier(-50)).toBeCloseTo(1.05);
    expect(damageMultiplier(-100)).toBeCloseTo(1.0875);
    expect(damageMultiplier(-200)).toBeCloseTo(1.125);
  });

  it("clamps to [0.05, 1.32]", () => {
    expect(damageMultiplier(50_000)).toBe(0.05);
    expect(damageMultiplier(-50_000)).toBe(1.32);
  });
});

describe("effectiveDefense", () => {
  it("applies the live 2× pierce quirk", () => {
    expect(effectiveDefense(200, 50)).toBe(100);
    expect(effectiveDefense(100, 100)).toBe(-100);
  });
});

describe("mitigationBreakdown", () => {
  it("uses armor + apiercing for physical", () => {
    const b = mitigationBreakdown(
      { damage_type: "physical", apiercing: 40, rpiercing: 999 },
      { armor: 200, resistance: 500 },
    );
    expect(b.damageType).toBe("physical");
    expect(b.defenseStat).toBe("armor");
    expect(b.pierceStat).toBe("apiercing");
    expect(b.defense).toBe(200);
    expect(b.pierce).toBe(40);
    expect(b.effectiveDefense).toBe(120);
    expect(b.multiplier).toBeCloseTo(damageMultiplier(120));
  });

  it("uses resistance + rpiercing for magical", () => {
    const b = mitigationBreakdown(
      { damage_type: "magical", apiercing: 999, rpiercing: 25 },
      { armor: 500, resistance: 150 },
    );
    expect(b.damageType).toBe("magical");
    expect(b.defenseStat).toBe("resistance");
    expect(b.pierceStat).toBe("rpiercing");
    expect(b.effectiveDefense).toBe(100);
    expect(b.multiplier).toBeCloseTo(0.9);
  });

  it("returns multiplier 1 for pure", () => {
    const b = mitigationBreakdown(
      { damage_type: "pure", apiercing: 100 },
      { armor: 500, resistance: 500 },
    );
    expect(b.defenseStat).toBe("none");
    expect(b.pierceStat).toBe("none");
    expect(b.multiplier).toBe(1);
    expect(b.effectiveDefense).toBe(0);
  });

  it("defaults unknown damage_type to physical", () => {
    const b = mitigationBreakdown({ apiercing: 0 }, { armor: 0 });
    expect(b.damageType).toBe("physical");
    expect(b.multiplier).toBe(1);
  });
});

describe("expectedHitDamage / theo_dps / hitDamageRange", () => {
  const source = {
    damage_type: "physical" as const,
    attack: 100,
    apiercing: 50,
    frequency: 1,
    crit: 0,
  };
  const target = { armor: 100 };

  it("expected hit is attack × multiplier when no crit", () => {
    // effective = 100 - 2*50 = 0 → mult 1
    expect(expectedHitDamage(source, target)).toBeCloseTo(100);
    expect(theo_dps(source, target)).toBeCloseTo(100);
  });

  it("hit range spans 0.9–1.1 of raw attack × mult", () => {
    const { low, high } = hitDamageRange(source, target);
    expect(low).toBeCloseTo(90);
    expect(high).toBeCloseTo(110);
  });

  it("folds crit into expected hit", () => {
    const withCrit = { ...source, crit: 100, critdamage: 0 };
    // 100% crit → damage += damage * 1 * 2 → 3×
    expect(expectedHitDamage(withCrit, target)).toBeCloseTo(300);
  });
});
