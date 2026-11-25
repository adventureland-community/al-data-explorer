import { ItemKey } from "typed-adventureland";
import { abbreviateGold } from "../Shared/utils";

import { OfferingChoice, PlanSummaryStep } from "../calculators";
import { CalcStrategy } from "./useUpgradeCalcParams";

export const TARGET_UPGRADE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
/** Compound ceiling matches design/items.js grades[3] clamp (≤7). */
export const TARGET_COMPOUND = [1, 2, 3, 4, 5, 6, 7];
export const RECENT_STORAGE_KEY = "aldex.upgradeCalc.recentItems";
export const RECENT_LIMIT = 6;

export function offeringList(params: {
  offeringp: boolean;
  offering: boolean;
  offeringx: boolean;
}): OfferingChoice[] {
  const list: OfferingChoice[] = [null];
  if (params.offeringp) list.push(1);
  if (params.offering) list.push(2);
  if (params.offeringx) list.push(3);
  return list;
}

export function offeringEnabled(
  key: "offeringp" | "offering" | "offeringx",
  params: { offeringp: boolean; offering: boolean; offeringx: boolean },
): boolean {
  if (key === "offeringp") return params.offeringp;
  if (key === "offering") return params.offering;
  return params.offeringx;
}

export function sumAttempts(steps: PlanSummaryStep[]): number {
  let sum = 0;
  for (const s of steps) {
    if (s.kind === "acquire") continue;
    // Prefer path-restart consume count (destroy rebuilds / compound ×3) over local 1/p.
    const n =
      s.consumeAttempts != null && Number.isFinite(s.consumeAttempts)
        ? s.consumeAttempts
        : s.attempts;
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}

/**
 * Chance of clearing the path with no failed clicks.
 * Upgrade: Π(p). Compound: Π(p_i ^ treeCopies_i) with ×3 fan-in per destroy step
 * (enough bases laid out so every compound succeeds on the first try).
 */
export function oneshotPercent(
  steps: PlanSummaryStep[],
  mode: "upgrade" | "compound" = "upgrade",
): number | null {
  const recipe = steps.filter((s) => s.kind !== "acquire" && s.kind !== "shiny");
  if (!recipe.length) return null;
  const fanIn = mode === "compound" ? 3 : 1;
  const n = recipe.length;
  const treeCopies = new Array<number>(n);
  treeCopies[n - 1] = 1;
  for (let i = n - 2; i >= 0; i--) {
    // scroll4 fails keep the item — no extra prior copies.
    treeCopies[i] =
      recipe[i + 1].scrollKey === "scroll4" ? treeCopies[i + 1] : fanIn * treeCopies[i + 1];
  }
  let product = 1;
  for (let i = 0; i < n; i++) {
    // Prefer attempts (EV rate, includes Lucky Slot) over game-visible chance.
    const s = recipe[i];
    const p =
      Number.isFinite(s.attempts) && s.attempts > 0
        ? 1 / s.attempts
        : Number.isFinite(s.chance) && s.chance > 0
        ? s.chance
        : 0;
    if (!(p > 0)) return null;
    product *= p ** treeCopies[i];
  }
  return product * 100;
}

export function heaviestStep(steps: PlanSummaryStep[]): PlanSummaryStep | null {
  let best: PlanSummaryStep | null = null;
  for (const s of steps) {
    if (s.kind === "acquire") continue;
    if (!Number.isFinite(s.stepSpend)) continue;
    if (!best || s.stepSpend > best.stepSpend) best = s;
  }
  return best;
}

export function planTotal(plan: { totalExpectedCost: number } | null): number | null {
  if (!plan || !("totalExpectedCost" in plan)) return null;
  return plan.totalExpectedCost;
}

export function strategyCompareBadge(
  thisStrategy: CalcStrategy,
  goldDelta: number | null,
  attemptDelta: number | null,
): string | null {
  const parts: string[] = [];
  if (goldDelta != null && Number.isFinite(goldDelta) && Math.abs(goldDelta) >= 1) {
    if (thisStrategy === "cheapest" && goldDelta > 0)
      parts.push(`saves ${abbreviateGold(goldDelta)}`);
    if (thisStrategy === "fewest" && goldDelta > 0)
      parts.push(`+${abbreviateGold(goldDelta)} gold`);
  }
  if (attemptDelta != null && Number.isFinite(attemptDelta) && Math.abs(attemptDelta) >= 0.05) {
    if (thisStrategy === "fewest" && attemptDelta > 0) {
      parts.push(`${attemptDelta.toFixed(attemptDelta >= 10 ? 0 : 1)} fewer tries`);
    }
    if (thisStrategy === "cheapest" && attemptDelta > 0) {
      parts.push(`+${attemptDelta.toFixed(attemptDelta >= 10 ? 0 : 1)} tries`);
    }
  }
  return parts.length ? parts.join(" · ") : null;
}

export function readRecentItems(): ItemKey[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const keys: ItemKey[] = [];
    for (const entry of parsed) {
      if (typeof entry === "string" && entry) keys.push(entry as ItemKey);
    }
    return keys.slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

export function pushRecentItem(key: ItemKey): ItemKey[] {
  const next = [key, ...readRecentItems().filter((k) => k !== key)].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}
