import { damageMultiplier, effectiveDefense } from "./calculations";
import {
  armorFromStr,
  attributeSoftcapCurve,
  fortitudeMultCurve,
  landChanceCurve,
  monsterConditionThreats,
  mitigationCurveByPierce,
  pierceToHardCap,
  pierceWaste,
  resistanceFromInt,
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
    expect(w.hints.some((h) => h.text.includes("rpiercing") && h.openStat === "rpiercing")).toBe(
      true,
    );
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
    expect(w.hints.some((h) => /past the m = 132%/.test(h.text))).toBe(true);
  });

  it("accounts for skill pierce in hard cap trim", () => {
    const defense = 100;
    const skill = 40;
    const cap = pierceToHardCap(defense - skill);
    const w = pierceWaste({
      damageType: "physical",
      apiercing: cap + 5,
      monsterArmor: defense,
      skillPierce: skill,
    });
    expect(w.piercePastHardCap).toBe(5);
  });

  it("pure ignores both pierces", () => {
    const w = pierceWaste({
      damageType: "pure",
      apiercing: 10,
      rpiercing: 10,
      monsterArmor: 500,
    });
    expect(w.multiplier).toBe(1);
    expect(w.hints.some((h) => /pure/i.test(h.text) && h.openStat === "damageMultiplier")).toBe(
      true,
    );
  });

  it("soft-overpierce hint opens the active pierce stat (magical)", () => {
    const w = pierceWaste({
      damageType: "magical",
      rpiercing: 200,
      monsterResistance: 50,
    });
    const soft = w.hints.find((h) => /Overpiercing|past the m = 132%|adds no m/i.test(h.text));
    expect(soft?.openStat).toBe("rpiercing");
  });
});

describe("attribute softcaps", () => {
  it("armorFromStr softcaps at 160", () => {
    expect(armorFromStr(160)).toBe(160);
    expect(armorFromStr(200)).toBe(160 + 40 * 0.25);
  });

  it("resistanceFromInt softcaps at 180", () => {
    expect(resistanceFromInt(180)).toBe(180);
    expect(resistanceFromInt(200)).toBe(180 + 20 * 0.25);
  });

  it("attributeSoftcapCurve samples str", () => {
    const pts = attributeSoftcapCurve({ kind: "str", from: 150, to: 170, steps: 4 });
    expect(pts[0]?.y).toBe(150);
    expect(pts[pts.length - 1]?.y).toBeCloseTo(162.5);
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

  it("lists chance conditions; overcap only above 100", () => {
    const at50 = statusResistInsight("pnresistance", 50, conditions);
    expect(at50.chanceResistPercent).toBe(50);
    expect(at50.durationRemainingFraction).toBeCloseTo(0.5);
    expect(at50.overcap).toBe(false);
    expect(at50.chanceConditions.map((c) => c.key)).toContain("poisoned");

    const at100 = statusResistInsight("pnresistance", 100, conditions);
    expect(at100.chanceResistPercent).toBe(100);
    expect(at100.overcap).toBe(false);

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

describe("monsterConditionThreats", () => {
  const conditions = {
    poisoned: { name: "Poison", defense: "pnresistance", debuff: true },
    burned: { name: "Burned", defense: "firesistance", debuff: true },
    weakness: { name: "Weakness", debuff: true },
  };

  it("maps poisonous and ability condition/burn aliases", () => {
    const threats = monsterConditionThreats(
      {
        poisonous: true,
        abilities: {
          weakness_aura: { condition: "weakness", aura: true },
          burn: {},
        },
      },
      conditions,
    );
    expect(threats.map((t) => t.conditionKey).sort()).toEqual(
      ["burned", "poisoned", "weakness"].sort(),
    );
    expect(threats.find((t) => t.conditionKey === "poisoned")?.defenseStat).toBe("pnresistance");
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

describe("landChanceCurve / fortitudeMultCurve", () => {
  it("land chance falls linearly with evasion/reflection", () => {
    const pts = landChanceCurve(0, 100, 4);
    expect(pts[0]?.y).toBe(100);
    expect(pts[pts.length - 1]?.y).toBe(0);
    const fort = fortitudeMultCurve(0, 40, 8);
    expect(fort[0]?.y).toBeCloseTo(100);
    expect(fort[fort.length - 1]?.y).toBeLessThan(100);
  });
});

describe("wasteChipsForLoadout", () => {
  it("includes unused pierce and status overcap chips with openStat", () => {
    const chips = wasteChipsForLoadout({
      damageType: "physical",
      apiercing: 0,
      rpiercing: 12,
      monsterArmor: 50,
      statusResists: { pnresistance: 120 },
    });
    expect(chips.some((c) => c.text.includes("rpiercing") && c.openStat === "rpiercing")).toBe(
      true,
    );
    expect(
      chips.some((c) => c.text.includes("pnresistance") && c.openStat === "pnresistance"),
    ).toBe(true);
  });

  it("does not chip status resist at exactly 100", () => {
    const chips = wasteChipsForLoadout({
      damageType: "physical",
      statusResists: { pnresistance: 100 },
    });
    expect(chips.some((c) => c.openStat === "pnresistance")).toBe(false);
  });

  it("soft-overpierce chip opens active pierce on magical", () => {
    const chips = wasteChipsForLoadout({
      damageType: "magical",
      rpiercing: 400,
      monsterResistance: 40,
    });
    const soft = chips.find((c) => /Overpiercing|past the m = 132%|adds no m/i.test(c.text));
    expect(soft?.openStat).toBe("rpiercing");
  });
});
