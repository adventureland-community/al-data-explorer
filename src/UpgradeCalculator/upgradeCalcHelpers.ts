import { ItemKey } from "typed-adventureland";

import { formatGold, OfferingChoice, PlanSummaryStep } from "../calculators";
import { CalcStrategy } from "./useUpgradeCalcParams";

export const TARGET_UPGRADE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const TARGET_COMPOUND = [1, 2, 3, 4, 5];
export const RECENT_STORAGE_KEY = "aldex.upgradeCalc.recentItems";
export const RECENT_LIMIT = 6;

export function offeringList(params: {
  offeringp: boolean;
  offering: boolean;
  offeringx: boolean;
}): OfferingChoice[] {
  const list: OfferingChoice[] = [null];
  if (params.offeringp) list.push(0);
  if (params.offering) list.push(1);
  if (params.offeringx) list.push(2);
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
    if (Number.isFinite(s.attempts)) sum += s.attempts;
  }
  return sum;
}

export function oneshotPercent(steps: PlanSummaryStep[]): number | null {
  const recipe = steps.filter((s) => s.kind !== "acquire");
  if (!recipe.length) return null;
  let product = 1;
  for (const s of recipe) {
    if (!Number.isFinite(s.chance) || s.chance <= 0) return null;
    product *= s.chance;
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
    if (thisStrategy === "cheapest" && goldDelta > 0) parts.push(`saves ${formatGold(goldDelta)}`);
    if (thisStrategy === "fewest" && goldDelta > 0) parts.push(`+${formatGold(goldDelta)} gold`);
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
