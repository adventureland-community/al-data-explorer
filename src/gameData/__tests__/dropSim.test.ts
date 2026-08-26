import {
  buildExchangeInspectionRows,
  buildExchangeOpportunities,
  buildKillInspectionRows,
  buildKillOpportunities,
  buildKillPools,
  defaultMapForMonster,
  diffFromLive,
  globalDropMult,
  listExchangeTables,
  monsterLuckxFromLevel,
  resolveKillPolicy,
  seqRngFrom,
  simulateOutcomes,
} from "../dropSim";
import { formatDropProbability } from "../drops";

describe("resolveKillPolicy", () => {
  it("forces share 1 and multiplier 1 when non-coop", () => {
    expect(
      resolveKillPolicy({
        cooperative: false,
        oneHp: false,
        share: 0.25,
        contributors: 25,
      }),
    ).toStrictEqual({ share: 1, tableMultiplier: 1, dropEligible: true });
  });

  it("applies share and multiplier for coop", () => {
    expect(
      resolveKillPolicy({
        cooperative: true,
        oneHp: false,
        share: 0.25,
        contributors: 25,
      }),
    ).toStrictEqual({ share: 0.25, tableMultiplier: 3, dropEligible: true });
  });

  it("forces share 1 for 1hp coop but keeps multiplier", () => {
    expect(
      resolveKillPolicy({
        cooperative: true,
        oneHp: true,
        share: 0.1,
        contributors: 25,
      }),
    ).toStrictEqual({ share: 1, tableMultiplier: 3, dropEligible: true });
  });

  it("marks coop ineligible when share is at or below server threshold", () => {
    expect(
      resolveKillPolicy({
        cooperative: true,
        oneHp: false,
        share: 0.0025,
        contributors: 10,
      }),
    ).toStrictEqual({ share: 0.0025, tableMultiplier: 2, dropEligible: false });
    expect(
      resolveKillPolicy({
        cooperative: true,
        oneHp: true,
        share: 0.001,
        contributors: 10,
      }).dropEligible,
    ).toBe(false);
    expect(
      resolveKillPolicy({
        cooperative: true,
        oneHp: false,
        share: 0.003,
        contributors: 10,
      }).dropEligible,
    ).toBe(true);
  });

  it("buildKillPools applies effective share from policy.dropEligible", () => {
    const eligible = resolveKillPolicy({
      cooperative: true,
      oneHp: false,
      share: 0.1,
      contributors: 10,
    });
    const ineligible = resolveKillPolicy({
      cooperative: true,
      oneHp: false,
      share: 0.001,
      contributors: 10,
    });
    const drops = { monsters: { boss: [[0.5, "loot"]] } };
    const eligibleMod = buildKillPools({
      drops,
      monsterKey: "boss",
      luckm: 1,
      policy: eligible,
      level: 1,
    })[0]?.modifier;
    const ineligibleMod = buildKillPools({
      drops,
      monsterKey: "boss",
      luckm: 1,
      policy: ineligible,
      level: 1,
    })[0]?.modifier;
    expect(eligibleMod).toBeCloseTo(0.1, 10);
    expect(ineligibleMod).toBe(0);
  });
});

describe("monsterLuckxFromLevel / globalDropMult", () => {
  it("derives luckx from monster level", () => {
    expect(monsterLuckxFromLevel(1)).toBe(1);
    expect(monsterLuckxFromLevel(5)).toBeCloseTo(2, 10);
  });

  it("applies 1hp global multiplier boost", () => {
    expect(globalDropMult(1, false)).toBe(1);
    expect(globalDropMult(1.5, true)).toBe(1500);
  });
});

describe("defaultMapForMonster", () => {
  it("picks the sorted first spawn map", () => {
    const spawns = new Map<string, string[]>([
      ["goo", ["main", "cave"]],
      ["franky", ["level2"]],
    ]);
    expect(defaultMapForMonster(spawns, "goo")).toBe("cave");
    expect(defaultMapForMonster(spawns, "franky")).toBe("level2");
    expect(defaultMapForMonster(spawns, "missing")).toBe("");
  });
});

describe("diffFromLive", () => {
  it("labels what-if coop and 1hp overrides", () => {
    expect(
      diffFromLive({ cooperative: false, oneHp: false }, { cooperative: true, oneHp: true }),
    ).toStrictEqual(["Live: not coop → simulating as coop", "Live: not 1hp → simulating as 1hp"]);
  });
});

describe("listExchangeTables", () => {
  it("skips meta keys and lists array tables", () => {
    expect(
      listExchangeTables({
        gold: { base: 1 },
        maps: {},
        monsters: {},
        armorbox: [[1, "helmet"]],
        weaponbox: [[1, "sword"]],
      }),
    ).toStrictEqual(["armorbox", "weaponbox"]);
  });
});

describe("simulateOutcomes exchange", () => {
  it("picks weighted exclusive outcomes", () => {
    const set = buildExchangeOpportunities(
      {
        box: [
          [1, "a"],
          [3, "b"],
        ],
      },
      "box",
    );
    expect(set).not.toBeNull();
    // First roll 0.1 * 4 = 0.4 → a; then 0.9 * 4 = 3.6 → b
    const rows = simulateOutcomes({
      opportunities: set!,
      n: 2,
      rng: seqRngFrom([0.1, 0.9]),
    });
    const byItem = Object.fromEntries(rows.map((r) => [r.itemKey, r]));
    expect(byItem.a?.observed).toBe(1);
    expect(byItem.b?.observed).toBe(1);
    expect(byItem.a?.expected).toBeCloseTo(2 * (1 / 4), 10);
    expect(byItem.b?.expected).toBeCloseTo(2 * (3 / 4), 10);
  });

  it("resolves nested open tables", () => {
    const set = buildExchangeOpportunities(
      {
        outer: [[1, "open", "inner"]],
        inner: [
          [1, "leaf_a"],
          [1, "leaf_b"],
        ],
      },
      "outer",
    );
    const rows = simulateOutcomes({
      opportunities: set!,
      n: 2,
      // outer exclusive (ignored with one row), nested; outer, nested
      rng: seqRngFrom([0, 0.1, 0, 0.9]),
    });
    const byItem = Object.fromEntries(rows.map((r) => [r.itemKey, r]));
    expect(byItem.leaf_a?.observed).toBe(1);
    expect(byItem.leaf_b?.observed).toBe(1);
    expect(byItem.leaf_a?.expected).toBeCloseTo(1, 10);
    expect(byItem.leaf_b?.expected).toBeCloseTo(1, 10);
  });
});

describe("simulateOutcomes kill", () => {
  it("rolls absolute rows independently", () => {
    const drops = {
      monsters: {
        goo: [
          [0.5, "leather"],
          [1, "open", "shells"],
        ],
      },
      shells: [
        [1, "seashell"],
        [1, "helmet"],
      ],
    };
    const policy = resolveKillPolicy({
      cooperative: false,
      oneHp: false,
      share: 1,
      contributors: 1,
    });
    const pools = buildKillPools({
      drops,
      monsterKey: "goo",
      luckm: 1,
      policy,
      level: 1,
    });
    const set = buildKillOpportunities({ drops, pools, policy });
    // leather: rng 0.4 < 0.5 hit; open: 0.1 < 1 hit → nested 0.1 → seashell
    const rows = simulateOutcomes({
      opportunities: set,
      n: 1,
      rng: seqRngFrom([0.4, 0.1, 0.1]),
    });
    const byItem = Object.fromEntries(rows.map((r) => [r.itemKey, r]));
    expect(byItem.leather?.observed).toBe(1);
    expect(byItem.seashell?.observed).toBe(1);
    expect(byItem.leather?.expected).toBeCloseTo(0.5, 10);
    expect(byItem.seashell?.expected).toBeCloseTo(0.5, 10);
  });

  it("applies coop table multiplier as repeated monster rows", () => {
    const drops = {
      monsters: {
        boss: [[1, "loot"]],
      },
    };
    const policy = resolveKillPolicy({
      cooperative: true,
      oneHp: false,
      share: 1,
      contributors: 25,
    });
    expect(policy.tableMultiplier).toBe(3);
    const pools = buildKillPools({
      drops,
      monsterKey: "boss",
      luckm: 1,
      policy,
      level: 1,
    });
    const set = buildKillOpportunities({ drops, pools, policy });
    const rows = simulateOutcomes({
      opportunities: set,
      n: 1,
      rng: seqRngFrom([0, 0, 0]),
    });
    expect(rows.find((r) => r.itemKey === "loot")?.observed).toBe(3);
    expect(rows.find((r) => r.itemKey === "loot")?.expected).toBeCloseTo(3, 10);
    expect(rows.find((r) => r.itemKey === "loot")?.deterministic).toBe(true);
  });

  it("coop share below contribution threshold yields zero drops", () => {
    const drops = {
      monsters: {
        franky: [[30, "cryptkey"]],
      },
    };
    const policy = resolveKillPolicy({
      cooperative: true,
      oneHp: false,
      share: 0.001,
      contributors: 10,
    });
    expect(policy.dropEligible).toBe(false);
    const pools = buildKillPools({
      drops,
      monsterKey: "franky",
      luckm: 1,
      policy,
      level: 1,
    });
    const set = buildKillOpportunities({ drops, pools, policy });
    const rows = simulateOutcomes({
      opportunities: set,
      n: 100,
      rng: () => 0,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.observed).toBe(0);
    expect(rows[0]?.expected).toBe(0);
  });

  it("guaranteed rows always grant — rng is consulted but never fails", () => {
    const drops = {
      monsters: {
        boss: [[100, "seashell"]],
      },
    };
    const policy = resolveKillPolicy({
      cooperative: false,
      oneHp: false,
      share: 1,
      contributors: 1,
    });
    const pools = buildKillPools({
      drops,
      monsterKey: "boss",
      luckm: 1,
      policy,
      level: 1,
    });
    const set = buildKillOpportunities({ drops, pools, policy });
    const rows = simulateOutcomes({
      opportunities: set,
      n: 10,
      rng: () => 0.99,
    });
    const seashell = rows.find((r) => r.itemKey === "seashell");
    expect(seashell?.observed).toBe(10);
    expect(seashell?.expected).toBe(10);
    expect(seashell?.deterministic).toBe(true);
  });

  it("fractional rows vary across Math.random runs (observed is not copied from expected)", () => {
    const drops = {
      monsters: {
        boss: [[0.5, "rare"]],
      },
    };
    const policy = resolveKillPolicy({
      cooperative: false,
      oneHp: false,
      share: 1,
      contributors: 1,
    });
    const pools = buildKillPools({
      drops,
      monsterKey: "boss",
      luckm: 1,
      policy,
      level: 1,
    });
    const set = buildKillOpportunities({ drops, pools, policy });
    const observedCounts = Array.from({ length: 40 }, () => {
      const rows = simulateOutcomes({ opportunities: set, n: 100 });
      return rows.find((r) => r.itemKey === "rare")?.observed ?? 0;
    });
    expect(new Set(observedCounts).size).toBeGreaterThan(1);
    expect(observedCounts.some((count) => count !== 50)).toBe(true);
  });

  it("what-if coop on a live non-coop uses policy share", () => {
    const drops = {
      monsters: {
        goo: [[1, "leather"]],
      },
    };
    const policy = resolveKillPolicy({
      cooperative: true,
      oneHp: false,
      share: 0.5,
      contributors: 1,
    });
    const pools = buildKillPools({
      drops,
      monsterKey: "goo",
      luckm: 1,
      policy,
      level: 1,
    });
    const set = buildKillOpportunities({ drops, pools, policy });
    // effective p = min(1, 1 * 0.5) = 0.5
    expect(set.kind).toBe("kill");
    if (set.kind !== "kill") return;
    expect(set.rows[0]?.probability).toBeCloseTo(0.5, 10);
  });

  it("includes index-0 monster rows (unlike parseMonsterDropTable)", () => {
    const drops = {
      monsters: {
        goo: [[0.25, "first"]],
      },
    };
    const policy = resolveKillPolicy({
      cooperative: false,
      oneHp: false,
      share: 1,
      contributors: 1,
    });
    const pools = buildKillPools({
      drops,
      monsterKey: "goo",
      luckm: 1,
      policy: { share: 1, tableMultiplier: 1, dropEligible: true },
      level: 1,
    });
    const set = buildKillOpportunities({ drops, pools, policy });
    const rows = simulateOutcomes({
      opportunities: set,
      n: 0,
    });
    expect(rows.find((r) => r.itemKey === "first")?.probability).toBeCloseTo(0.25, 10);
  });
});

describe("buildKillInspectionRows", () => {
  it("shows uncapped guaranteed rates (100 / 1), not capped Bernoulli 1 / 1", () => {
    const rows = buildKillInspectionRows([
      {
        probability: 1,
        rawRate: 100,
        baseRate: 100,
        itemKey: "seashell",
        quantity: null,
        nestedTable: "",
        repeats: 1,
      },
      {
        probability: 0.0004,
        rawRate: 0.0004,
        baseRate: 0.0004,
        itemKey: "suckerpunch",
        quantity: null,
        nestedTable: "",
        repeats: 1,
      },
    ]);
    expect(rows[0]?.rawRate).toBe(100);
    expect(formatDropProbability(rows[0]?.rawRate)).toBe("100 / 1");
    expect(formatDropProbability(rows[1]?.rawRate)).toBe("0.0400%");
  });

  it("perKillRate is roll probability × table repeats (matches results Rate)", () => {
    const rows = buildKillInspectionRows([
      {
        probability: 0.00004,
        rawRate: 0.00004,
        baseRate: 0.0004,
        itemKey: "suckerpunch",
        quantity: null,
        nestedTable: "",
        repeats: 2,
      },
      {
        probability: 100,
        rawRate: 100,
        baseRate: 100,
        itemKey: "seashell",
        quantity: null,
        nestedTable: "",
        repeats: 2,
      },
    ]);
    expect(rows[0]?.perKillRate).toBeCloseTo(0.00008, 10);
    expect(formatDropProbability(rows[0]?.perKillRate)).toBe("1 in 12,500");
    expect(rows[1]?.perKillRate).toBe(200);
    expect(formatDropProbability(rows[1]?.perKillRate)).toBe("200 / 1");
  });

  it("computes min luckm to guarantee each roll (luckm / rawRate)", () => {
    const rows = buildKillInspectionRows(
      [
        {
          probability: 0.0004,
          rawRate: 0.0004,
          baseRate: 0.0004,
          itemKey: "ringofluck",
          quantity: null,
          nestedTable: "",
          repeats: 1,
        },
        {
          probability: 1,
          rawRate: 100,
          baseRate: 100,
          itemKey: "seashell",
          quantity: null,
          nestedTable: "",
          repeats: 1,
        },
        {
          probability: 0.3,
          rawRate: 0.3,
          baseRate: 30,
          itemKey: "cryptkey",
          quantity: null,
          nestedTable: "",
          repeats: 2,
        },
      ],
      1.1,
    );
    expect(rows[0]?.guaranteedNow).toBe(false);
    expect(rows[0]?.luckmToGuarantee).toBeCloseTo(1.1 / 0.0004, 6);
    expect(rows[1]?.guaranteedNow).toBe(true);
    expect(rows[1]?.luckmToGuarantee).toBeNull();
    expect(rows[2]?.guaranteedNow).toBe(false);
    expect(rows[2]?.luckmToGuarantee).toBeCloseTo(1.1 / 0.3, 6);
  });
});

describe("buildExchangeInspectionRows", () => {
  it("keeps table order and cumulative roll thresholds", () => {
    const set = buildExchangeOpportunities(
      {
        box: [
          [1, "rare"],
          [3, "common", 2],
        ],
      },
      "box",
    );
    expect(set?.kind).toBe("exchange");
    if (!set || set.kind !== "exchange") return;
    const rows = buildExchangeInspectionRows(set.entries);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.itemKey).toBe("rare");
    expect(rows[0]?.weight).toBe(1);
    expect(rows[0]?.probability).toBeCloseTo(0.25, 10);
    expect(rows[0]?.expectedRolls).toBeCloseTo(4, 10);
    expect(rows[0]?.cumulative).toBe(1);
    expect(rows[0]?.rollThreshold).toBeCloseTo(0.25, 10);
    expect(rows[1]?.itemKey).toBe("common");
    expect(rows[1]?.quantity).toBe(2);
    expect(rows[1]?.cumulative).toBe(4);
    expect(rows[1]?.rollThreshold).toBeCloseTo(1, 10);
  });
});
