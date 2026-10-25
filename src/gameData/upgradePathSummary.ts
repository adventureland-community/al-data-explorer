import type { CompoundPathPlan, UpgradePathPlan } from "./upgradePath";
import { expectedPlanShrineMs } from "./upgradePathShrine";
import {
  offeringKeyFromGrade,
  PriceTable,
  scrollKeyForCompound,
  scrollKeyForUpgrade,
  STAT_SCROLL_PROXY_KEY,
  unitPrice,
} from "./upgradePrices";

export type PlanSummaryStep = {
  fromLevel: number;
  toLevel: number;
  scrollKey: string;
  offeringKey: string | null;
  primstacking: number;
  primstackingStatClicks: number;
  primstackingNormal: number;
  primstackingStatScrollEach: number;
  statScrollGrace: number;
  failstack: number;
  ograce: number;
  /** Table chance for this level when known. */
  baseChance?: number;
  /** Chance cap when known. */
  chanceCap?: number;
  chance: number;
  attempts: number;
  stepSpend: number;
  runningTotal: number;
  /** Expected shrine wait for this step alone (Mass Production++). */
  shrineMs: number;
  /**
   * `acquire` = obtain the starting copy at `fromLevel`.
   * `shiny` = ingot/nugget polish (no scroll; fail keeps the item).
   */
  kind?: "acquire" | "shiny";
  /** How Acquire is costed (UI label + shopping list). */
  acquireMode?: "buy" | "craft";
  /** Craft leaf item keys (one craft) for Acquire row icons. */
  acquireLeafKeys?: string[];
};

export type MaterialLine = {
  itemKey: string;
  expectedQty: number;
  unitPrice: number;
  total: number;
};

function addQty(map: Map<string, number>, key: string, n: number): void {
  if (!Number.isFinite(n) || n <= 0) return;
  map.set(key, (map.get(key) ?? 0) + n);
}

function materialLinesFromQty(qty: Map<string, number>, prices: PriceTable): MaterialLine[] {
  const lines: MaterialLine[] = [];
  for (const [itemKey, expectedQty] of qty) {
    const price = unitPrice(prices, itemKey);
    lines.push({
      itemKey,
      expectedQty,
      unitPrice: Number.isFinite(price) ? price : 0,
      total: Number.isFinite(price) ? price * expectedQty : Infinity,
    });
  }
  lines.sort((a, b) => a.itemKey.localeCompare(b.itemKey));
  return lines;
}

/**
 * Expected number of +0 purchases to finish the plan.
 *
 * Prefer 1 / Π(step chance) over destroy-scroll steps (scroll4 fails keep the
 * item and do not force a new base). That matches “how many times do I start
 * from +0?”, which is what Acquire qty and Shiny polish campaigns need.
 *
 * Falls back to (item gold in materials + EV gap) / unit price when chances
 * are missing.
 */
export function expectedBaseCopies(args: {
  itemKey: string;
  itemValue: number;
  planEv: number;
  materials: MaterialLine[];
  steps?: PlanSummaryStep[];
}): number {
  const { itemKey, itemValue, planEv, materials, steps } = args;

  if (steps?.length) {
    let survive = 1;
    let sawDestroyStep = false;
    for (const s of steps) {
      if (s.kind === "acquire" || s.kind === "shiny") continue;
      // scroll4: fail keeps the item — no new +0.
      if (s.scrollKey === "scroll4") continue;
      if (!(s.chance > 0) || !Number.isFinite(s.chance)) {
        survive = 0;
        break;
      }
      sawDestroyStep = true;
      survive *= s.chance;
    }
    if (sawDestroyStep && survive > 0 && Number.isFinite(survive)) {
      const n = 1 / survive;
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (!sawDestroyStep) return 1;
  }

  if (!(itemValue > 0) || !Number.isFinite(itemValue) || !Number.isFinite(planEv)) return 1;
  let materialsSum = 0;
  for (const m of materials) {
    if (Number.isFinite(m.total)) materialsSum += m.total;
  }
  const destroyGap = planEv > materialsSum ? planEv - materialsSum : 0;
  const line = materials.find((m) => m.itemKey === itemKey);
  const listedQty = line && Number.isFinite(line.expectedQty) ? line.expectedQty : 0;
  const listedGold = line && Number.isFinite(line.total) ? line.total : listedQty * itemValue;
  const n = (listedGold + destroyGap) / itemValue;
  if (!Number.isFinite(n) || n <= 0) return Math.max(listedQty, 1);
  return Math.max(n, listedQty, 1);
}

/**
 * Move expected base-item gold onto the Acquire row (qty × unit).
 * Rescales recipe step spends so Acquire + recipes = planEv (works for both
 * Cheapest deltas and Fewest full-step EV accounting).
 */
export function foldExpectedBaseCopies(args: {
  steps: PlanSummaryStep[];
  materials: MaterialLine[];
  itemKey: string;
  /** Replacement / destroy accounting unit (planner itemValue). */
  itemValue: number;
  planEv: number;
  /** Gold charged per expected copy on the Acquire row. Defaults to `itemValue`. */
  acquireChargePerCopy?: number;
  /**
   * Per-output craft shopping lines (qty for one craft). Scaled by expected copies.
   * When set and charging Acquire, replaces the finished-item material line.
   */
  craftMaterialLines?: MaterialLine[] | null;
  acquireMode?: "buy" | "craft";
}): number {
  const { steps, materials, itemKey, itemValue, planEv } = args;
  const acquire = steps.find((s) => s.kind === "acquire");
  const chargeRaw = args.acquireChargePerCopy;
  const charge =
    chargeRaw != null && Number.isFinite(chargeRaw) && chargeRaw >= 0 ? chargeRaw : itemValue;
  const acquireMode = args.acquireMode ?? (args.craftMaterialLines?.length ? "craft" : "buy");
  if (!acquire || !Number.isFinite(planEv)) return 1;
  if (!(itemValue > 0) && !(charge > 0)) return 1;

  const copies = expectedBaseCopies({
    itemKey,
    itemValue: itemValue > 0 ? itemValue : 1,
    planEv,
    materials,
    steps,
  });
  const replacementGold =
    itemValue > 0 && Number.isFinite(itemValue) ? Math.min(copies * itemValue, planEv) : 0;
  const baseGold = charge > 0 ? Math.min(copies * charge, planEv) : 0;

  const recipe = steps.filter((s) => s.kind !== "acquire" && s.kind !== "shiny");
  let recipeSum = 0;
  for (const s of recipe) {
    if (Number.isFinite(s.stepSpend) && s.stepSpend > 0) recipeSum += s.stepSpend;
  }
  const recipeTarget = Math.max(0, planEv - replacementGold);
  if (recipeSum > 0 && Number.isFinite(recipeTarget)) {
    const scale = recipeTarget / recipeSum;
    for (const s of recipe) {
      if (!(Number.isFinite(s.stepSpend) && s.stepSpend > 0)) continue;
      s.stepSpend *= scale;
    }
  }

  acquire.attempts = copies;
  acquire.stepSpend = baseGold;
  acquire.chance = 1;
  acquire.baseChance = 1;
  acquire.chanceCap = 1;
  acquire.acquireMode = acquireMode;
  acquire.acquireLeafKeys =
    acquireMode === "craft" && args.craftMaterialLines?.length
      ? args.craftMaterialLines.filter((m) => m.itemKey !== "_craft_fee").map((m) => m.itemKey)
      : undefined;

  for (let i = materials.length - 1; i >= 0; i--) {
    const k = materials[i]?.itemKey;
    if (k === itemKey || k === "_craft_fee") materials.splice(i, 1);
  }

  if (args.craftMaterialLines?.length && charge > 0) {
    for (const src of args.craftMaterialLines) {
      const expectedQty = src.expectedQty * copies;
      const total =
        Number.isFinite(src.unitPrice) && Number.isFinite(expectedQty)
          ? src.unitPrice * expectedQty
          : Infinity;
      materials.push({
        itemKey: src.itemKey,
        expectedQty,
        unitPrice: src.unitPrice,
        total,
      });
    }
  } else if (charge > 0) {
    materials.push({
      itemKey,
      expectedQty: copies,
      unitPrice: charge,
      total: baseGold,
    });
  }

  let running = 0;
  for (const s of steps) {
    running += Number.isFinite(s.stepSpend) ? s.stepSpend : 0;
    s.runningTotal = running;
  }
  return copies;
}

/** Expand a plan into UI rows + expected material quantities. */
export function summarizeUpgradePlan(
  plan: UpgradePathPlan,
  prices: PriceTable,
  mode: "upgrade" | "compound",
  opts?: {
    igrade?: number;
    itemKey?: string;
    itemValue?: number;
    /** When true, always insert Acquire even if itemValue is 0. */
    forceAcquire?: boolean;
    /** Gold per copy on Acquire; defaults to itemValue. */
    acquireChargePerCopy?: number;
    /** Per-output craft leaves (Craft acquire shopping list). */
    craftMaterialLines?: MaterialLine[] | null;
    acquireMode?: "buy" | "craft";
  },
): { steps: PlanSummaryStep[]; materials: MaterialLine[]; totalExpectedCost: number } {
  const qty = new Map<string, number>();
  const steps: PlanSummaryStep[] = [];
  let running = 0;
  let stackGold = 0;
  const igrade = opts?.igrade ?? 0;
  const shrineTimes = expectedPlanShrineMs(plan.steps, mode, igrade);

  const acquireLevel = plan.steps[0]?.fromLevel ?? 0;
  const acquireValue =
    opts?.itemKey && opts.itemValue != null && Number.isFinite(opts.itemValue) && opts.itemValue > 0
      ? opts.itemValue
      : 0;
  if (opts?.itemKey && (acquireValue > 0 || opts.forceAcquire)) {
    running = acquireValue;
    if (acquireValue > 0) addQty(qty, opts.itemKey, 1);
    steps.push({
      fromLevel: acquireLevel,
      toLevel: acquireLevel,
      scrollKey: opts.itemKey,
      offeringKey: null,
      primstacking: 0,
      primstackingStatClicks: 0,
      primstackingNormal: 0,
      primstackingStatScrollEach: 0,
      statScrollGrace: 0,
      failstack: 0,
      ograce: 0,
      baseChance: 1,
      chanceCap: 1,
      chance: 1,
      attempts: 1,
      stepSpend: acquireValue,
      runningTotal: running,
      shrineMs: 0,
      kind: "acquire",
    });
  }

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const scrollKey =
      mode === "upgrade"
        ? scrollKeyForUpgrade(step.scrollGrade) ?? `scroll${step.scrollGrade}`
        : scrollKeyForCompound(step.scrollGrade) ?? `cscroll${step.scrollGrade}`;
    const offeringKey = offeringKeyFromGrade(step.offering);
    const attempts = step.chance > 0 ? 1 / step.chance : Infinity;
    const primstacking = step.primstacking ?? 0;
    const primstackingStatClicks = step.primstackingStatClicks ?? 0;
    const primstackingNormal = step.primstackingNormal ?? primstacking;
    const primstackingStatScrollEach = step.primstackingStatScrollEach ?? 0;
    const primlingQty = primstackingStatClicks + primstackingNormal;
    const primingScrollQty = primstackingStatClicks * primstackingStatScrollEach;
    const statScrollGrace = step.statScrollGrace ?? 0;
    const statOfferingKey = offeringKeyFromGrade(step.statScrollOffering ?? null);
    const pscrollQty = step.statScrollQty ?? 0;

    const scrollUnit = unitPrice(prices, scrollKey);
    const offeringUnit = unitPrice(prices, offeringKey);
    const primUnit = unitPrice(prices, "offeringp");
    const matsPerAttempt =
      (Number.isFinite(scrollUnit) ? scrollUnit : 0) +
      (offeringKey && Number.isFinite(offeringUnit) ? offeringUnit : 0);
    const ssUnit = unitPrice(prices, STAT_SCROLL_PROXY_KEY);
    const primstackingCost =
      primlingQty * (Number.isFinite(primUnit) ? primUnit : 0) +
      primingScrollQty * (Number.isFinite(ssUnit) ? ssUnit : 0);
    const ssOfferingUnit = unitPrice(prices, statOfferingKey);
    const ssCost =
      statScrollGrace *
      (pscrollQty * (Number.isFinite(ssUnit) ? ssUnit : 0) +
        (Number.isFinite(ssOfferingUnit) ? ssOfferingUnit : 0));
    const fsCost = step.failstackCost ?? 0;
    const psCost = step.ograceCost ?? 0;

    // Prefer planner EV delta when present (includes destroy risk + stacks).
    const stepSpend = Number.isFinite(step.stepExpectedCost)
      ? step.stepExpectedCost
      : Number.isFinite(attempts)
      ? matsPerAttempt * attempts + primstackingCost + ssCost + fsCost + psCost
      : Infinity;
    running += Number.isFinite(stepSpend) ? stepSpend : 0;
    stackGold += (Number.isFinite(fsCost) ? fsCost : 0) + (Number.isFinite(psCost) ? psCost : 0);

    addQty(qty, scrollKey, attempts);
    if (offeringKey) addQty(qty, offeringKey, attempts);
    if (primlingQty > 0) addQty(qty, "offeringp", primlingQty);
    if (primingScrollQty > 0) addQty(qty, STAT_SCROLL_PROXY_KEY, primingScrollQty);
    if (statScrollGrace > 0) {
      addQty(qty, STAT_SCROLL_PROXY_KEY, statScrollGrace * pscrollQty);
      if (statOfferingKey) addQty(qty, statOfferingKey, statScrollGrace);
    }

    const shrineAt = shrineTimes[i + 1] ?? Infinity;
    const shrinePrev = shrineTimes[i] ?? 0;
    const shrineMs =
      Number.isFinite(shrineAt) && Number.isFinite(shrinePrev) ? shrineAt - shrinePrev : Infinity;

    steps.push({
      fromLevel: step.fromLevel,
      toLevel: step.toLevel,
      scrollKey,
      offeringKey,
      primstacking,
      primstackingStatClicks,
      primstackingNormal,
      primstackingStatScrollEach,
      statScrollGrace,
      failstack: step.failstack ?? 0,
      ograce: step.ograce ?? 0,
      baseChance: step.baseChance,
      chanceCap: step.chanceCap,
      chance: step.chance,
      attempts,
      stepSpend,
      runningTotal: running,
      shrineMs,
    });
  }

  const materials = materialLinesFromQty(qty, prices);
  if (stackGold > 0) {
    materials.push({
      itemKey: "_stacks",
      expectedQty: 1,
      unitPrice: stackGold,
      total: stackGold,
    });
  }

  const planEv = plan.totalExpectedCost;
  if (opts?.itemKey && (acquireValue > 0 || opts.forceAcquire) && Number.isFinite(planEv)) {
    foldExpectedBaseCopies({
      steps,
      materials,
      itemKey: opts.itemKey,
      itemValue: acquireValue > 0 ? acquireValue : opts.itemValue ?? 0,
      planEv,
      acquireChargePerCopy: opts.acquireChargePerCopy,
      craftMaterialLines: opts.craftMaterialLines,
      acquireMode: opts.acquireMode,
    });
  }

  return { steps, materials, totalExpectedCost: planEv };
}

export function summarizeCompoundPlan(
  plan: CompoundPathPlan,
  prices: PriceTable,
  opts?: {
    igrade?: number;
    itemKey?: string;
    itemValue?: number;
    forceAcquire?: boolean;
    acquireChargePerCopy?: number;
    craftMaterialLines?: MaterialLine[] | null;
    acquireMode?: "buy" | "craft";
  },
): { steps: PlanSummaryStep[]; materials: MaterialLine[]; totalExpectedCost: number } {
  const asUpgrade: UpgradePathPlan = {
    steps: plan.path.map((s) => ({
      fromLevel: s.fromLevel,
      toLevel: s.toLevel,
      scrollGrade: s.scrollGrade,
      offering: s.offering,
      primstacking: 0,
      primstackingStatClicks: 0,
      primstackingNormal: 0,
      primstackingStatScrollEach: 0,
      statScrollGrace: 0,
      statScrollOffering: null,
      statScrollQty: 0,
      failstack: 0,
      ograce: s.ograce ?? 0,
      failstackCost: 0,
      ograceCost: s.ograceCost ?? 0,
      chance: s.chance,
      graceAfter: s.graceAfter,
      stepExpectedCost: s.stepExpectedCost,
    })),
    totalExpectedCost: plan.totalExpectedCost,
  };
  return summarizeUpgradePlan(asUpgrade, prices, "compound", opts);
}
