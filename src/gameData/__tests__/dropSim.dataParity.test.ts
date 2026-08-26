import { readFileSync } from "fs";
import { join } from "path";

import {
  buildExchangeInspectionRows,
  buildExchangeOpportunities,
  exchangeTokenCosts,
  globalDropMult,
  monsterLuckxFromLevel,
  planKillDrops,
  resolveKillDropModifiers,
  resolveKillPolicy,
  simulateOutcomes,
} from "../dropSim";
import { formatDropProbability, tableTotalWeight, toAcquisitionDropSources } from "../drops";
import { luckmNeededToGuaranteeRoll } from "../dropSimInspection";

type DropTuple = [number, string, ...unknown[]];

function loadDataJson(): { drops: Record<string, unknown>; tokens: Record<string, unknown> } {
  const dataPath = join(process.cwd(), "public/data.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf8")) as {
    drops: Record<string, unknown>;
    tokens: Record<string, unknown>;
  };
  return { drops: raw.drops, tokens: raw.tokens };
}

function asDropTable(value: unknown): DropTuple[] {
  if (!Array.isArray(value)) return [];
  return value as DropTuple[];
}

/** Bernoulli check matching server shouldItemDrop inequality. */
function monsterRowShouldDrop(dropRate: number, rng: number, modifier: number): boolean {
  return rng / modifier < dropRate;
}

describe("dropSim data.json + server parity", () => {
  const { drops, tokens } = loadDataJson();

  describe("exchange vs server_functions exchange", () => {
    it("armorbox weights and probabilities match data.json", () => {
      const table = asDropTable(drops.armorbox);
      const set = buildExchangeOpportunities(drops, "armorbox");
      expect(set?.kind).toBe("exchange");
      if (!set || set.kind !== "exchange") return;

      expect(set.entries).toHaveLength(table.length);
      const total = tableTotalWeight(table);
      expect(total).toBeCloseTo(96.85, 2);

      const rows = buildExchangeInspectionRows(set.entries);
      expect(rows[0]?.itemKey).toBe("coat1");
      expect(rows[0]?.weight).toBe(14);
      expect(rows[0]?.probability).toBeCloseTo(14 / total, 8);
      expect(formatDropProbability(rows[0]?.probability)).toBe("14.46%");
    });

    it("armorbox exclusive pick matches cumulative weight bands", () => {
      const table = asDropTable(drops.armorbox);
      const total = tableTotalWeight(table);
      const set = buildExchangeOpportunities(drops, "armorbox");
      expect(set).not.toBeNull();

      for (const rng of [0.01, 0.99]) {
        const result = rng * total;
        let current = 0;
        let pickIndex = table.length - 1;
        for (let i = 0; i < table.length; i += 1) {
          current += table[i]![0];
          if (result <= current) {
            pickIndex = i;
            break;
          }
        }
        const sim = simulateOutcomes({ opportunities: set!, n: 1, rng: () => rng });
        const observed = sim.find((row) => row.observed === 1);
        expect(observed?.itemKey).toBe(table[pickIndex]?.[1]);
      }
    });

    it("armorbox token shop costs match G.tokens", () => {
      const costs = exchangeTokenCosts({ tokens, tableKey: "armorbox", n: 1000 });
      const byKey = Object.fromEntries(costs.map((c) => [c.tokenKey, c.total]));
      expect(byKey.pvptoken).toBe(1000);
      expect(byKey.monstertoken).toBe(5000);
    });
  });

  describe("kill vs server shouldItemDrop", () => {
    it("planKillDrops crabxx rows match data.json rates at default modifiers", () => {
      const table = asDropTable((drops.monsters as Record<string, unknown>).crabxx);
      const plan = planKillDrops({
        drops,
        monsterKey: "crabxx",
        luckm: 1,
        cooperative: true,
        oneHp: false,
        share: 1,
        contributors: 1,
        level: 1,
      });
      expect(plan).not.toBeNull();
      if (!plan || plan.opportunities.kind !== "kill") return;

      expect(plan.opportunities.rows).toHaveLength(table.length);
      expect(plan.oddsRows).toHaveLength(table.length);

      expect(plan.oddsRows[0]?.itemKey).toBe("suckerpunch");
      expect(plan.oddsRows[0]?.baseRate).toBe(0.0004);
      expect(formatDropProbability(plan.oddsRows[0]?.rawRate)).toBe("0.0400%");

      expect(plan.oddsRows[1]?.itemKey).toBe("seashell");
      expect(plan.oddsRows[1]?.baseRate).toBe(100);
      expect(formatDropProbability(plan.oddsRows[1]?.rawRate)).toBe("100 / 1");
    });

    it("coop share 0.1 and table×2: odds per-kill matches merged sim rate", () => {
      const plan = planKillDrops({
        drops,
        monsterKey: "crabxx",
        luckm: 1,
        cooperative: true,
        oneHp: false,
        share: 0.1,
        contributors: 10,
        level: 1,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;

      const suckerpunch = plan.oddsRows.find((r) => r.itemKey === "suckerpunch");
      expect(suckerpunch?.rawRate).toBeCloseTo(0.00004, 10);
      expect(suckerpunch?.perKillRate).toBeCloseTo(0.00008, 10);
      expect(formatDropProbability(suckerpunch?.perKillRate)).toBe("1 in 12,500");

      const outcomes = simulateOutcomes({
        opportunities: plan.opportunities,
        n: 100,
        rng: () => 0.5,
      });
      const simRow = outcomes.find((r) => r.itemKey === "suckerpunch");
      expect(simRow?.probability).toBeCloseTo(0.00008, 10);
    });

    it("Bernoulli sim probability matches server inequality via Kill Drop Plan modifiers", () => {
      const cases = [
        { dropRate: 0.0004, luckm: 1, level: 1, share: 1 },
        { dropRate: 0.5, luckm: 2, level: 3, share: 0.25 },
        { dropRate: 100, luckm: 1, level: 1, share: 1 },
        { dropRate: 0.01, luckm: 1, level: 10, share: 1 },
      ];
      for (const c of cases) {
        const policy = resolveKillPolicy({
          cooperative: true,
          oneHp: false,
          share: c.share,
          contributors: 1,
        });
        const mods = resolveKillDropModifiers({
          luckm: c.luckm,
          policy,
          level: c.level,
        });
        const simP = Math.min(1, c.dropRate * mods.monsterTable);
        for (const rng of [0, 0.1, 0.5, 0.99]) {
          const server = monsterRowShouldDrop(c.dropRate, rng, mods.monsterTable);
          expect(rng < simP).toBe(server);
        }
      }
    });

    it("monster luckx does not affect monster-table modifier (only map/global)", () => {
      const plan = planKillDrops({
        drops: {
          monsters: { m: [[0.1, "x"]] },
          maps: { beach: [[0.01, "shell"]] },
        },
        monsterKey: "m",
        luckm: 1,
        cooperative: false,
        oneHp: false,
        share: 1,
        contributors: 1,
        level: 5,
        mapKey: "beach",
        monsterHp: 2000,
      });
      expect(plan?.mods.monsterTable).toBeCloseTo(5, 10);
      expect(monsterLuckxFromLevel(5)).toBeCloseTo(2, 10);
      expect(plan?.mods.map).toBeCloseTo(1 * 1 * 2 * 2, 10);
      expect(plan?.rollCaption).toContain("Monster table ×5.00");
      expect(plan?.rollCaption).toContain("map ×");
    });

    it("map and global pool modifiers match server formulas", () => {
      const plan = planKillDrops({
        drops: {
          monsters: { boss: [[0.1, "loot"]] },
          maps: {
            arena: [[0.02, "mapdrop"]],
            global_static: [[0.003, "staticdrop"]],
            global: [[0.004, "globaldrop"]],
          },
        },
        monsterKey: "boss",
        luckm: 2,
        cooperative: true,
        oneHp: true,
        share: 0.5,
        contributors: 10,
        level: 3,
        mapKey: "arena",
        includeGlobals: true,
        monsterHp: 5000,
        monsterMult: 1.5,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;

      const share = 1;
      const luckm = 2;
      const luckx = monsterLuckxFromLevel(3);
      const hpMult = 5;
      const globalMult = globalDropMult(1.5, true);

      expect(plan.mods.map).toBeCloseTo(luckm * share * hpMult * luckx, 10);
      expect(plan.mods.globalStatic).toBeCloseTo(luckm * share * luckx * globalMult, 10);
      expect(plan.mods.global).toBeCloseTo(luckm * share * hpMult * luckx * globalMult, 10);
      expect(plan.mods.monsterTable).toBeCloseTo(luckm * share * 3 * 1.5, 10);
    });

    it("crabxx guaranteed rows expect ~N drops per table row per kill", () => {
      const plan = planKillDrops({
        drops,
        monsterKey: "crabxx",
        luckm: 1,
        cooperative: true,
        oneHp: false,
        share: 1,
        contributors: 1,
        level: 1,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;
      const outcomes = simulateOutcomes({
        opportunities: plan.opportunities,
        n: 100,
        rng: () => 0.5,
      });
      const seashell = outcomes.find((r) => r.itemKey === "seashell");
      expect(seashell?.expected).toBe(200);
      expect(seashell?.observed).toBe(200);
    });
    it("acquisition leaf odds match Kill Drop Plan at default solo modifiers", () => {
      const plan = planKillDrops({
        drops,
        monsterKey: "crabxx",
        luckm: 1,
        cooperative: false,
        oneHp: false,
        share: 1,
        contributors: 1,
        level: 1,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;

      const acquisition = toAcquisitionDropSources(drops).filter(
        (row) => row.sourceType === "monster" && row.sourceKey === "crabxx" && row.itemKey,
      );
      const acqByItem = new Map<string, number>();
      for (const src of acquisition) {
        if (src.probability == null) continue;
        acqByItem.set(src.itemKey, (acqByItem.get(src.itemKey) ?? 0) + src.probability);
      }
      const simByItem = new Map<string, number>();
      for (const row of plan.oddsRows) {
        if (!row.itemKey || row.nestedTable || row.baseRate == null) continue;
        simByItem.set(row.itemKey, (simByItem.get(row.itemKey) ?? 0) + row.baseRate);
      }
      expect(simByItem.size).toBeGreaterThan(0);
      for (const [itemKey, acqRate] of acqByItem) {
        expect(simByItem.get(itemKey)).toBeCloseTo(acqRate, 10);
      }
    });
    it("konami mode only rolls konami table", () => {
      const plan = planKillDrops({
        drops: {
          monsters: { goo: [[0.5, "leather"]] },
          maps: { main: [[0.1, "shell"]], global: [[0.01, "g"]], global_static: [[0.01, "s"]] },
          monsters_home_server: { goo: [[0.2, "homeitem"]] },
          konami: [
            [6e-7, "powerglove"],
            [2e-9, "goldenpowerglove"],
          ],
        },
        monsterKey: "goo",
        luckm: 2,
        cooperative: false,
        oneHp: false,
        share: 1,
        contributors: 1,
        level: 3,
        mapKey: "main",
        includeGlobals: true,
        homeServer: true,
        konami: true,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;
      expect(plan.pools).toHaveLength(1);
      expect(plan.pools[0]?.sourceKey).toBe("konami");
      expect(plan.mods.konami).toBeCloseTo(2 * 1 * 3, 10);
      expect(plan.oddsRows.map((r) => r.itemKey)).toStrictEqual(["powerglove", "goldenpowerglove"]);
      expect(plan.rollCaption).toContain("Konami skin");
    });

    it("home-server pool uses monster-table modifier without table×", () => {
      const plan = planKillDrops({
        drops: {
          monsters: { mrgreen: [[0.001, "base"]] },
          monsters_home_server: {
            mrgreen: [
              [0.01, "fallen"],
              [1, "candy0", 7],
            ],
          },
        },
        monsterKey: "mrgreen",
        luckm: 1,
        cooperative: true,
        oneHp: false,
        share: 0.1,
        contributors: 10,
        level: 1,
        homeServer: true,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;
      const home = plan.pools.find((p) => p.sourceKey === "mrgreen#home");
      expect(home).toBeDefined();
      expect(home?.modifier).toBeCloseTo(0.1, 10);
      expect(home?.applyTableMultiplier).toBe(false);
      const monster = plan.pools.find((p) => p.sourceKey === "mrgreen");
      expect(monster?.applyTableMultiplier).toBe(true);
      expect(plan.policy.tableMultiplier).toBe(2);
    });
  });
});

describe("luckmNeededToGuaranteeRoll", () => {
  it("inverts rawRate at current luckm", () => {
    const result = luckmNeededToGuaranteeRoll({
      rawRate: 7e-7,
      currentLuckm: 1,
    });
    expect(result.guaranteedNow).toBe(false);
    expect(result.luckm).toBeCloseTo(1 / 7e-7, 0);
  });

  it("marks already-guaranteed rows from effective rawRate only", () => {
    expect(luckmNeededToGuaranteeRoll({ rawRate: 100, currentLuckm: 1 }).guaranteedNow).toBe(true);
    expect(luckmNeededToGuaranteeRoll({ rawRate: 2, currentLuckm: 4 }).guaranteedNow).toBe(true);
  });

  it("does not treat high base rates as guaranteed when modifiers shrink rawRate", () => {
    const result = luckmNeededToGuaranteeRoll({ rawRate: 0.3, currentLuckm: 1 });
    expect(result.guaranteedNow).toBe(false);
    expect(result.luckm).toBeCloseTo(1 / 0.3, 6);
  });
});
