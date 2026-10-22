import { ItemKey } from "typed-adventureland";

import type { ItemsByNameTitleLevel } from "../Market/merchantTypes";

export const STARTER_SECTION_LIMIT = 8;

export type StarterPickSections = {
  recent: ItemKey[];
  market: ItemKey[];
  random: ItemKey[];
};

/** Merchant listing activity for one item (buyers + sellers + listed qty). */
export function marketActivityScore(items: ItemsByNameTitleLevel, key: ItemKey): number {
  const byTitle = items[key];
  if (!byTitle) return 0;
  let score = 0;
  for (const byLevel of Object.values(byTitle)) {
    if (!byLevel) continue;
    for (const prices of byLevel) {
      if (!prices) continue;
      score += Object.keys(prices.buying.merchants).length;
      score += Object.keys(prices.selling.merchants).length;
      score += prices.buying.amount + prices.selling.amount;
    }
  }
  return score;
}

function filterAvailable(
  keys: ItemKey[],
  available: Set<ItemKey>,
  exclude: Set<ItemKey>,
): ItemKey[] {
  const out: ItemKey[] = [];
  for (const key of keys) {
    if (!available.has(key) || exclude.has(key)) continue;
    out.push(key);
  }
  return out;
}

/** Fisher–Yates sample of up to `count` keys (does not mutate `pool`). */
export function sampleKeys(
  pool: ItemKey[],
  count: number,
  rng: () => number = Math.random,
): ItemKey[] {
  if (count <= 0 || pool.length === 0) return [];
  const copy = pool.slice();
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (copy.length - i));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy.slice(0, n);
}

/**
 * Empty-state starters: recent first, then actively listed market items, then a random
 * sample of whatever is left. No hardcoded item lists.
 */
export function buildStarterPicks(args: {
  available: ItemKey[];
  recent: ItemKey[];
  marketItems: ItemsByNameTitleLevel;
  recentLimit?: number;
  marketLimit?: number;
  randomLimit?: number;
  rng?: () => number;
}): StarterPickSections {
  const availableSet = new Set(args.available);
  const recentLimit = args.recentLimit ?? STARTER_SECTION_LIMIT;
  const marketLimit = args.marketLimit ?? STARTER_SECTION_LIMIT;
  const randomLimit = args.randomLimit ?? STARTER_SECTION_LIMIT;
  const rng = args.rng ?? Math.random;

  const recent = filterAvailable(args.recent, availableSet, new Set()).slice(0, recentLimit);
  const taken = new Set(recent);

  const marketRanked = args.available
    .map((key) => ({ key, score: marketActivityScore(args.marketItems, key) }))
    .filter((row) => row.score > 0 && !taken.has(row.key))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const market: ItemKey[] = [];
  for (const row of marketRanked) {
    if (market.length >= marketLimit) break;
    market.push(row.key);
    taken.add(row.key);
  }

  const leftover = args.available.filter((key) => !taken.has(key));
  const random = sampleKeys(leftover, randomLimit, rng);

  return { recent, market, random };
}
