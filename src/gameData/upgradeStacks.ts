/**
 * Helmet-proxy costs for banking `ugrace` (failstack) and `ograce` (offering fails).
 * Search/algorithm from Kora Dereva pastebin CALC_VERSION 8 (https://pastebin.com/jBMKeLfd);
 * community names: failstack = helmet fails; primstacking = Primlings on the item (elsewhere);
 * ograce bank has no common community name (legacy pastebin table keys: ograce_*).
 */

import { GItem, ItemKey } from "typed-adventureland";

import { getItemGrade } from "./itemGrade";
import { applyLuckySlotChance, ChanceTables, getUpgradeChance, ItemLookup } from "./upgradeChance";
import { PriceTable, unitPrice } from "./upgradePrices";

export const HELMET_GRADES = [7, 9, 10, 12] as const;
export const HELMET_BASE_COST_FALLBACK = 3200;
export const MAX_FAILSTACK = 18;
export const MAX_OGRACE_STEPS = 30;

export type FailstackEntry = {
  level: number | null;
  ugrace: number;
  attempts: number;
  cost: number;
  farms: { level: number; gain: number; failures: number; attempts: number }[];
};

export type OgraceEntry = {
  ograce: number;
  level: number | null;
  attempts: number;
  cost: number;
};

/** failstack[levelTo][ugrace] — levelTo is 1-indexed upgrade destination. */
export type FailstackTable = FailstackEntry[][];
/** ograce table index i → player ograce i × 0.6 */
export type OgraceTable = OgraceEntry[];

export type StackTables = {
  failstack: FailstackTable;
  ograce: OgraceTable;
};

export type StackCostRow = {
  lucky_cost: number;
  failstack_chance?: number;
  failstack_cost?: number;
  ograce_chance?: number;
  ograce_attempt_cost?: number;
};

function helmetDef(): GItem {
  return {
    upgrade: true,
    g: HELMET_BASE_COST_FALLBACK,
    grades: [...HELMET_GRADES],
    igrace: 1,
  } as unknown as GItem;
}

function helmetLookup(): ItemLookup {
  const def = helmetDef();
  return (name: ItemKey) => (name === "helmet" ? def : undefined);
}

export function helmetBaseCost(prices: PriceTable): number {
  const n = unitPrice(prices, "helmet");
  return Number.isFinite(n) && n > 0 ? n : HELMET_BASE_COST_FALLBACK;
}

export function scrollCostsFromPrices(prices: PriceTable): number[] {
  return [0, 1, 2, 3, 4].map((g) => unitPrice(prices, `scroll${g}`));
}

export function offeringCostsFromPrices(prices: PriceTable): number[] {
  // Index 0 = none; 1 = offeringp; 2 = offering; 3 = offeringx
  return [
    0,
    unitPrice(prices, "offeringp"),
    unitPrice(prices, "offering"),
    unitPrice(prices, "offeringx"),
  ];
}

export function primlingUnitCost(prices: PriceTable): number {
  return unitPrice(prices, "offeringp");
}

/** Personal ugrace from one failed upgrade to `levelTo`, no offering. */
export function failUgraceGains(levelTo: number): Map<number, number> {
  const gain = new Map<number, number>();
  const add = (level: number, n: number) => {
    if (level < 0) return;
    gain.set(level, (gain.get(level) ?? 0) + n);
  };
  add(levelTo, 1);
  add(levelTo - 1, 1);
  if (levelTo >= 8 && levelTo <= 15) {
    add(levelTo - 1, 1);
    add(levelTo - 2, 2);
    add(levelTo - 3, 2);
  }
  return gain;
}

export function streakAttempts(failChance: number, failures: number): number {
  if (failures <= 0) return 0;
  if (failChance >= 1) return failures;
  if (!(failChance > 0)) return Infinity;
  const p = failChance;
  return (1 - p ** failures) / ((1 - p) * p ** failures);
}

type SplashSource = { level: number; gain: number; q: number; attemptCost: number };

type SplashPlan = { cost: number; counts: Record<string, number> };

export function splashPlans(sources: SplashSource[], maxUGrace: number): (SplashPlan | null)[] {
  const plans: (SplashPlan | null)[] = new Array(maxUGrace + 1).fill(null);
  if (!sources.length) return plans;
  const maxGain = sources.reduce((max, src) => Math.max(max, src.gain), 0);
  const limit = maxUGrace + maxGain;
  const dp: (SplashPlan | null)[] = new Array(limit + 1).fill(null);
  dp[0] = { cost: 0, counts: Object.create(null) as Record<string, number> };
  for (let g = 0; g <= limit; g++) {
    const cur = dp[g];
    if (!cur) continue;
    for (const src of sources) {
      const next = g + src.gain;
      if (next > limit) continue;
      const cost = cur.cost + src.attemptCost / src.q;
      if (!dp[next] || cost < dp[next]!.cost) {
        const counts = Object.assign(Object.create(null), cur.counts) as Record<string, number>;
        counts[src.level] = (counts[src.level] || 0) + 1;
        dp[next] = { cost, counts };
      }
    }
  }
  let best: SplashPlan | null = null;
  for (let g = limit; g >= 1; g--) {
    if (dp[g] && (!best || dp[g]!.cost < best.cost)) best = dp[g];
    if (g <= maxUGrace) plans[g] = best;
  }
  return plans;
}

function farmsFromCounts(
  counts: Record<string, number>,
  byLevel: Record<number, SplashSource>,
  attemptsOf: (action: SplashSource, failures: number) => number,
): FailstackEntry["farms"] {
  const farms: FailstackEntry["farms"] = [];
  for (const key of Object.keys(counts)) {
    const level = Number(key);
    const failures = counts[key];
    const action = byLevel[level];
    farms.push({
      level,
      gain: action.gain,
      failures,
      attempts: attemptsOf(action, failures),
    });
  }
  farms.sort((a, b) => a.level - b.level);
  return farms;
}

function finishFailstack(j: number, farms: FailstackEntry["farms"]): FailstackEntry {
  let attempts = 0;
  let level: number | null = null;
  let most = -1;
  for (const farm of farms) {
    attempts += farm.attempts;
    if (farm.attempts > most) {
      most = farm.attempts;
      level = farm.level;
    }
  }
  return { level, ugrace: j, attempts, cost: 0, farms };
}

function priceFailstack(
  direct: SplashSource | null,
  splash: (SplashPlan | null)[] | null,
  byLevel: Record<number, SplashSource>,
  j: number,
): FailstackEntry {
  let farms: FailstackEntry["farms"] | null = null;
  let best = Infinity;
  const splashPlan = splash?.[j];
  if (splashPlan && Number.isFinite(splashPlan.cost)) {
    best = splashPlan.cost;
    farms = farmsFromCounts(splashPlan.counts, byLevel, (action, failures) => failures / action.q);
  }
  if (direct) {
    const failures = Math.ceil(j / direct.gain);
    const attempts = streakAttempts(direct.q, failures);
    const cost = attempts * direct.attemptCost;
    if (Number.isFinite(cost) && cost < best) {
      best = cost;
      farms = [{ level: direct.level, gain: direct.gain, failures, attempts }];
    }
  }
  if (!farms) {
    return { level: null, ugrace: j, attempts: Infinity, cost: Infinity, farms: [] };
  }
  const priced = finishFailstack(j, farms);
  priced.cost = best;
  return priced;
}

export function stackingFailstack(
  stackCosts: StackCostRow[],
  maxUGrace = MAX_FAILSTACK,
): FailstackTable {
  const farmLevels: {
    level: number;
    q: number;
    attemptCost: number;
    gains: Map<number, number>;
  }[] = [];
  for (let level = 1; level < stackCosts.length; level++) {
    const row = stackCosts[level];
    const chance = row.failstack_chance ?? 0;
    const q = 1 - chance;
    if (!(q > 0) || !Number.isFinite(row.failstack_cost ?? NaN)) continue;
    farmLevels.push({
      level,
      q,
      attemptCost: row.failstack_cost!,
      gains: failUgraceGains(level),
    });
  }

  const results: FailstackTable = [[]];
  for (let target = 1; target < stackCosts.length; target++) {
    const splash: SplashSource[] = [];
    const byLevel: Record<number, SplashSource> = Object.create(null);
    let direct: SplashSource | null = null;
    for (const farm of farmLevels) {
      const gain = farm.gains.get(target) || 0;
      if (!gain) continue;
      const action: SplashSource = {
        level: farm.level,
        gain,
        q: farm.q,
        attemptCost: farm.attemptCost,
      };
      byLevel[farm.level] = action;
      if (farm.level === target) direct = action;
      else splash.push(action);
    }
    const splashTable = splashPlans(splash, maxUGrace);
    const levelResults: FailstackEntry[] = [
      { level: target, ugrace: 0, attempts: 0, cost: 0, farms: [] },
    ];
    for (let j = 1; j <= maxUGrace; j++) {
      levelResults.push(priceFailstack(direct, splashTable, byLevel, j));
    }
    results.push(levelResults);
  }
  return results;
}

export function stackingOgrace(
  stackCosts: StackCostRow[],
  maxOGrace = MAX_OGRACE_STEPS,
): OgraceTable {
  const step = 0.6;

  type Action = { level: number; chance: number; attemptCost: number };
  let actions: Action[] = [];
  for (let level = 0; level < stackCosts.length; level++) {
    const x = stackCosts[level];
    if (!x) continue;
    const chance = x.ograce_chance ?? 1;
    const attemptCost = x.ograce_attempt_cost ?? Infinity;
    if (chance < 1 && Number.isFinite(attemptCost)) {
      actions.push({ level, chance, attemptCost });
    }
  }

  actions = actions.filter(
    (a) =>
      !actions.some(
        (b) =>
          b !== a &&
          b.attemptCost <= a.attemptCost &&
          b.chance <= a.chance &&
          (b.attemptCost < a.attemptCost || b.chance < a.chance),
      ),
  );

  function expectedAttempts(target: number, p: number): number {
    if (target <= 0) return 0;
    const resolution = 0.05;
    const n = Math.ceil(target / resolution);
    const v = new Float64Array(n);
    const q = 1 - p;
    const failures = Math.ceil(target / step);
    const initial = (1 - q ** failures) / (p * q ** failures);
    v.fill(initial);

    function get(g: number): number {
      if (g >= target) return 0;
      const x = g / resolution;
      const lo = Math.min(Math.floor(x), n - 1);
      const hi = Math.min(lo + 1, n - 1);
      const f = x - lo;
      return v[lo] * (1 - f) + v[hi] * f;
    }

    for (let iteration = 0; iteration < 300; iteration++) {
      let maxChange = 0;
      for (let i = n - 1; i >= 0; i--) {
        const g = i * resolution;
        const old = v[i];
        const next = 1 + p * get(g * 0.25) + (1 - p) * get(g + step);
        v[i] = next;
        const change = Math.abs(next - old);
        if (change > maxChange) maxChange = change;
      }
      if (maxChange < 1e-5) break;
    }
    return v[0];
  }

  const count = Math.floor(maxOGrace / step);
  const result: OgraceTable = [{ ograce: 0, level: null, attempts: 0, cost: 0 }];

  for (let i = 1; i <= count; i++) {
    const ograce = i * step;
    let best: OgraceEntry | null = null;
    for (const action of actions) {
      const attempts = expectedAttempts(ograce, action.chance);
      const cost = attempts * action.attemptCost;
      if (!best || cost < best.cost) {
        best = { ograce, level: action.level, attempts, cost };
      }
    }
    result.push(best ?? { ograce, level: null, attempts: Infinity, cost: Infinity });
  }
  return result;
}

/**
 * Seed helmet stack-cost rows (before optional Pareto refine of lucky_cost).
 */
export function stackingPrecalculate(prices: PriceTable, tables?: ChanceTables): StackCostRow[] {
  const lookup = helmetLookup();
  const itemGrades = [...HELMET_GRADES];
  const baseItemCost = helmetBaseCost(prices);
  const scrolls = scrollCostsFromPrices(prices);
  const offerings = offeringCostsFromPrices(prices);
  const igrade = getItemGrade(helmetDef(), 0);
  const igrace = igrade === 0 ? 1 : igrade === 1 ? -1 : igrade === 2 ? -2 : 0;
  const maxLevel = itemGrades[3] ?? 12;

  const results: StackCostRow[] = [{ lucky_cost: baseItemCost }];

  for (let i = 1; i <= maxLevel; i++) {
    const prev = results[i - 1];
    const itemGrade = getItemGrade(helmetDef(), i - 1);
    const item = { name: "helmet" as ItemKey, level: i - 1, grace: igrace };

    const luckyRaw = getUpgradeChance(lookup, item, itemGrade, null, tables);
    const luckyChance = applyLuckySlotChance(luckyRaw.chance);
    // EV for lucky matching-scroll click (item destroyed on fail).
    const luckyCost =
      luckyChance > 0
        ? (prev.lucky_cost + (Number.isFinite(scrolls[itemGrade]) ? scrolls[itemGrade] : 0)) /
          luckyChance
        : Infinity;

    const unlucky = getUpgradeChance(lookup, item, itemGrade, null, tables);
    const failstackAttemptCost =
      prev.lucky_cost + (Number.isFinite(scrolls[itemGrade]) ? scrolls[itemGrade] : Infinity);

    const primeClick = getUpgradeChance(lookup, item, itemGrade, 0, tables);
    const ograceAttemptCost =
      prev.lucky_cost +
      (Number.isFinite(scrolls[itemGrade]) ? scrolls[itemGrade] : Infinity) +
      (Number.isFinite(offerings[1]) ? offerings[1] : Infinity);

    results.push({
      lucky_cost: luckyCost,
      failstack_chance: unlucky.chance,
      failstack_cost: failstackAttemptCost,
      ograce_chance: primeClick.chance,
      ograce_attempt_cost: ograceAttemptCost,
    });
  }

  return results;
}

/**
 * Build failstack/ograce tables from prices.
 * Optional `luckyCostsByLevel` (index = destination level) replaces seed lucky_cost
 * after a helmet Pareto refine, matching pastebin `stacks_calculate`.
 */
export function buildStackTables(
  prices: PriceTable,
  tables?: ChanceTables,
  luckyCostsByLevel?: number[],
): StackTables {
  const stackCosts = stackingPrecalculate(prices, tables);
  if (luckyCostsByLevel) {
    for (let i = 1; i < stackCosts.length; i++) {
      const copy = luckyCostsByLevel[i - 1];
      const plan = luckyCostsByLevel[i];
      if (Number.isFinite(copy) && Number.isFinite(plan)) {
        const grade = getItemGrade(helmetDef(), i - 1);
        const scroll = unitPrice(prices, `scroll${grade}`);
        const offeringp = unitPrice(prices, "offeringp");
        stackCosts[i].lucky_cost = plan;
        stackCosts[i].failstack_cost = copy + scroll;
        stackCosts[i].ograce_attempt_cost = copy + scroll + offeringp;
      }
    }
  }
  return {
    failstack: stackingFailstack(stackCosts),
    ograce: stackingOgrace(stackCosts),
  };
}

export function failstackUnitCost(tables: StackTables, levelTo: number, failstack: number): number {
  if (!failstack) return 0;
  const row = tables.failstack[levelTo]?.[failstack];
  return row?.cost ?? Infinity;
}

export function ograceUnitCost(tables: StackTables, ograceSteps: number): number {
  if (!ograceSteps) return 0;
  const row = tables.ograce[ograceSteps];
  return row?.cost ?? Infinity;
}
