import { parseDropEntry, tableTotalWeight } from "./dropTable";
import { buildKillInspectionRows, type OddsInspectionRow } from "./dropSimInspection";

export type Rng = () => number;

const META_DROP_KEYS = new Set(["gold", "maps", "monsters", "monsters_home_server"]);

/** Coop kills: server skips drop_something when computed share ≤ this (issue_monster_awards). */
export const COOP_MIN_DROP_SHARE = 0.0025;

/** Coop kills: players with share above this count toward drop_table_multiplier. */
export const COOP_MIN_TABLE_COUNT_SHARE = 0.0008;

/** Scenario knobs for coop / non-coop / 1hp (caller-supplied; not read from G mid-run). */
export type KillPolicyInput = {
  cooperative: boolean;
  oneHp: boolean;
  /** Damage share 0–1; ignored when non-coop or 1hp+coop. */
  share: number;
  /** Players above the table× cutoff (share > 0.0008); approximates server drop_table_multiplier. */
  contributors: number;
};

export type KillPolicy = {
  share: number;
  tableMultiplier: number;
  /** False on coop when contribution share ≤ COOP_MIN_DROP_SHARE (no loot on server). */
  dropEligible: boolean;
};

export type ScenarioFlags = {
  cooperative: boolean;
  oneHp: boolean;
};

/** One weighted row in an exclusive table (may nest via open). */
export type WeightedEntry = {
  weight: number;
  itemKey: string;
  quantity: number | null;
  nestedTable: string;
};

/**
 * Absolute Bernoulli row for one kill attempt.
 * `probability` is capped at 1 for the drop roll; `rawRate` keeps the base rate × modifiers.
 */
export type AbsoluteOpportunity = {
  probability: number;
  /** Uncapped rate from data (× pool modifier). Values ≥ 1 are guaranteed per roll. */
  rawRate: number;
  /** Base drop rate from game data before luck/share/level modifiers. */
  baseRate: number;
  itemKey: string;
  quantity: number | null;
  nestedTable: string;
  /** How many independent rolls of this row per kill (coop table multiplier). */
  repeats: number;
};

export type OpportunitySet =
  | { kind: "exchange"; entries: WeightedEntry[]; drops: Record<string, unknown> }
  | { kind: "kill"; rows: AbsoluteOpportunity[]; drops: Record<string, unknown> };

export type OutcomeRow = {
  itemKey: string;
  quantity: number | null;
  observed: number;
  expected: number;
  /** Per-trial grant probability for this leaf (before × n). */
  probability: number;
  /** Kill rows with probability ≥ 1 never fail the Bernoulli check — observed always equals expected. */
  deterministic?: boolean;
};

export type AbsolutePoolSpec = {
  sourceType: "monster" | "map" | "table";
  sourceKey: string;
  entries: unknown[];
  /** Multiplies raw absolute chance before min(1, …). */
  modifier: number;
  /** Coop table multiplier only applies to monster tables on the server. */
  applyTableMultiplier: boolean;
};

/** Named exchange / loot table keys (top-level arrays on G.drops). */
export function listExchangeTables(drops: Record<string, unknown>): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(drops)) {
    if (META_DROP_KEYS.has(key)) continue;
    if (!Array.isArray(value)) continue;
    keys.push(key);
  }
  keys.sort((a, b) => a.localeCompare(b));
  return keys;
}

export function resolveKillPolicy(input: KillPolicyInput): KillPolicy {
  const contributors = Math.max(0, Math.floor(input.contributors));
  const contributionShare = Number.isFinite(input.share)
    ? Math.min(1, Math.max(0, input.share))
    : 0;

  if (!input.cooperative) {
    return { share: 1, tableMultiplier: 1, dropEligible: true };
  }

  const tableMultiplier = 1 + Math.floor(contributors / 10);
  const dropEligible = contributionShare > COOP_MIN_DROP_SHARE;

  if (input.oneHp) {
    return { share: 1, tableMultiplier, dropEligible };
  }

  return { share: contributionShare, tableMultiplier, dropEligible };
}

/** Share passed into drop roll modifiers; zero when coop contribution is below threshold. */
export function effectiveKillDropShare(policy: KillPolicy): number {
  return policy.dropEligible ? policy.share : 0;
}

/** Runtime monster luckx from level (server: starts at 1, +0.25 per level-up). */
export function monsterLuckxFromLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return 1 + 0.25 * (lv - 1);
}

/** Global drop modifier (server: monster.mult, ×1000 when monster["1hp"]). */
export function globalDropMult(monsterMult: number, oneHp: boolean): number {
  const mult = Number.isFinite(monsterMult) && monsterMult > 0 ? monsterMult : 1;
  return oneHp ? mult * 1000 : mult;
}

export function diffFromLive(live: ScenarioFlags, scenario: ScenarioFlags): string[] {
  const deltas: string[] = [];
  if (live.cooperative !== scenario.cooperative) {
    deltas.push(
      scenario.cooperative
        ? "Live: not coop → simulating as coop"
        : "Live: coop → simulating as non-coop",
    );
  }
  if (live.oneHp !== scenario.oneHp) {
    deltas.push(
      scenario.oneHp ? "Live: not 1hp → simulating as 1hp" : "Live: 1hp → simulating without 1hp",
    );
  }
  return deltas;
}

function parseWeightedEntries(raw: unknown[]): WeightedEntry[] {
  const total = tableTotalWeight(raw);
  if (total <= 0) return [];
  const entries: WeightedEntry[] = [];
  for (const entry of raw) {
    const parsed = parseDropEntry("table", "", entry, "weighted", total);
    for (const row of parsed) {
      if (!Array.isArray(entry) || typeof entry[0] !== "number") continue;
      entries.push({
        weight: entry[0],
        itemKey: row.itemKey,
        quantity: row.quantity,
        nestedTable: row.nestedTable,
      });
    }
  }
  return entries;
}

export function buildExchangeOpportunities(
  drops: Record<string, unknown>,
  tableKey: string,
): OpportunitySet | null {
  const raw = drops[tableKey];
  if (!Array.isArray(raw)) return null;
  const entries = parseWeightedEntries(raw);
  if (entries.length === 0) return null;
  return { kind: "exchange", entries, drops };
}

function absoluteBaseProbability(probability: number | null): number {
  if (probability == null) return 1;
  if (!Number.isFinite(probability) || probability <= 0) return 0;
  return probability;
}

function parseAbsoluteRows(
  sourceType: "monster" | "map" | "table",
  sourceKey: string,
  entries: unknown[],
  modifier: number,
  repeats: number,
): AbsoluteOpportunity[] {
  const rows: AbsoluteOpportunity[] = [];
  for (const entry of entries) {
    const parsed = parseDropEntry(sourceType, sourceKey, entry, "absolute");
    for (const row of parsed) {
      const base = absoluteBaseProbability(row.probability);
      const rawRate = base * modifier;
      const effective = Math.min(1, rawRate);
      if (effective <= 0 && rawRate <= 0 && !row.nestedTable && !row.itemKey) continue;
      rows.push({
        probability: effective,
        rawRate,
        baseRate: base,
        itemKey: row.itemKey,
        quantity: row.quantity,
        nestedTable: row.nestedTable,
        repeats,
      });
    }
  }
  return rows;
}

export function buildKillOpportunities(args: {
  drops: Record<string, unknown>;
  pools: AbsolutePoolSpec[];
  policy: KillPolicy;
}): OpportunitySet {
  const rows: AbsoluteOpportunity[] = [];
  for (const pool of args.pools) {
    const repeats = pool.applyTableMultiplier ? args.policy.tableMultiplier : 1;
    rows.push(
      ...parseAbsoluteRows(pool.sourceType, pool.sourceKey, pool.entries, pool.modifier, repeats),
    );
  }
  return { kind: "kill", rows, drops: args.drops };
}

/** Resolved multipliers for one kill (server drop_something / shouldItemDrop). */
export type KillDropModifiers = {
  luckm: number;
  share: number;
  level: number;
  monsterMult: number;
  monsterLuckx: number;
  hpMult: number;
  globalMult: number;
  monsterTable: number;
  /** Konami skin: share × luckm × level (no mult / luckx). */
  konami: number;
  map: number;
  globalStatic: number;
  global: number;
};

export function resolveKillDropModifiers(args: {
  luckm: number;
  policy: KillPolicy;
  level: number;
  oneHp?: boolean;
  monsterLuckx?: number;
  monsterMult?: number;
  monsterHp?: number;
}): KillDropModifiers {
  const luckm = Number.isFinite(args.luckm) && args.luckm > 0 ? args.luckm : 1;
  const level = Number.isFinite(args.level) && args.level > 0 ? args.level : 1;
  const share = effectiveKillDropShare(args.policy);
  const monsterMult =
    args.monsterMult != null && Number.isFinite(args.monsterMult) && args.monsterMult > 0
      ? args.monsterMult
      : 1;
  const monsterLuckx =
    args.monsterLuckx != null && Number.isFinite(args.monsterLuckx) && args.monsterLuckx > 0
      ? args.monsterLuckx
      : monsterLuckxFromLevel(level);
  const globalMult = globalDropMult(monsterMult, !!args.oneHp);
  const hpMult =
    args.monsterHp != null && Number.isFinite(args.monsterHp) && args.monsterHp > 0
      ? args.monsterHp / 1000
      : 1;
  const monsterTable = luckm * share * level * monsterMult;
  return {
    luckm,
    share,
    level,
    monsterMult,
    monsterLuckx,
    hpMult,
    globalMult,
    /** Server shouldItemDrop: share × luckm × level × mult — no luckx. */
    monsterTable,
    /** Server konami: random / share / luckm / level. */
    konami: luckm * share * level,
    /** Server map: share × luckm × hp_mult × luckx. */
    map: luckm * share * hpMult * monsterLuckx,
    /** Server global_static: share × luckm × luckx × global_mult. */
    globalStatic: luckm * share * monsterLuckx * globalMult,
    /** Server global: share × luckm × hp_mult × luckx × global_mult. */
    global: luckm * share * hpMult * monsterLuckx * globalMult,
  };
}

/** Player-facing caption for Kill Drop Plan roll modifiers. */
export function formatKillRollCaption(args: {
  mods: KillDropModifiers;
  policy: KillPolicy;
  konami?: boolean;
  includeMap: boolean;
  includeGlobals: boolean;
  includeHomeServer?: boolean;
}): string {
  const { mods, policy } = args;
  if (args.konami) {
    let text = `Konami skin ×${mods.konami.toFixed(2)} (${mods.luckm} luck × ${
      mods.level
    } m.lvl × ${mods.share} share) — replaces monster/map/global tables`;
    if (policy.tableMultiplier > 1) {
      text += ` · table× ignored for konami`;
    }
    return text;
  }
  const parts = [`${mods.luckm} luck`, `${mods.level} m.lvl`, `${mods.share} share`];
  if (mods.monsterMult !== 1) {
    parts.push(`${mods.monsterMult} mult`);
  }
  let text = `Monster table ×${mods.monsterTable.toFixed(2)} (${parts.join(" × ")})`;
  const extras: string[] = [];
  if (args.includeMap) extras.push(`map ×${mods.map.toFixed(2)}`);
  if (args.includeGlobals) {
    extras.push(`global_static ×${mods.globalStatic.toFixed(2)}`);
    extras.push(`global ×${mods.global.toFixed(2)}`);
  }
  if (args.includeHomeServer) extras.push(`home-server ×${mods.monsterTable.toFixed(2)}`);
  if (extras.length > 0) {
    text += `. Extra pools: ${extras.join(", ")}`;
  }
  if (policy.tableMultiplier > 1) {
    text += ` · table×${policy.tableMultiplier} rolls per kill`;
  }
  return text;
}

/** First spawn map for a monster (sorted for stable defaults). */
export function defaultMapForMonster(
  spawnsByMonster: Map<string, readonly string[]> | undefined,
  monsterKey: string,
): string {
  if (!spawnsByMonster || !monsterKey) return "";
  const maps = spawnsByMonster.get(monsterKey);
  if (!maps || maps.length === 0) return "";
  return [...maps].sort((a, b) => a.localeCompare(b))[0] ?? "";
}

/** Build standard monster (+ optional map/global/home) pools for a kill scenario. */
export function buildKillPools(args: {
  drops: Record<string, unknown>;
  monsterKey: string;
  luckm: number;
  policy: KillPolicy;
  /** Monster instance level (server: monster.level in shouldItemDrop). */
  level: number;
  /** When true, global pools use monster.mult × 1000 (server: monster["1hp"]). */
  oneHp?: boolean;
  monsterLuckx?: number;
  monsterMult?: number;
  mapKey?: string;
  includeGlobals?: boolean;
  /** Player tskin === "konami": only D.drops.konami rolls. */
  konami?: boolean;
  /** Player on home server: also roll monsters_home_server[type]. */
  homeServer?: boolean;
  monsterHp?: number;
}): AbsolutePoolSpec[] {
  const mods = resolveKillDropModifiers(args);

  if (args.konami) {
    const konamiTable = args.drops.konami;
    if (!Array.isArray(konamiTable) || konamiTable.length === 0) return [];
    return [
      {
        sourceType: "table",
        sourceKey: "konami",
        entries: konamiTable,
        modifier: mods.konami,
        applyTableMultiplier: false,
      },
    ];
  }

  const pools: AbsolutePoolSpec[] = [];

  const monsterTable = (args.drops.monsters as Record<string, unknown[]> | undefined)?.[
    args.monsterKey
  ];
  if (Array.isArray(monsterTable)) {
    pools.push({
      sourceType: "monster",
      sourceKey: args.monsterKey,
      entries: monsterTable,
      modifier: mods.monsterTable,
      applyTableMultiplier: true,
    });
  }

  if (args.homeServer) {
    const homeTable = (args.drops.monsters_home_server as Record<string, unknown[]> | undefined)?.[
      args.monsterKey
    ];
    if (Array.isArray(homeTable)) {
      pools.push({
        sourceType: "monster",
        sourceKey: `${args.monsterKey}#home`,
        entries: homeTable,
        modifier: mods.monsterTable,
        applyTableMultiplier: false,
      });
    }
  }

  const maps = args.drops.maps as Record<string, unknown[]> | undefined;
  if (!maps) return pools;

  if (args.mapKey && Array.isArray(maps[args.mapKey])) {
    pools.push({
      sourceType: "map",
      sourceKey: args.mapKey,
      entries: maps[args.mapKey]!,
      modifier: mods.map,
      applyTableMultiplier: false,
    });
  }

  if (args.includeGlobals) {
    if (Array.isArray(maps.global_static)) {
      pools.push({
        sourceType: "map",
        sourceKey: "global_static",
        entries: maps.global_static,
        modifier: mods.globalStatic,
        applyTableMultiplier: false,
      });
    }
    if (Array.isArray(maps.global)) {
      pools.push({
        sourceType: "map",
        sourceKey: "global",
        entries: maps.global,
        modifier: mods.global,
        applyTableMultiplier: false,
      });
    }
  }

  return pools;
}

export type PlanKillDropsInput = {
  drops: Record<string, unknown>;
  monsterKey: string;
  luckm: number;
  cooperative: boolean;
  oneHp: boolean;
  share: number;
  contributors: number;
  level: number;
  mapKey?: string;
  includeGlobals?: boolean;
  konami?: boolean;
  homeServer?: boolean;
  monsterHp?: number;
  monsterLuckx?: number;
  monsterMult?: number;
};

/** Kill Drop Plan: pools, opportunities, odds, and roll caption for one scenario. */
export type KillDropPlan = {
  policy: KillPolicy;
  mods: KillDropModifiers;
  pools: AbsolutePoolSpec[];
  opportunities: OpportunitySet;
  oddsRows: OddsInspectionRow[];
  rollCaption: string;
};

/**
 * Plan one kill scenario. Callers and tests cross this seam instead of
 * wiring buildKillPools → opportunities → inspection themselves.
 */
export function planKillDrops(input: PlanKillDropsInput): KillDropPlan | null {
  if (!input.monsterKey) return null;
  const policy = resolveKillPolicy({
    cooperative: input.cooperative,
    oneHp: input.oneHp,
    share: input.share,
    contributors: input.contributors,
  });
  const mods = resolveKillDropModifiers({
    luckm: input.luckm,
    policy,
    level: input.level,
    oneHp: input.oneHp,
    monsterLuckx: input.monsterLuckx,
    monsterMult: input.monsterMult,
    monsterHp: input.monsterHp,
  });
  const pools = buildKillPools({
    drops: input.drops,
    monsterKey: input.monsterKey,
    luckm: input.luckm,
    policy,
    level: input.level,
    oneHp: input.oneHp,
    monsterLuckx: input.monsterLuckx,
    monsterMult: input.monsterMult,
    mapKey: input.mapKey,
    includeGlobals: input.includeGlobals,
    konami: input.konami,
    homeServer: input.homeServer,
    monsterHp: input.monsterHp,
  });
  if (pools.length === 0) return null;
  const opportunities = buildKillOpportunities({ drops: input.drops, pools, policy });
  if (opportunities.kind !== "kill") return null;
  return {
    policy,
    mods,
    pools,
    opportunities,
    oddsRows: buildKillInspectionRows(opportunities.rows, mods.luckm),
    rollCaption: formatKillRollCaption({
      mods,
      policy,
      konami: input.konami,
      includeMap: Boolean(input.mapKey) && !input.konami,
      includeGlobals: Boolean(input.includeGlobals) && !input.konami,
      includeHomeServer: Boolean(input.homeServer) && !input.konami,
    }),
  };
}

type LeafGrant = { itemKey: string; quantity: number | null };

function grantKey(grant: LeafGrant): string {
  return `${grant.itemKey}\0${grant.quantity ?? ""}`;
}

function rollWeightedExclusive(
  entries: WeightedEntry[],
  drops: Record<string, unknown>,
  rng: Rng,
  depth = 0,
): LeafGrant | null {
  if (entries.length === 0 || depth > 16) return null;
  let total = 0;
  for (const entry of entries) {
    total += entry.weight;
  }
  if (total <= 0) return null;
  const roll = rng() * total;
  let current = 0;
  for (const entry of entries) {
    current += entry.weight;
    if (roll > current) continue;
    if (entry.nestedTable) {
      const nested = drops[entry.nestedTable];
      if (!Array.isArray(nested)) return null;
      return rollWeightedExclusive(parseWeightedEntries(nested), drops, rng, depth + 1);
    }
    if (!entry.itemKey) return null;
    return { itemKey: entry.itemKey, quantity: entry.quantity };
  }
  return null;
}

/** Expected leaf probabilities for one exclusive roll (open expanded). */
function exclusiveLeafProbabilities(
  entries: WeightedEntry[],
  drops: Record<string, unknown>,
  depth = 0,
): Map<string, { probability: number; quantity: number | null; itemKey: string }> {
  const out = new Map<string, { probability: number; quantity: number | null; itemKey: string }>();
  if (entries.length === 0 || depth > 16) return out;
  let total = 0;
  for (const entry of entries) {
    total += entry.weight;
  }
  if (total <= 0) return out;

  for (const entry of entries) {
    const p = entry.weight / total;
    if (entry.nestedTable) {
      const nested = drops[entry.nestedTable];
      if (!Array.isArray(nested)) continue;
      const nestedLeaves = exclusiveLeafProbabilities(
        parseWeightedEntries(nested),
        drops,
        depth + 1,
      );
      for (const [key, leaf] of nestedLeaves) {
        const prev = out.get(key);
        const add = p * leaf.probability;
        if (prev) {
          prev.probability += add;
        } else {
          out.set(key, {
            itemKey: leaf.itemKey,
            quantity: leaf.quantity,
            probability: add,
          });
        }
      }
      continue;
    }
    if (!entry.itemKey) continue;
    const key = grantKey(entry);
    const prev = out.get(key);
    if (prev) {
      prev.probability += p;
    } else {
      out.set(key, {
        itemKey: entry.itemKey,
        quantity: entry.quantity,
        probability: p,
      });
    }
  }
  return out;
}

function addObserved(
  counts: Map<string, { itemKey: string; quantity: number | null; observed: number }>,
  grant: LeafGrant,
  amount = 1,
) {
  const key = grantKey(grant);
  const prev = counts.get(key);
  if (prev) {
    prev.observed += amount;
  } else {
    counts.set(key, {
      itemKey: grant.itemKey,
      quantity: grant.quantity,
      observed: amount,
    });
  }
}

function expectedMapFromSet(
  set: OpportunitySet,
): Map<string, { itemKey: string; quantity: number | null; probability: number }> {
  if (set.kind === "exchange") {
    return exclusiveLeafProbabilities(set.entries, set.drops);
  }

  const out = new Map<string, { itemKey: string; quantity: number | null; probability: number }>();
  for (const row of set.rows) {
    const successP = Math.min(1, row.probability) * row.repeats;
    if (row.nestedTable) {
      const nested = set.drops[row.nestedTable];
      if (!Array.isArray(nested)) continue;
      const leaves = exclusiveLeafProbabilities(parseWeightedEntries(nested), set.drops);
      for (const [key, leaf] of leaves) {
        const add = successP * leaf.probability;
        const prev = out.get(key);
        if (prev) {
          prev.probability += add;
        } else {
          out.set(key, {
            itemKey: leaf.itemKey,
            quantity: leaf.quantity,
            probability: add,
          });
        }
      }
      continue;
    }
    if (!row.itemKey) continue;
    const key = grantKey(row);
    const prev = out.get(key);
    if (prev) {
      prev.probability += successP;
    } else {
      out.set(key, {
        itemKey: row.itemKey,
        quantity: row.quantity,
        probability: successP,
      });
    }
  }
  return out;
}

function deterministicGrantKeys(set: Extract<OpportunitySet, { kind: "kill" }>): Set<string> {
  const byKey = new Map<string, boolean>();
  for (const row of set.rows) {
    if (row.nestedTable || !row.itemKey) continue;
    const key = grantKey(row);
    const guaranteed = row.probability >= 1;
    const prev = byKey.get(key);
    byKey.set(key, prev === undefined ? guaranteed : prev && guaranteed);
  }
  return new Set([...byKey.entries()].filter(([, guaranteed]) => guaranteed).map(([key]) => key));
}

/** Bernoulli rolls per kill trial (each table row × coop repeats). */
export function killBernoulliRollsPerTrial(set: OpportunitySet): number {
  if (set.kind !== "kill") return 0;
  let rolls = 0;
  for (const row of set.rows) {
    rolls += row.repeats;
  }
  return rolls;
}

/**
 * Run N trials. Exchange: one exclusive pick per trial.
 * Kill: each absolute row (× repeats) independently; open → exclusive nested pick.
 */
export function simulateOutcomes(args: {
  opportunities: OpportunitySet;
  n: number;
  rng?: Rng;
}): OutcomeRow[] {
  const n = Math.max(0, Math.floor(args.n));
  const rng = args.rng ?? Math.random;
  const expectedByKey = expectedMapFromSet(args.opportunities);
  const deterministicKeys =
    args.opportunities.kind === "kill"
      ? deterministicGrantKeys(args.opportunities)
      : new Set<string>();
  const observed = new Map<
    string,
    { itemKey: string; quantity: number | null; observed: number }
  >();

  for (let i = 0; i < n; i += 1) {
    if (args.opportunities.kind === "exchange") {
      const grant = rollWeightedExclusive(
        args.opportunities.entries,
        args.opportunities.drops,
        rng,
      );
      if (grant) addObserved(observed, grant);
    } else {
      for (const row of args.opportunities.rows) {
        for (let r = 0; r < row.repeats; r += 1) {
          if (rng() >= row.probability) continue;
          if (row.nestedTable) {
            const nested = args.opportunities.drops[row.nestedTable];
            if (!Array.isArray(nested)) continue;
            const grant = rollWeightedExclusive(
              parseWeightedEntries(nested),
              args.opportunities.drops,
              rng,
            );
            if (grant) addObserved(observed, grant);
            continue;
          }
          if (!row.itemKey) continue;
          addObserved(observed, { itemKey: row.itemKey, quantity: row.quantity });
        }
      }
    }
  }

  const keys = new Set([...expectedByKey.keys(), ...observed.keys()]);
  const rows: OutcomeRow[] = [];
  for (const key of keys) {
    const exp = expectedByKey.get(key);
    const obs = observed.get(key);
    const itemKey = exp?.itemKey ?? obs?.itemKey ?? "";
    if (!itemKey) continue;
    const probability = exp?.probability ?? 0;
    rows.push({
      itemKey,
      quantity: exp?.quantity ?? obs?.quantity ?? null,
      observed: obs?.observed ?? 0,
      expected: probability * n,
      probability,
      deterministic: deterministicKeys.has(key) || undefined,
    });
  }

  rows.sort((a, b) => b.expected - a.expected || a.itemKey.localeCompare(b.itemKey));
  return rows;
}

/** Deterministic RNG for tests (cycles through values). */
export function seqRngFrom(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length]!;
    i += 1;
    return v;
  };
}

export type { OddsInspectionRow } from "./dropSimInspection";
export {
  buildExchangeInspectionRows,
  buildKillInspectionRows,
  exchangeTokenCosts,
  killRowPerKillExpectation,
} from "./dropSimInspection";
