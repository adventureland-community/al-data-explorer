import {
  damageMultiplier,
  effectiveDefense,
  expectedHitBreakdown,
  expectedHitDamage,
  hitDamageRange,
  mitigationBreakdown,
  resolveDamageType,
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

  it("applies skill pierce once on basic attacks", () => {
    const b = mitigationBreakdown(
      { damage_type: "physical", apiercing: 10 },
      { armor: 100 },
      { skillPierce: 30 },
    );
    expect(b.effectiveDefense).toBe(100 - 20 - 30);
    expect(b.skillPierce).toBe(30);
  });

  it("uses heal half-defense path", () => {
    const b = mitigationBreakdown(
      { damage_type: "magical", rpiercing: 20 },
      { resistance: 100 },
      { path: "heal" },
    );
    expect(b.effectiveDefense).toBe((100 - 20) / 2);
  });

  it("reports heal as magical and ignores skill pierce", () => {
    const b = mitigationBreakdown(
      { damage_type: "physical", apiercing: 50, rpiercing: 20 },
      { armor: 200, resistance: 100 },
      { path: "heal", skillPierce: 500 },
    );
    expect(b.damageType).toBe("magical");
    expect(b.pierceStat).toBe("rpiercing");
    expect(b.defenseStat).toBe("resistance");
    expect(b.skillPierce).toBe(0);
    expect(b.effectiveDefense).toBe((100 - 20) / 2);
  });

  it("uses splash without pierce", () => {
    const b = mitigationBreakdown(
      { damage_type: "physical", apiercing: 50 },
      { armor: 80 },
      { path: "splash" },
    );
    expect(b.effectiveDefense).toBe(80);
    expect(b.multiplier).toBeCloseTo(damageMultiplier(80));
  });

  it("applies fortitude when attacker is player", () => {
    const b = mitigationBreakdown(
      { damage_type: "physical", attack: 100 },
      { armor: 0, for: 10 },
      { attackerIsPlayer: true },
    );
    expect(b.fortitudeMult).toBeCloseTo(damageMultiplier(50));
  });

  it("reduces land chance from evasion on physical", () => {
    const b = mitigationBreakdown(
      { damage_type: "physical" },
      { armor: 0, evasion: 25 },
      { path: "basic" },
    );
    expect(b.missChance).toBe(25);
    expect(b.landChance).toBeCloseTo(0.75);
  });
});

describe("resolveDamageType", () => {
  it("maps heal mainhand to magical", () => {
    expect(resolveDamageType({ damage_type: "physical" }, "heal")).toBe("magical");
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

  it("folds crit into expected hit as 2× base (live complete_attack)", () => {
    const withCrit = { ...source, crit: 100, critdamage: 0 };
    // 100% crit × cmult 2 → EV = base × (1 + 1*(2−1)) = 2×
    expect(expectedHitDamage(withCrit, target)).toBeCloseTo(200);
  });

  it("adds critdamage onto the crit multiplier", () => {
    const withCrit = { ...source, crit: 50, critdamage: 50 };
    // p=0.5, cmult=2.5 → EV = base × (1 + 0.5*1.5) = 1.75×
    expect(expectedHitDamage(withCrit, target)).toBeCloseTo(175);
  });

  it("expectedHitBreakdown exposes the full stack", () => {
    const withAll = {
      ...source,
      crit: 50,
      critdamage: 0,
    };
    const targetEvasion = { armor: 100, evasion: 20 };
    const b = expectedHitBreakdown(withAll, targetEvasion);
    // base 100 × crit EV 1.5 × land 0.8 = 120
    expect(b.critEv).toBeCloseTo(1.5);
    expect(b.landChance).toBeCloseTo(0.8);
    expect(b.expected).toBeCloseTo(120);
    expect(b.theoDps).toBeCloseTo(120);
  });
});
