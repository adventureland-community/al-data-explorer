/**
 * Compact upgrade/compound snapshot for item detail at a chosen level.
 * Reuses the calculator planner with default toolkit + vendor/market prices.
 */

import { GItem, ItemKey } from "typed-adventureland";

import { getItemGrade } from "./itemGrade";
import { ChanceTables, getCompoundChance, getUpgradeChance, ItemLookup } from "./upgradeChance";
import {
  formatChancePct,
  formatGold,
  formatShrineTime,
  planCompoundPath,
  planUpgradePathBestOdds,
  PlannerContext,
  summarizeCompoundPlan,
  summarizeUpgradePlan,
  type PlanSummaryStep,
} from "./upgradePath";
import {
  defaultPriceTable,
  marketSellMinPrice,
  PriceTable,
  scrollKeyForCompound,
  scrollKeyForUpgrade,
  seedMissingPrices,
} from "./upgradePrices";
import { GItems } from "./types";

export type ItemUpgradeMode = "upgrade" | "compound";

export type ItemUpgradeStepView = {
  fromLevel: number;
  toLevel: number;
  scrollKey: string;
  offeringKey: string | null;
  chance: number;
  baseChance: number;
  attempts: number;
  stepSpend: number;
};

export type ItemUpgradeBottleneck = {
  fromLevel: number;
  toLevel: number;
  chance: number;
  stepSpend: number;
  share: number;
};

export type ItemUpgradeSnapshot = {
  mode: ItemUpgradeMode;
  targetLevel: number;
  calcHref: string;
  strategyLabel: string;
  lastStep: ItemUpgradeStepView | null;
  /** Matching-scroll chance for (level-1)→level with no offering (game table). */
  inboundBaseChance: number | null;
  planEv: number | null;
  totalAttempts: number | null;
  oneshotPct: number | null;
  bottleneck: ItemUpgradeBottleneck | null;
  shrineTime: string | null;
};

const CALC_MAX: Record<ItemUpgradeMode, number> = {
  upgrade: 12,
  compound: 5,
};

const DEFAULT_TARGET: Record<ItemUpgradeMode, number> = {
  upgrade: 7,
  compound: 3,
};

/** Default toolkit matches Upgrade Calculator URL defaults. */
const DEFAULT_TOOLKIT: NonNullable<PlannerContext["toolkit"]> = {
  allowPrimstacking: true,
  allowScroll4: false,
  allowStatScrollGrace: false,
  offerings: [null, 0, 1, 2],
};

export function itemUpgradeMode(gItem: GItem): ItemUpgradeMode | null {
  if (gItem.upgrade) return "upgrade";
  if (gItem.compound) return "compound";
  return null;
}

/** Deep-link into the Upgrade Calculator for this item / target. */
export function buildUpgradeCalcHref(args: {
  itemKey: string;
  mode: ItemUpgradeMode;
  target: number;
}): string {
  const sp = new URLSearchParams();
  if (args.mode === "compound") sp.set("mode", "compound");
  sp.set("item", args.itemKey);
  const capped = Math.min(Math.max(1, Math.floor(args.target)), CALC_MAX[args.mode]);
  if (capped !== DEFAULT_TARGET[args.mode]) sp.set("target", String(capped));
  const q = sp.toString();
  return q ? `/upgrade?${q}` : "/upgrade";
}

function sumAttempts(steps: PlanSummaryStep[]): number {
  let sum = 0;
  for (const s of steps) {
    if (s.kind === "acquire") continue;
    if (Number.isFinite(s.attempts)) sum += s.attempts;
  }
  return sum;
}

function oneshotPercent(steps: PlanSummaryStep[]): number | null {
  const recipe = steps.filter((s) => s.kind !== "acquire" && s.kind !== "shiny");
  if (!recipe.length) return null;
  let product = 1;
  for (const s of recipe) {
    const p =
      Number.isFinite(s.attempts) && s.attempts > 0
        ? 1 / s.attempts
        : Number.isFinite(s.chance) && s.chance > 0
        ? s.chance
        : 0;
    if (!(p > 0)) return null;
    product *= p;
  }
  return product * 100;
}

function heaviestStep(steps: PlanSummaryStep[]): PlanSummaryStep | null {
  let best: PlanSummaryStep | null = null;
  for (const s of steps) {
    if (s.kind === "acquire") continue;
    if (!Number.isFinite(s.stepSpend)) continue;
    if (!best || s.stepSpend > best.stepSpend) best = s;
  }
  return best;
}

function stepView(s: PlanSummaryStep): ItemUpgradeStepView {
  return {
    fromLevel: s.fromLevel,
    toLevel: s.toLevel,
    scrollKey: s.scrollKey,
    offeringKey: s.offeringKey,
    chance: s.chance,
    baseChance: s.baseChance ?? s.chance,
    attempts: s.attempts,
    stepSpend: s.stepSpend,
  };
}

function inboundBaseChance(args: {
  mode: ItemUpgradeMode;
  itemKey: ItemKey;
  level: number;
  lookup: ItemLookup;
  tables?: ChanceTables;
}): number | null {
  if (args.level < 1) return null;
  const def = args.lookup(args.itemKey);
  if (!def) return null;
  const fromLevel = args.level - 1;
  const grade = getItemGrade(def, fromLevel);
  const scrollGrade = grade;
  const result =
    args.mode === "upgrade"
      ? getUpgradeChance(
          args.lookup,
          { name: args.itemKey, level: fromLevel },
          scrollGrade,
          null,
          args.tables,
        )
      : getCompoundChance(
          args.lookup,
          { name: args.itemKey, level: fromLevel },
          scrollGrade,
          null,
          args.tables,
        );
  return result.chance > 0 ? result.chance : null;
}

function resolvePrices(args: {
  items: GItems;
  itemKey: ItemKey;
  prices?: PriceTable;
  market?: Parameters<typeof marketSellMinPrice>[0];
}): PriceTable {
  if (args.prices) return args.prices;
  const defaults = defaultPriceTable(args.items, args.itemKey);
  return seedMissingPrices({
    prices: defaults,
    keys: [...Object.keys(defaults), args.itemKey],
    items: args.items,
    market: args.market,
  });
}

/**
 * Build a detail-page snapshot for reaching `level` from +0.
 * Uses the fewest-copies (max chance) planner so the detail slider stays snappy;
 * the deep link opens the full calculator (defaults to Cheapest).
 * Returns null when the item isn't upgradable/compoundable or level < 1.
 */
export function buildItemUpgradeSnapshot(args: {
  itemKey: ItemKey;
  gItem: GItem;
  level: number;
  items: GItems;
  tables?: ChanceTables;
  prices?: PriceTable;
  market?: Parameters<typeof marketSellMinPrice>[0];
}): ItemUpgradeSnapshot | null {
  const mode = itemUpgradeMode(args.gItem);
  if (!mode) return null;

  const level = Math.floor(args.level);
  if (!Number.isFinite(level) || level < 1) return null;

  const calcMax = CALC_MAX[mode];
  const targetLevel = Math.min(level, calcMax);
  if (targetLevel < 1) return null;

  const prices = resolvePrices(args);
  const lookup: ItemLookup = (name) => args.items[name];
  const itemValue =
    typeof prices[args.itemKey] === "number" && Number.isFinite(prices[args.itemKey])
      ? prices[args.itemKey]
      : typeof args.gItem.g === "number" && args.gItem.g > 0
      ? args.gItem.g
      : 0;

  const ctx: PlannerContext = {
    lookup,
    prices,
    tables: args.tables,
    toolkit: DEFAULT_TOOLKIT,
  };

  const calcHref = buildUpgradeCalcHref({
    itemKey: args.itemKey,
    mode,
    target: targetLevel,
  });

  const baseInbound = inboundBaseChance({
    mode,
    itemKey: args.itemKey,
    level: targetLevel,
    lookup,
    tables: args.tables,
  });

  let summary: { steps: PlanSummaryStep[]; totalExpectedCost: number } | null = null;

  if (mode === "upgrade") {
    const plan = planUpgradePathBestOdds(ctx, args.itemKey, itemValue, targetLevel, {
      luckySlot: false,
    });
    if (plan) {
      summary = summarizeUpgradePlan(plan, prices, "upgrade", {
        igrade: getItemGrade(args.gItem, 0),
        itemKey: args.itemKey,
        itemValue,
        forceAcquire: itemValue > 0,
        acquireChargePerCopy: itemValue,
        acquireMode: "buy",
      });
    }
  } else {
    const plan = planCompoundPath(ctx, args.itemKey, itemValue, targetLevel, "bestOdds");
    if (plan) {
      summary = summarizeCompoundPlan(plan, prices, {
        igrade: getItemGrade(args.gItem, 0),
        itemKey: args.itemKey,
        itemValue,
        forceAcquire: itemValue > 0,
        acquireChargePerCopy: itemValue,
        acquireMode: "buy",
      });
    }
  }

  if (!summary) {
    // Still useful: table chance + deep link when planning fails (missing prices, etc.).
    const grade = getItemGrade(args.gItem, targetLevel - 1);
    const scrollKey =
      mode === "upgrade"
        ? scrollKeyForUpgrade(grade) ?? `scroll${grade}`
        : scrollKeyForCompound(grade) ?? `cscroll${grade}`;
    return {
      mode,
      targetLevel,
      calcHref,
      strategyLabel: "Fewest copies",
      lastStep:
        baseInbound != null
          ? {
              fromLevel: targetLevel - 1,
              toLevel: targetLevel,
              scrollKey,
              offeringKey: null,
              chance: baseInbound,
              baseChance: baseInbound,
              attempts: baseInbound > 0 ? 1 / baseInbound : Infinity,
              stepSpend: Infinity,
            }
          : null,
      inboundBaseChance: baseInbound,
      planEv: null,
      totalAttempts: null,
      oneshotPct: null,
      bottleneck: null,
      shrineTime: null,
    };
  }

  const recipe = summary.steps.filter((s) => s.kind !== "acquire" && s.kind !== "shiny");
  const last = recipe.length ? recipe[recipe.length - 1] : null;
  const attempts = sumAttempts(summary.steps);
  const oneshot = oneshotPercent(summary.steps);
  const heavy = heaviestStep(summary.steps);
  const planEv = summary.totalExpectedCost;
  const bottleneck =
    heavy && planEv > 0 && Number.isFinite(heavy.stepSpend)
      ? {
          fromLevel: heavy.fromLevel,
          toLevel: heavy.toLevel,
          chance: heavy.chance,
          stepSpend: heavy.stepSpend,
          share: heavy.stepSpend / planEv,
        }
      : null;

  // Summary rows already carry expected shrine wait per step (Mass Production++).
  let shrineFromSteps = 0;
  let hasShrine = false;
  for (const s of summary.steps) {
    if (s.kind === "acquire") continue;
    if (typeof s.shrineMs === "number" && Number.isFinite(s.shrineMs)) {
      shrineFromSteps += s.shrineMs;
      hasShrine = true;
    }
  }

  return {
    mode,
    targetLevel,
    calcHref,
    strategyLabel: "Fewest copies",
    lastStep: last ? stepView(last) : null,
    inboundBaseChance: baseInbound,
    planEv: Number.isFinite(planEv) ? planEv : null,
    totalAttempts: Number.isFinite(attempts) ? attempts : null,
    oneshotPct: oneshot,
    bottleneck: bottleneck && bottleneck.share >= 0.4 ? bottleneck : null,
    shrineTime: hasShrine ? formatShrineTime(shrineFromSteps) : null,
  };
}

/** Format helpers for the detail card (avoid pulling the full calculators barrel). */
export { formatChancePct, formatGold };
