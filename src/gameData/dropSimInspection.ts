import type { AbsoluteOpportunity, WeightedEntry } from "./dropSim";

/**
 * Minimum luckm so each table roll on this row succeeds (effective rate ≥ 1).
 * needed = currentLuckm / rawRate when 0 < rawRate < 1.
 */
export function luckmNeededToGuaranteeRoll(args: {
  rawRate: number | null;
  currentLuckm: number;
}): { luckm: number | null; guaranteedNow: boolean } {
  const raw = args.rawRate ?? 0;
  const luckm = Number.isFinite(args.currentLuckm) && args.currentLuckm > 0 ? args.currentLuckm : 1;

  if (raw >= 1) {
    return { luckm: null, guaranteedNow: true };
  }
  if (raw <= 0) {
    return { luckm: null, guaranteedNow: false };
  }

  const needed = luckm / raw;
  if (!Number.isFinite(needed) || needed <= luckm) {
    return { luckm: null, guaranteedNow: true };
  }
  return { luckm: needed, guaranteedNow: false };
}

/**
 * Exchange loot-table inspector rows in **table order** (old /drops/exchange UX):
 * weight, p = weight/Σ, expected rolls = 1/p, cumulative weight + normalized roll threshold.
 */
export type OddsInspectionRow = {
  itemKey: string;
  nestedTable: string;
  quantity: number | null;
  /** Raw exclusive weight (exchange); null for kill absolute rows. */
  weight: number | null;
  /** Roll probability (Bernoulli, capped at 1 for kill rows). */
  probability: number;
  /** Kill rows: uncapped data rate for display (≥ 1 → guaranteed). */
  rawRate: number | null;
  /** Kill rows: base drop rate from game data before luck/share/level modifiers. */
  baseRate: number | null;
  /** Kill rows: expected per kill from this table row (rollP × repeats). */
  perKillRate: number | null;
  /** Trials until success: 1/p when 0 < p ≤ 1. */
  expectedRolls: number | null;
  cumulative: number | null;
  /** Cumulative / total in [0, 1] — exclusive roll band end. */
  rollThreshold: number | null;
  /** Visual bar fraction in [0, 1]. */
  barFraction: number;
  repeats: number;
  /** Kill rows: min luckm so each table roll succeeds (rawRate ≥ 1); null if N/A or already guaranteed. */
  luckmToGuarantee: number | null;
  /** Kill rows: already guaranteed at the luckm used to build this row. */
  guaranteedNow: boolean;
};

export function buildExchangeInspectionRows(entries: WeightedEntry[]): OddsInspectionRow[] {
  let total = 0;
  for (const entry of entries) {
    total += entry.weight;
  }
  if (total <= 0) return [];
  let cumulative = 0;
  const rows: OddsInspectionRow[] = [];
  for (const entry of entries) {
    cumulative += entry.weight;
    const probability = entry.weight / total;
    rows.push({
      itemKey: entry.itemKey,
      nestedTable: entry.nestedTable,
      quantity: entry.quantity,
      weight: entry.weight,
      probability,
      rawRate: null,
      baseRate: null,
      perKillRate: null,
      expectedRolls: probability > 0 ? 1 / probability : null,
      cumulative,
      rollThreshold: cumulative / total,
      barFraction: probability,
      repeats: 1,
      luckmToGuarantee: null,
      guaranteedNow: false,
    });
  }
  return rows;
}

/** Expected grants per kill from one absolute table row (matches simulateOutcomes EV). */
export function killRowPerKillExpectation(probability: number, repeats: number): number {
  return repeats * probability;
}

/** Kill absolute rows in pool/table order with per-roll and per-kill rates. */
export function buildKillInspectionRows(
  rows: AbsoluteOpportunity[],
  currentLuckm = 1,
): OddsInspectionRow[] {
  return rows.map((row) => {
    const displayRate = row.rawRate;
    const rollP = row.probability;
    const perKillRate = killRowPerKillExpectation(rollP, row.repeats);
    const guarantee =
      row.nestedTable || !row.itemKey
        ? { luckm: null, guaranteedNow: false }
        : luckmNeededToGuaranteeRoll({
            rawRate: row.rawRate,
            currentLuckm,
          });
    return {
      itemKey: row.itemKey,
      nestedTable: row.nestedTable,
      quantity: row.quantity,
      weight: null,
      probability: rollP,
      rawRate: displayRate,
      baseRate: row.baseRate,
      perKillRate,
      expectedRolls:
        perKillRate >= 1 ? 1 : perKillRate > 0 ? 1 / perKillRate : displayRate >= 1 ? 1 : null,
      cumulative: null,
      rollThreshold: null,
      barFraction: Math.min(1, perKillRate),
      repeats: row.repeats,
      luckmToGuarantee: guarantee.luckm,
      guaranteedNow: guarantee.guaranteedNow,
    };
  });
}

/** Token spend line when a named table appears in G.tokens shops. */
export function exchangeTokenCosts(args: {
  tokens: Record<string, unknown> | undefined;
  tableKey: string;
  n: number;
}): Array<{ tokenKey: string; total: number }> {
  if (!args.tokens) return [];
  const costs: Array<{ tokenKey: string; total: number }> = [];
  for (const [tokenKey, shop] of Object.entries(args.tokens)) {
    if (!shop || typeof shop !== "object") continue;
    const price = (shop as Record<string, unknown>)[args.tableKey];
    if (typeof price !== "number" || !Number.isFinite(price)) continue;
    costs.push({ tokenKey, total: price * args.n });
  }
  return costs;
}
