/**
 * Upgrade/compound path planner.
 *
 * Cheapest = Kora Dereva pastebin-style level-by-level Pareto search (primstacking,
 * failstack, ograce bank, scroll4 survival, stat-scroll grace prep;
 * https://pastebin.com/jBMKeLfd, CALC_VERSION 8).
 * Fewest Copies = per-level max chance over the scroll/offering/primling toolkit
 * only (zero stacks).
 */

import { GItem, ItemKey } from "typed-adventureland";

import { getItemGrade } from "./itemGrade";
import { itemAcceptsStatScroll } from "./statScroll";
import {
  applyLuckySlotChance,
  ChanceTables,
  getCompoundChance,
  getUpgradeChance,
  ItemLookup,
  OfferingChoice,
  OFFERING_GRADES,
  UPGRADE_BASE_CHANCES,
} from "./upgradeChance";
import {
  COMPOUND_SCROLL_KEYS,
  offeringKeyFromGrade,
  PriceTable,
  primstackingSpend,
  PrimstackingSpend,
  pscrollQtyForGrade,
  scrollKeyForUpgrade,
  STAT_SCROLL_PROXY_KEY,
  statScrollGraceUnitCost,
  unitPrice,
} from "./upgradePrices";
import {
  buildStackTables,
  failstackUnitCost,
  HELMET_BASE_COST_FALLBACK,
  HELMET_GRADES,
  MAX_FAILSTACK,
  MAX_OGRACE_STEPS,
  primlingUnitCost,
  ograceUnitCost,
  StackTables,
} from "./upgradeStacks";

export type UpgradeStepStrategy = "bestOdds" | "balanced" | "costOptimal";

export const BALANCED_NEAR_BEST_EV_FRAC_UPGRADE = 0.05;
export const BALANCED_NEAR_BEST_EV_FRAC_COMPOUND = 0.2;

export type ToolkitOptions = {
  allowPrimstacking?: boolean;
  /** When true, Cheapest/Fewest may use scroll4 (item survives failure). */
  allowScroll4?: boolean;
  /**
   * When true (and the item has a `stat` pool), Cheapest/Fewest may apply a
   * property scroll with an offering for +1 item grace (server pscroll path).
   */
  allowStatScrollGrace?: boolean;
  /** null = no offering; 0/1/2 = offeringp / offering / offeringx */
  offerings?: OfferingChoice[];
};

export type PlannerContext = {
  lookup: ItemLookup;
  prices: PriceTable;
  tables?: ChanceTables;
  toolkit?: ToolkitOptions;
  /** Include server ugrace from failstack in Cheapest chance math. */
  useServerUgrace?: boolean;
};

export type UpgradePathStep = {
  fromLevel: number;
  toLevel: number;
  scrollGrade: number;
  offering: OfferingChoice;
  /** Primstacking count: Primlings on this item (+0.5 `item.grace` each). */
  primstacking: number;
  /** When Cheapest folds property scrolls into primstacking (2 Primlings ↔ 1 Primling + pscrolls). */
  primstackingStatClicks: number;
  primstackingNormal: number;
  /** Property scrolls per folded primstacking click (0 when unused). */
  primstackingStatScrollEach: number;
  /** Property-scroll+offering applications (+1 grace each). */
  statScrollGrace: number;
  /** Offering grade used with each pscroll grace app (null if unused). */
  statScrollOffering: OfferingChoice;
  /** Pscroll qty per grace application (server `needed[itemGrade]`). */
  statScrollQty: number;
  /** Failstack size → personal `ugrace` in chance math. */
  failstack: number;
  /**
   * Target `player.p.ograce` bank steps (×0.6 grace in chance math). UI: Ograce.
   */
  ograce: number;
  failstackCost: number;
  ograceCost: number;
  /** Raw table chance for this level (no scroll/offering/stack buffs). */
  baseChance?: number;
  /** Cap after high scroll/offering (game-visible; not lucky-adjusted). */
  chanceCap?: number;
  /**
   * Game-visible success chance (matches the in-game upgrade UI).
   * Lucky Slot does not change this — it only affects `successRate` / EV.
   */
  chance: number;
  /**
   * Expected success rate for EV and attempts. When Lucky Slot is on, this is
   * the 60/40 blend; otherwise equals `chance`.
   */
  successRate?: number;
  graceAfter: number;
  stepExpectedCost: number;
};

export type UpgradePathPlan = {
  steps: UpgradePathStep[];
  totalExpectedCost: number;
};

export type CompoundPathStep = {
  fromLevel: number;
  toLevel: number;
  scrollGrade: number;
  offering: OfferingChoice;
  ograce: number;
  ograceCost: number;
  chance: number;
  graceAfter: number;
  stepExpectedCost: number;
};

export type CompoundPathPlan = {
  path: CompoundPathStep[];
  totalExpectedCost: number;
};

type ParetoState = {
  item_grace: number;
  cost: number;
  parent?: ParetoState | null;
  primstacking?: number;
  primstackingCost?: number;
  primstackingStatClicks?: number;
  primstackingNormal?: number;
  primstackingStatScrollEach?: number;
  statScrollGrace?: number;
  statScrollOffering?: OfferingChoice;
  /** Pscroll qty per grace app at this level (server needed[itemGrade]). */
  statScrollQty?: number;
  scroll_grade?: number;
  offering?: OfferingChoice;
  failstack?: number;
  ograce?: number;
  chance?: number;
  chance_cap?: number;
  graceAfter?: number;
  failstackCost?: number;
  ograceCost?: number;
  level_to?: number;
};

function emptyPrimstackingSpend(units: number, primlingUnit: number): PrimstackingSpend {
  return {
    statClicks: 0,
    normalPrimes: units,
    statScrollEach: 0,
    cost: units ? (Number.isFinite(primlingUnit) ? units * primlingUnit : Infinity) : 0,
  };
}

function offeringChoices(toolkit?: ToolkitOptions): OfferingChoice[] {
  if (toolkit?.offerings) return toolkit.offerings;
  return [...OFFERING_GRADES];
}

/**
 * Toolkit ceiling for Fewest Copies: grade, or grade+1 — but never open scroll3+
 * until the item is grade ≥ 3. When `allowScroll4`, open through scroll4.
 */
export function maxToolkitScrollGrade(grade: number, allowScroll4 = false): number {
  if (allowScroll4) return 4;
  const capped = Math.min(grade + 1, 4);
  if (grade < 3 && capped >= 3) return grade;
  return capped;
}

function offeringCost(prices: PriceTable, offering: OfferingChoice): number {
  return unitPrice(prices, offeringKeyFromGrade(offering));
}

function primlingUnitCostFromPrices(prices: PriceTable): number {
  return unitPrice(prices, "offeringp");
}

/** Cheapest non-null offering from the toolkit (needed for pscroll +1 grace). */
function cheapestOfferingForGrace(
  prices: PriceTable,
  toolkit?: ToolkitOptions,
): { offering: Exclude<OfferingChoice, null>; unit: number } | null {
  let best: { offering: Exclude<OfferingChoice, null>; unit: number } | null = null;
  for (const offering of offeringChoices(toolkit)) {
    if (offering == null) continue;
    const unit = offeringCost(prices, offering);
    if (!Number.isFinite(unit)) continue;
    if (!best || unit < best.unit) best = { offering, unit };
  }
  return best;
}

function itemIgraceFromDef(def: GItem): number {
  const { igrace } = def as GItem & { igrace?: number };
  if (igrace != null) return igrace;
  const zero = getItemGrade(def, 0);
  if (!zero) return 1;
  if (zero === 1) return -1;
  if (zero === 2) return -2;
  return 0;
}

function pruner() {
  const bestByGrace = new Map<number, ParetoState>();
  function getSet(itemGrace: number, cost: number, getVal: () => ParetoState): ParetoState {
    const grace10 = Math.round(itemGrace * 10);
    const old = bestByGrace.get(grace10);
    if (!old || cost < old.cost) {
      const val = getVal();
      bestByGrace.set(grace10, val);
      return val;
    }
    return old;
  }
  function pareto(): ParetoState[] {
    const current = [...bestByGrace.values()];
    current.sort((a, b) => b.item_grace - a.item_grace);
    let bestCost = Infinity;
    const frontier: ParetoState[] = [];
    for (const state of current) {
      if (state.cost < bestCost) {
        frontier.push(state);
        bestCost = state.cost;
      }
    }
    return frontier;
  }
  return { getSet, pareto };
}

function calculateUpgradeStepCost(args: {
  parentCost: number;
  /** Priming + optional pscroll-grace prep gold (pastebin primstackingCost + ss). */
  prepCost: number;
  scrollCost: number;
  offeringCost: number;
  failstackCost: number;
  ograceCost: number;
  scrollGrade: number;
  chance: number;
}): { cost: number; fixedCost: number; attemptCost: number } {
  const baseCost = args.parentCost + args.prepCost;
  let attemptCost = 0;
  let fixedCost = 0;
  if (args.scrollGrade === 4) {
    // scroll4: item survives failure
    attemptCost = args.scrollCost + args.offeringCost;
    fixedCost = baseCost + args.failstackCost + args.ograceCost;
  } else {
    attemptCost = baseCost + args.scrollCost + args.offeringCost;
    fixedCost = args.failstackCost + args.ograceCost;
  }
  const cost = fixedCost + attemptCost / args.chance;
  return { cost, fixedCost, attemptCost };
}

function maxScrollForCheapest(grade: number, allowScroll4: boolean): number {
  const cap = allowScroll4 ? 4 : 3;
  return Math.min(Math.max(grade, cap), 4);
}

/**
 * Pastebin-style Cheapest search for one item to targetLevel.
 * When `asHelmetRefine` is set, skips stack farm (uses provided tables) and
 * returns cumulative costs per level for stack refine.
 */
function upgradeCalcPareto(
  ctx: PlannerContext,
  itemName: ItemKey,
  itemValue: number,
  targetLevel: number,
  options: {
    luckySlot?: boolean;
    startGrace?: number;
    stacks: StackTables;
    allowFailstack?: boolean;
    allowOgrace?: boolean;
  },
): ParetoState[] | null {
  const def = ctx.lookup(itemName);
  if (!def) return null;

  const grades = ((def.grades as number[] | undefined) ?? [9, 10, 11, 12]) as number[];
  const maxLevel = grades[3] ?? 12;
  const target = Math.min(targetLevel, maxLevel);
  const itemGraceCap = target + 1;
  const startGrace = options.startGrace ?? itemIgraceFromDef(def);
  const offerings = offeringChoices(ctx.toolkit);
  const allowPrims = ctx.toolkit?.allowPrimstacking !== false;
  const allowScroll4 = ctx.toolkit?.allowScroll4 === true;
  const allowFailstack = options.allowFailstack !== false;
  const allowOgrace = options.allowOgrace !== false;
  const primlingUnit = primlingUnitCost(ctx.prices);
  const canStatPrime = itemAcceptsStatScroll(def);
  const dexScrollUnit = unitPrice(ctx.prices, STAT_SCROLL_PROXY_KEY);
  const graceOffering =
    ctx.toolkit?.allowStatScrollGrace && canStatPrime
      ? cheapestOfferingForGrace(ctx.prices, ctx.toolkit)
      : null;
  const maxOgraceIdx = allowOgrace
    ? Math.min(MAX_OGRACE_STEPS, options.stacks.ograce.length - 1)
    : 0;
  const maxFail = allowFailstack ? MAX_FAILSTACK : 0;

  let last: ParetoState[] = [{ item_grace: startGrace, cost: itemValue, parent: null }];

  for (let levelTo = 1; levelTo <= target; levelTo++) {
    const fromLevel = levelTo - 1;
    const itemGrade = getItemGrade(def, fromLevel);
    const statScrollQty = pscrollQtyForGrade(itemGrade);
    const graceUnit = graceOffering
      ? statScrollGraceUnitCost(ctx.prices, itemGrade, graceOffering.unit)
      : Infinity;
    const p1 = pruner();

    for (const parent of last) {
      const room = Math.max(0, itemGraceCap - parent.item_grace);
      const maxPriming = allowPrims ? Math.max(0, Math.ceil(2 * room - 1e-9)) : 0;
      const maxStatScroll =
        graceOffering && Number.isFinite(graceUnit) ? Math.max(0, Math.ceil(room - 1e-9)) : 0;
      for (let primstacking = 0; primstacking <= maxPriming; primstacking++) {
        const spend = canStatPrime
          ? primstackingSpend({
              units: primstacking,
              itemGrade,
              primlingUnit,
              statScrollUnit: dexScrollUnit,
              canStat: true,
            })
          : emptyPrimstackingSpend(primstacking, primlingUnit);
        for (let statScrollGrace = 0; statScrollGrace <= maxStatScroll; statScrollGrace++) {
          const itemGrace = Math.min(
            itemGraceCap,
            parent.item_grace + primstacking * 0.5 + statScrollGrace,
          );
          // Avoid 0 * Infinity → NaN when the technique is off.
          const ssPrep = statScrollGrace > 0 ? statScrollGrace * graceUnit : 0;
          const primstackingCost = spend.cost + ssPrep;
          const cost = parent.cost + primstackingCost;
          if (!Number.isFinite(cost)) continue;
          p1.getSet(itemGrace, cost, () => ({
            parent,
            primstacking,
            primstackingCost,
            primstackingStatClicks: spend.statClicks,
            primstackingNormal: spend.normalPrimes,
            primstackingStatScrollEach: spend.statScrollEach,
            statScrollGrace,
            statScrollOffering: statScrollGrace > 0 ? graceOffering!.offering : null,
            statScrollQty: statScrollGrace > 0 ? statScrollQty : 0,
            cost,
            item_grace: itemGrace,
          }));
        }
      }
    }
    const primedStates = p1.pareto();
    const p2 = pruner();
    const maxScroll = maxScrollForCheapest(itemGrade, allowScroll4);

    for (const primed of primedStates) {
      const parent = primed.parent ?? primed;
      const primstacking = primed.primstacking ?? 0;
      const primstackingCost = primed.primstackingCost ?? 0;
      const statScrollGrace = primed.statScrollGrace ?? 0;
      const itemGrace = primed.item_grace;

      for (let scrollGrade = itemGrade; scrollGrade <= maxScroll; scrollGrade++) {
        const scrollKey = scrollKeyForUpgrade(scrollGrade);
        if (!scrollKey) continue;
        const sCost = unitPrice(ctx.prices, scrollKey);
        if (!Number.isFinite(sCost)) continue;

        for (const offering of offerings) {
          const oCost = offeringCost(ctx.prices, offering);
          if (!Number.isFinite(oCost)) continue;

          for (let failstack = 0; failstack <= maxFail; failstack++) {
            const fsCost = failstackUnitCost(options.stacks, levelTo, failstack);
            if (!Number.isFinite(fsCost)) break;

            for (let ograce = 0; ograce <= maxOgraceIdx; ograce++) {
              const psCost = ograceUnitCost(options.stacks, ograce);
              if (!Number.isFinite(psCost)) break;

              const item = { name: itemName, level: fromLevel, grace: itemGrace };
              const raw = getUpgradeChance(ctx.lookup, item, scrollGrade, offering, ctx.tables, {
                failstack,
                ograce,
                useServerUgrace: ctx.useServerUgrace,
              });
              if (!raw.chance) continue;

              // Store game-visible chance; Lucky Slot only changes EV success rate.
              const { chance } = raw;
              const { chanceCap } = raw;
              const successRate = options.luckySlot ? applyLuckySlotChance(chance) : chance;
              if (!(successRate > 0)) continue;

              const { cost, fixedCost, attemptCost } = calculateUpgradeStepCost({
                parentCost: parent.cost,
                prepCost: primstackingCost,
                scrollCost: sCost,
                offeringCost: oCost,
                failstackCost: fsCost,
                ograceCost: psCost,
                scrollGrade,
                chance: successRate,
              });

              const graceAfter = Math.min(raw.graceAfter, itemGraceCap);
              const best = p2.getSet(graceAfter, cost, () => ({
                parent,
                primstacking,
                primstackingCost,
                primstackingStatClicks: primed.primstackingStatClicks ?? 0,
                primstackingNormal: primed.primstackingNormal ?? primstacking,
                primstackingStatScrollEach: primed.primstackingStatScrollEach ?? 0,
                statScrollGrace,
                statScrollOffering: primed.statScrollOffering ?? null,
                statScrollQty: primed.statScrollQty ?? 0,
                scroll_grade: scrollGrade,
                offering,
                failstack,
                ograce,
                chance,
                chance_cap: chanceCap,
                graceAfter,
                failstackCost: fsCost,
                ograceCost: psCost,
                level_to: levelTo,
                item_grace: graceAfter,
                cost,
              }));

              const successCap = options.luckySlot ? applyLuckySlotChance(chanceCap) : chanceCap;
              const lowerBound = fixedCost + attemptCost / successCap;
              if (lowerBound >= best.cost) break;
              if (chance >= chanceCap) break;
            }
          }
        }
      }
    }

    last = p2.pareto();
    if (!last.length) return null;
  }

  last.sort((a, b) => a.cost - b.cost);
  return last;
}

function reconstructUpgradePlan(
  best: ParetoState,
  itemValue: number,
  options: { luckySlot?: boolean } = {},
): UpgradePathPlan {
  const chain: ParetoState[] = [];
  let current: ParetoState | null | undefined = best;
  while (current) {
    if (current.scroll_grade != null) chain.push(current);
    current = current.parent;
  }
  chain.reverse();

  const steps: UpgradePathStep[] = [];
  let prevCost = itemValue;

  for (const node of chain) {
    const fromLevel = (node.level_to ?? 1) - 1;
    const primstacking = node.primstacking ?? 0;
    const statScrollGrace = node.statScrollGrace ?? 0;
    const chance = node.chance ?? 0;
    const successRate = options.luckySlot ? applyLuckySlotChance(chance) : chance;
    steps.push({
      fromLevel,
      toLevel: fromLevel + 1,
      scrollGrade: node.scroll_grade ?? 0,
      offering: node.offering ?? null,
      primstacking,
      primstackingStatClicks: node.primstackingStatClicks ?? 0,
      primstackingNormal: node.primstackingNormal ?? primstacking,
      primstackingStatScrollEach: node.primstackingStatScrollEach ?? 0,
      statScrollGrace,
      statScrollOffering: statScrollGrace > 0 ? node.statScrollOffering ?? null : null,
      statScrollQty: node.statScrollQty ?? 0,
      failstack: node.failstack ?? 0,
      ograce: node.ograce ?? 0,
      failstackCost: node.failstackCost ?? 0,
      ograceCost: node.ograceCost ?? 0,
      chanceCap: node.chance_cap,
      chance,
      successRate,
      graceAfter: node.graceAfter ?? node.item_grace,
      stepExpectedCost: node.cost - prevCost,
    });
    prevCost = node.cost;
  }

  return { steps, totalExpectedCost: best.cost };
}

function cumulativeCostsFromFrontier(best: ParetoState, itemValue: number): number[] {
  const abs: number[] = [itemValue];
  const chain: ParetoState[] = [];
  let cur: ParetoState | null | undefined = best;
  while (cur) {
    if (cur.scroll_grade != null) chain.push(cur);
    cur = cur.parent;
  }
  chain.reverse();
  for (const node of chain) {
    abs[node.level_to ?? abs.length] = node.cost;
  }
  return abs;
}

/** Prices that feed helmet-proxy stack farm costs (not item-local prices like strscroll). */
const STACK_PRICE_KEYS = [
  "helmet",
  "scroll0",
  "scroll1",
  "scroll2",
  "scroll3",
  "scroll4",
  "offeringp",
  "offering",
  "offeringx",
] as const;

type StacksCacheEntry = {
  priceKey: string;
  tables: ChanceTables | undefined;
  stacks: StackTables;
};

let stacksCache: StacksCacheEntry | null = null;

function stacksPriceKey(prices: PriceTable): string {
  return STACK_PRICE_KEYS.map((k) => String(prices[k] ?? "")).join("\0");
}

/** Drop memoized stack tables (tests / price-table rebuilds). */
export function clearUpgradeStacksCache(): void {
  stacksCache = null;
}

/**
 * Helmet-proxy failstack/ograce tables for Cheapest planning.
 * Memoized on stack-relevant prices + chance-table identity.
 */
export function computeUpgradeStacks(ctx: PlannerContext): StackTables {
  const priceKey = stacksPriceKey(ctx.prices);
  if (stacksCache && stacksCache.priceKey === priceKey && stacksCache.tables === ctx.tables) {
    return stacksCache.stacks;
  }

  // Seed tables, then refine lucky_cost via a helmet Pareto pass (pastebin stacks_calculate).
  const seed = buildStackTables(ctx.prices, ctx.tables);
  const helmetCtx: PlannerContext = {
    ...ctx,
    lookup: (name) => {
      if (name === "helmet") {
        return {
          upgrade: true,
          g: HELMET_BASE_COST_FALLBACK,
          grades: [...HELMET_GRADES],
          igrace: 1,
        } as unknown as GItem;
      }
      return ctx.lookup(name);
    },
    useServerUgrace: false,
    toolkit: {
      allowPrimstacking: true,
      allowScroll4: true,
      offerings: [...OFFERING_GRADES],
    },
  };
  const helmetPrice = unitPrice(ctx.prices, "helmet");
  const helmetValue =
    Number.isFinite(helmetPrice) && helmetPrice > 0 ? helmetPrice : HELMET_BASE_COST_FALLBACK;

  const helmetFrontier = upgradeCalcPareto(
    helmetCtx,
    "helmet" as ItemKey,
    helmetValue,
    HELMET_GRADES[3],
    {
      luckySlot: true,
      stacks: seed,
      allowFailstack: true,
      allowOgrace: true,
    },
  );

  const stacks = !helmetFrontier?.length
    ? seed
    : buildStackTables(
        ctx.prices,
        ctx.tables,
        cumulativeCostsFromFrontier(helmetFrontier[0], helmetValue),
      );
  stacksCache = { priceKey, tables: ctx.tables, stacks };
  return stacks;
}

function computeStacksForPlanner(ctx: PlannerContext): StackTables {
  return computeUpgradeStacks(ctx);
}

const MAX_ITEM_GRACE = 13;
const PRIMSTACK_GRACE = 0.5;

type ScoredUpgradeRoute = {
  scrollGrade: number;
  offering: OfferingChoice;
  primstacking: number;
  primstackingStatClicks: number;
  primstackingNormal: number;
  primstackingStatScrollEach: number;
  statScrollGrace: number;
  statScrollOffering: OfferingChoice;
  chance: number;
  luckyChance: number;
  materialCost: number;
  expectedCost: number;
};

function expectedUpgradeCost(
  materialCost: number,
  itemValue: number,
  chance: number,
  scrollGrade?: number,
): number {
  // scroll4: item survives failure — no destroy term.
  if (scrollGrade === 4) return materialCost / chance;
  return (materialCost + itemValue * (1 - chance)) / chance;
}

function enumerateUpgradeRoutes(
  ctx: PlannerContext,
  itemName: ItemKey,
  currentLevel: number,
  currentGrace: number,
  itemValue: number,
  options: { luckySlot?: boolean } = {},
): ScoredUpgradeRoute[] {
  const def = ctx.lookup(itemName);
  if (!def) return [];

  const grade = getItemGrade(def, currentLevel);
  const allowPrims = ctx.toolkit?.allowPrimstacking !== false;
  const room = Math.max(0, MAX_ITEM_GRACE - currentGrace);
  const maxPrimstacking = allowPrims ? Math.max(0, Math.ceil(room / PRIMSTACK_GRACE)) : 0;
  const canStatPrime = itemAcceptsStatScroll(def);
  const primlingUnit = primlingUnitCostFromPrices(ctx.prices);
  const dexScrollUnit = unitPrice(ctx.prices, STAT_SCROLL_PROXY_KEY);
  const graceOffering =
    ctx.toolkit?.allowStatScrollGrace && canStatPrime
      ? cheapestOfferingForGrace(ctx.prices, ctx.toolkit)
      : null;
  const graceUnit = graceOffering
    ? statScrollGraceUnitCost(ctx.prices, grade, graceOffering.unit)
    : Infinity;
  const maxStatScroll =
    graceOffering && Number.isFinite(graceUnit) ? Math.max(0, Math.ceil(room)) : 0;
  const offerings = offeringChoices(ctx.toolkit);
  const routes: ScoredUpgradeRoute[] = [];

  for (let primstacking = 0; primstacking <= maxPrimstacking; primstacking++) {
    const spend = canStatPrime
      ? primstackingSpend({
          units: primstacking,
          itemGrade: grade,
          primlingUnit,
          statScrollUnit: dexScrollUnit,
          canStat: true,
        })
      : emptyPrimstackingSpend(primstacking, primlingUnit);
    for (let statScrollGrace = 0; statScrollGrace <= maxStatScroll; statScrollGrace++) {
      const grace = Math.min(
        MAX_ITEM_GRACE,
        currentGrace + primstacking * PRIMSTACK_GRACE + statScrollGrace,
      );
      const item = { name: itemName, level: currentLevel, grace };
      const maxScrollGrade = maxToolkitScrollGrade(grade, ctx.toolkit?.allowScroll4 === true);

      for (let scrollGrade = grade; scrollGrade <= maxScrollGrade; scrollGrade++) {
        for (const offering of offerings) {
          // Fewest Copies: zero failstack / primstacking
          const { chance } = getUpgradeChance(ctx.lookup, item, scrollGrade, offering, ctx.tables);
          if (!chance) continue;

          const scrollKey = scrollKeyForUpgrade(scrollGrade);
          if (!scrollKey) continue;

          const sCost = unitPrice(ctx.prices, scrollKey);
          const oCost = offeringCost(ctx.prices, offering);
          const pCost = spend.cost;
          const ssCost =
            statScrollGrace > 0 && Number.isFinite(graceUnit) ? statScrollGrace * graceUnit : 0;
          if (
            !Number.isFinite(sCost) ||
            !Number.isFinite(oCost) ||
            !Number.isFinite(pCost) ||
            !Number.isFinite(ssCost)
          ) {
            continue;
          }

          const materialCost = sCost + oCost + pCost + ssCost;
          const luckyChance = options.luckySlot ? applyLuckySlotChance(chance) : chance;
          routes.push({
            scrollGrade,
            offering,
            primstacking,
            primstackingStatClicks: spend.statClicks,
            primstackingNormal: spend.normalPrimes,
            primstackingStatScrollEach: spend.statScrollEach,
            statScrollGrace,
            statScrollOffering: statScrollGrace > 0 ? graceOffering!.offering : null,
            chance,
            luckyChance,
            materialCost,
            expectedCost: expectedUpgradeCost(materialCost, itemValue, luckyChance, scrollGrade),
          });
        }
      }
    }
  }

  return routes;
}

export function recommendUpgradeStepMaxChance(
  ctx: PlannerContext,
  itemName: ItemKey,
  currentLevel: number,
  currentGrace = 0,
  itemValue = 0,
  options: { luckySlot?: boolean } = {},
): ScoredUpgradeRoute | null {
  const routes = enumerateUpgradeRoutes(
    ctx,
    itemName,
    currentLevel,
    currentGrace,
    itemValue,
    options,
  );
  let best: ScoredUpgradeRoute | null = null;
  for (const route of routes) {
    if (!best) {
      best = route;
      continue;
    }
    if (route.luckyChance > best.luckyChance + 0.0001) {
      best = route;
      continue;
    }
    if (
      Math.abs(route.luckyChance - best.luckyChance) <= 0.0001 &&
      route.materialCost < best.materialCost
    ) {
      best = route;
    }
  }
  return best;
}

/** Fewest-copies / max-chance path: chain bestOdds steps from start to target. */
export function planUpgradePathBestOdds(
  ctx: PlannerContext,
  itemName: ItemKey,
  itemValue: number,
  targetLevel: number,
  options: { luckySlot?: boolean; startLevel?: number; startGrace?: number } = {},
): UpgradePathPlan | null {
  const def0 = ctx.lookup(itemName);
  if (!def0) return null;
  const startLevel = options.startLevel ?? 0;
  const steps: UpgradePathStep[] = [];
  // Mid-path (+from): unknown banked grace on a bought/found copy → start at 0.
  // +0 starts: match Cheapest / pastebin seed (intrinsic igrace on the item state).
  let grace = options.startGrace ?? (startLevel > 0 ? 0 : itemIgraceFromDef(def0));
  // Asset EV of the current item (includes base). Step spend is the incremental EV.
  let curValue = itemValue;

  for (let lvl = startLevel; lvl < targetLevel; lvl++) {
    const rec = recommendUpgradeStepMaxChance(ctx, itemName, lvl, grace, curValue, options);
    if (!rec) return steps.length ? { steps, totalExpectedCost: curValue } : null;

    const item = {
      name: itemName,
      level: lvl,
      grace: Math.min(
        MAX_ITEM_GRACE,
        grace + rec.primstacking * PRIMSTACK_GRACE + rec.statScrollGrace,
      ),
    };
    const { chance, graceAfter, chanceCap } = getUpgradeChance(
      ctx.lookup,
      item,
      rec.scrollGrade,
      rec.offering,
      ctx.tables,
    );
    const successRate = options.luckySlot ? applyLuckySlotChance(chance) : chance;
    const stepEv = expectedUpgradeCost(rec.materialCost, curValue, successRate, rec.scrollGrade);
    curValue += stepEv;
    grace = graceAfter;
    const def = ctx.lookup(itemName);
    const itemGrade = def ? getItemGrade(def, lvl) : 0;
    steps.push({
      fromLevel: lvl,
      toLevel: lvl + 1,
      scrollGrade: rec.scrollGrade,
      offering: rec.offering,
      primstacking: rec.primstacking,
      primstackingStatClicks: rec.primstackingStatClicks,
      primstackingNormal: rec.primstackingNormal,
      primstackingStatScrollEach: rec.primstackingStatScrollEach,
      statScrollGrace: rec.statScrollGrace,
      statScrollOffering: rec.statScrollOffering,
      statScrollQty: rec.statScrollGrace > 0 ? pscrollQtyForGrade(itemGrade) : 0,
      failstack: 0,
      ograce: 0,
      failstackCost: 0,
      ograceCost: 0,
      chanceCap,
      chance,
      successRate,
      graceAfter,
      stepExpectedCost: stepEv,
    });
  }

  return { steps, totalExpectedCost: curValue };
}

/** Manual recipe knobs for one upgrade step (planner defaults + user overrides). */
export type UpgradeStepOverride = {
  scrollGrade?: number;
  offering?: OfferingChoice;
  primstacking?: number;
  statScrollGrace?: number;
  failstack?: number;
  ograce?: number;
};

export function upgradeStepOverrideKey(fromLevel: number, toLevel: number): string {
  return `${fromLevel}-${toLevel}`;
}

/** Apply sparse per-step overrides onto a planner path (recipe fields only). */
export function mergeUpgradeStepOverrides(
  steps: UpgradePathStep[],
  overrides: Record<string, UpgradeStepOverride>,
): UpgradePathStep[] {
  if (!Object.keys(overrides).length) return steps;
  return steps.map((s) => {
    const o = overrides[upgradeStepOverrideKey(s.fromLevel, s.toLevel)];
    if (!o) return s;
    const primstacking = o.primstacking ?? s.primstacking;
    return {
      ...s,
      scrollGrade: o.scrollGrade ?? s.scrollGrade,
      offering: o.offering !== undefined ? o.offering : s.offering,
      primstacking,
      statScrollGrace: o.statScrollGrace ?? s.statScrollGrace,
      failstack: o.failstack ?? s.failstack,
      ograce: o.ograce ?? s.ograce,
    };
  });
}

/**
 * Recompute chance / grace / step EV from recipe choices (after overrides).
 * Walks forward so grace and destroy-value cascade to later steps.
 */
export function recomputeUpgradePlan(args: {
  ctx: PlannerContext;
  itemName: ItemKey;
  itemValue: number;
  steps: UpgradePathStep[];
  /** Cheapest uses stack farm costs + parent EV; fewest uses material+destroy EV. */
  costModel: "cheapest" | "fewest";
  luckySlot?: boolean;
  startGrace?: number;
  /** Precomputed stack tables; skips helmet Pareto when set. */
  stacks?: StackTables;
}): UpgradePathPlan | null {
  const { ctx, itemName, itemValue, costModel } = args;
  const def = ctx.lookup(itemName);
  if (!def || !args.steps.length) return null;

  const stacks = costModel === "cheapest" ? args.stacks ?? computeStacksForPlanner(ctx) : null;
  const allowPrims = ctx.toolkit?.allowPrimstacking !== false;
  const primlingUnit =
    costModel === "fewest" ? primlingUnitCostFromPrices(ctx.prices) : primlingUnitCost(ctx.prices);
  const canStatPrime = itemAcceptsStatScroll(def);
  const dexScrollUnit = unitPrice(ctx.prices, STAT_SCROLL_PROXY_KEY);
  const graceOffering =
    ctx.toolkit?.allowStatScrollGrace && canStatPrime
      ? cheapestOfferingForGrace(ctx.prices, ctx.toolkit)
      : null;

  let grace = args.startGrace ?? itemIgraceFromDef(def);
  let parentCost = itemValue;
  let curValue = itemValue;
  const out: UpgradePathStep[] = [];

  for (const recipe of args.steps) {
    const { fromLevel } = recipe;
    const itemGrade = getItemGrade(def, fromLevel);
    const allowScroll4 = ctx.toolkit?.allowScroll4 === true;
    const maxScroll =
      costModel === "cheapest"
        ? maxScrollForCheapest(itemGrade, allowScroll4)
        : maxToolkitScrollGrade(itemGrade, allowScroll4);
    const scrollGrade = Math.min(Math.max(itemGrade, recipe.scrollGrade), maxScroll);
    const offerings = offeringChoices(ctx.toolkit);
    const offering = offerings.includes(recipe.offering) ? recipe.offering : null;

    const room = Math.max(0, MAX_ITEM_GRACE - grace);
    let primstacking = allowPrims ? Math.max(0, recipe.primstacking) : 0;
    primstacking = Math.min(primstacking, Math.ceil(room / PRIMSTACK_GRACE));
    const spend = canStatPrime
      ? primstackingSpend({
          units: primstacking,
          itemGrade,
          primlingUnit,
          statScrollUnit: dexScrollUnit,
          canStat: true,
        })
      : emptyPrimstackingSpend(primstacking, primlingUnit);

    const graceUnit = graceOffering
      ? statScrollGraceUnitCost(ctx.prices, itemGrade, graceOffering.unit)
      : Infinity;
    const maxStat = graceOffering && Number.isFinite(graceUnit) ? Math.max(0, Math.ceil(room)) : 0;
    let statScrollGrace = Math.max(0, Math.min(recipe.statScrollGrace, maxStat));
    // Leave room for primstacking grace when both are set.
    const primstackingGrace = primstacking * PRIMSTACK_GRACE;
    if (primstackingGrace + statScrollGrace > room) {
      statScrollGrace = Math.max(0, Math.floor(room - primstackingGrace));
    }

    const graceInto = Math.min(
      MAX_ITEM_GRACE,
      grace + primstacking * PRIMSTACK_GRACE + statScrollGrace,
    );
    const failstack =
      costModel === "cheapest" ? Math.max(0, Math.min(recipe.failstack, MAX_FAILSTACK)) : 0;
    const ograce =
      costModel === "cheapest" ? Math.max(0, Math.min(recipe.ograce, MAX_OGRACE_STEPS)) : 0;

    const zeroGrade = getItemGrade(def, 0);
    const baseChance = UPGRADE_BASE_CHANCES[zeroGrade]?.[fromLevel + 1] ?? 0;
    const rawChance = getUpgradeChance(
      ctx.lookup,
      { name: itemName, level: fromLevel, grace: graceInto },
      scrollGrade,
      offering,
      ctx.tables,
      costModel === "cheapest"
        ? {
            failstack,
            ograce,
            useServerUgrace: ctx.useServerUgrace,
          }
        : undefined,
    );
    const { chance, graceAfter, chanceCap } = rawChance;
    if (!(chance > 0)) return null;
    const successRate = args.luckySlot ? applyLuckySlotChance(chance) : chance;

    const scrollKey = scrollKeyForUpgrade(scrollGrade);
    if (!scrollKey) return null;
    const sCost = unitPrice(ctx.prices, scrollKey);
    const oCost = offeringCost(ctx.prices, offering);
    const pCost = spend.cost;
    const ssCost =
      statScrollGrace > 0 && Number.isFinite(graceUnit) ? statScrollGrace * graceUnit : 0;
    if (
      !Number.isFinite(sCost) ||
      !Number.isFinite(oCost) ||
      !Number.isFinite(pCost) ||
      !Number.isFinite(ssCost)
    ) {
      return null;
    }

    let failstackCost = 0;
    let ograceCostVal = 0;
    let stepEv: number;
    if (costModel === "fewest") {
      const materialCost = sCost + oCost + pCost + ssCost;
      // Incremental EV; curValue is asset EV (includes base). successRate includes Lucky Slot.
      stepEv = expectedUpgradeCost(materialCost, curValue, successRate, scrollGrade);
      curValue += stepEv;
    } else {
      failstackCost = stacks ? failstackUnitCost(stacks, fromLevel + 1, failstack) : 0;
      ograceCostVal = stacks ? ograceUnitCost(stacks, ograce) : 0;
      if (!Number.isFinite(failstackCost) || !Number.isFinite(ograceCostVal)) return null;
      const prepCost = pCost + ssCost;
      const priced = calculateUpgradeStepCost({
        parentCost,
        prepCost,
        scrollCost: sCost,
        offeringCost: oCost,
        failstackCost,
        ograceCost: ograceCostVal,
        scrollGrade,
        chance: successRate,
      });
      stepEv = priced.cost - parentCost;
      parentCost = priced.cost;
    }

    out.push({
      fromLevel,
      toLevel: fromLevel + 1,
      scrollGrade,
      offering,
      primstacking,
      primstackingStatClicks: spend.statClicks,
      primstackingNormal: spend.normalPrimes,
      primstackingStatScrollEach: spend.statScrollEach,
      statScrollGrace,
      statScrollOffering: statScrollGrace > 0 ? graceOffering?.offering ?? null : null,
      statScrollQty: statScrollGrace > 0 ? pscrollQtyForGrade(itemGrade) : 0,
      failstack,
      ograce,
      failstackCost,
      ograceCost: ograceCostVal,
      baseChance,
      chanceCap,
      chance,
      successRate,
      graceAfter,
      stepExpectedCost: stepEv,
    });
    grace = graceAfter;
  }

  return {
    steps: out,
    totalExpectedCost: costModel === "fewest" ? curValue : parentCost,
  };
}

/** Scroll grades the user may pick for a step given toolkit + item grade. */
export function allowedUpgradeScrollGrades(
  itemGrade: number,
  costModel: "cheapest" | "fewest",
  allowScroll4: boolean,
): number[] {
  const max =
    costModel === "cheapest"
      ? maxScrollForCheapest(itemGrade, allowScroll4)
      : maxToolkitScrollGrade(itemGrade, allowScroll4);
  const grades: number[] = [];
  for (let g = itemGrade; g <= max; g++) grades.push(g);
  return grades;
}

/** Cheapest upgrade path (Pareto + stack farm costs). */
export function planUpgradePath(
  ctx: PlannerContext,
  itemName: ItemKey,
  itemValue: number,
  targetLevel: number,
  options: {
    luckySlot?: boolean;
    startLevel?: number;
    startGrace?: number;
    /** Precomputed stack tables; skips helmet Pareto when set. */
    stacks?: StackTables;
    /** Defaults true; set false in tests to shrink the Pareto search. */
    allowFailstack?: boolean;
    allowOgrace?: boolean;
  } = {},
): UpgradePathPlan | null {
  if (!ctx.lookup(itemName)) return null;
  if ((options.startLevel ?? 0) > 0) {
    // Partial starts: fall back to bestOdds chain for now (UI always starts at 0).
    return planUpgradePathBestOdds(ctx, itemName, itemValue, targetLevel, options);
  }

  const stacks = options.stacks ?? computeStacksForPlanner(ctx);
  const frontier = upgradeCalcPareto(ctx, itemName, itemValue, targetLevel, {
    luckySlot: options.luckySlot,
    startGrace: options.startGrace,
    stacks,
    allowFailstack: options.allowFailstack,
    allowOgrace: options.allowOgrace,
  });
  if (!frontier?.length) return null;
  return reconstructUpgradePlan(frontier[0], itemValue, { luckySlot: options.luckySlot });
}

type CompoundRouteCandidate = {
  expCost: number;
  chance: number;
  grace: number;
  scroll: number;
  offering: OfferingChoice;
  ograce: number;
  ograceCost: number;
};

export function resolveCompoundStrategy(
  strategyOrOptimize?: UpgradeStepStrategy | boolean,
): UpgradeStepStrategy {
  if (strategyOrOptimize === true) return "bestOdds";
  if (strategyOrOptimize === false || strategyOrOptimize == null) return "costOptimal";
  return strategyOrOptimize;
}

export function pickCompoundRoute(
  candidates: CompoundRouteCandidate[],
  strategy: UpgradeStepStrategy,
): CompoundRouteCandidate | null {
  if (!candidates.length) return null;

  if (strategy === "bestOdds") {
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      if (c.chance > best.chance + 0.0001) best = c;
      else if (Math.abs(c.chance - best.chance) < 0.0001 && c.expCost < best.expCost) best = c;
    }
    return best;
  }

  if (strategy === "balanced") {
    let bestEv = candidates[0].expCost;
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].expCost < bestEv) bestEv = candidates[i].expCost;
    }
    const near = candidates.filter(
      (c) => c.expCost <= bestEv * (1 + BALANCED_NEAR_BEST_EV_FRAC_COMPOUND) + 1e-6,
    );
    near.sort((a, b) => {
      if (Math.abs(a.chance - b.chance) > 0.0001) return b.chance - a.chance;
      return a.expCost - b.expCost;
    });
    return near[0] ?? null;
  }

  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].expCost < best.expCost) best = candidates[i];
  }
  return best;
}

function compoundScrollCost(prices: PriceTable, scrollGrade: number): number {
  const key = COMPOUND_SCROLL_KEYS[scrollGrade];
  if (!key) return 0;
  return unitPrice(prices, key);
}

/** Compound Cheapest: Pareto over scroll/offering/ograce (no failstack/primstacking). */
function planCompoundCheapest(
  ctx: PlannerContext,
  itemName: ItemKey,
  itemValue: number,
  targetLevel: number,
  stacksOverride?: StackTables,
): CompoundPathPlan | null {
  const def = ctx.lookup(itemName);
  if (!def) return null;

  const stacks = stacksOverride ?? computeStacksForPlanner(ctx);
  const offerings = offeringChoices(ctx.toolkit);
  const maxOgraceIdx = Math.min(MAX_OGRACE_STEPS, stacks.ograce.length - 1);
  const grades = ((def.grades as number[] | undefined) ?? [9, 10, 11, 12]) as number[];
  const target = Math.min(targetLevel, grades[3] ?? 10, 10);

  let last: ParetoState[] = [{ item_grace: 0, cost: itemValue, parent: null }];

  for (let levelTo = 1; levelTo <= target; levelTo++) {
    const fromLevel = levelTo - 1;
    const itemGrade = getItemGrade(def, fromLevel);
    const p2 = pruner();

    for (const parent of last) {
      for (let scrollGrade = itemGrade; scrollGrade <= Math.min(itemGrade + 1, 3); scrollGrade++) {
        const sCost = compoundScrollCost(ctx.prices, scrollGrade);
        if (!Number.isFinite(sCost)) continue;
        for (const offering of offerings) {
          const oCost = offeringCost(ctx.prices, offering);
          if (!Number.isFinite(oCost)) continue;
          for (let ograce = 0; ograce <= maxOgraceIdx; ograce++) {
            const psCost = ograceUnitCost(stacks, ograce);
            if (!Number.isFinite(psCost)) break;

            const item = { name: itemName, level: fromLevel, grace: parent.item_grace };
            const raw = getCompoundChance(ctx.lookup, item, scrollGrade, offering, ctx.tables, {
              ograce,
            });
            if (!raw.chance) continue;

            const attemptCost = 3 * parent.cost + sCost + oCost;
            const fixedCost = psCost;
            const cost = fixedCost + attemptCost / raw.chance;

            const best = p2.getSet(raw.graceAfter, cost, () => ({
              parent,
              scroll_grade: scrollGrade,
              offering,
              ograce,
              ograceCost: psCost,
              chance: raw.chance,
              chance_cap: raw.chanceCap,
              graceAfter: raw.graceAfter,
              level_to: levelTo,
              item_grace: raw.graceAfter,
              cost,
            }));

            const lowerBound = fixedCost + attemptCost / raw.chanceCap;
            if (lowerBound >= best.cost) break;
            if (raw.chance >= raw.chanceCap) break;
          }
        }
      }
    }
    last = p2.pareto();
    if (!last.length) return null;
  }

  last.sort((a, b) => a.cost - b.cost);
  const best = last[0];
  const chain: ParetoState[] = [];
  let cur: ParetoState | null | undefined = best;
  while (cur) {
    if (cur.scroll_grade != null) chain.push(cur);
    cur = cur.parent;
  }
  chain.reverse();

  const path: CompoundPathStep[] = [];
  let prev = itemValue;
  for (const node of chain) {
    const fromLevel = (node.level_to ?? 1) - 1;
    path.push({
      fromLevel,
      toLevel: fromLevel + 1,
      scrollGrade: node.scroll_grade ?? 0,
      offering: node.offering ?? null,
      ograce: node.ograce ?? 0,
      ograceCost: node.ograceCost ?? 0,
      chance: node.chance ?? 0,
      graceAfter: node.graceAfter ?? 0,
      stepExpectedCost: node.cost - prev,
    });
    prev = node.cost;
  }
  return { path, totalExpectedCost: best.cost };
}

export function planCompoundPath(
  ctx: PlannerContext,
  itemName: ItemKey,
  itemValue: number,
  targetLevel: number,
  strategyOrOptimize: UpgradeStepStrategy | boolean = false,
  options: { stacks?: StackTables } = {},
): CompoundPathPlan | null {
  if (!ctx.lookup(itemName)) return null;
  const strategy = resolveCompoundStrategy(strategyOrOptimize);

  if (strategy === "costOptimal") {
    return planCompoundCheapest(ctx, itemName, itemValue, targetLevel, options.stacks);
  }

  const offerings = offeringChoices(ctx.toolkit);
  const path: CompoundPathStep[] = [];
  let item = { name: itemName, level: 0, grace: 0 };
  // Absolute EV of the current compound product (includes base); step spend is the delta.
  let curCost = itemValue;

  for (let lvl = 0; lvl < targetLevel; lvl++) {
    const def = ctx.lookup(itemName);
    if (!def) break;
    const grade = getItemGrade(def, item.level ?? 0);
    const candidates: CompoundRouteCandidate[] = [];

    for (let s = grade; s <= Math.min(grade + 1, 3); s++) {
      for (const offering of offerings) {
        const scrollUnit = compoundScrollCost(ctx.prices, s);
        const oCost = offeringCost(ctx.prices, offering);
        if (!Number.isFinite(scrollUnit) || !Number.isFinite(oCost)) continue;
        const stepCost = curCost * 3 + scrollUnit + oCost;
        const { chance, graceAfter } = getCompoundChance(ctx.lookup, item, s, offering, ctx.tables);
        if (!chance) continue;
        candidates.push({
          expCost: stepCost / chance,
          chance,
          grace: graceAfter,
          scroll: s,
          offering,
          ograce: 0,
          ograceCost: 0,
        });
      }
    }

    const best = pickCompoundRoute(candidates, strategy);
    if (!best) break;
    const stepEv = best.expCost - curCost;
    path.push({
      fromLevel: lvl,
      toLevel: lvl + 1,
      scrollGrade: best.scroll,
      offering: best.offering,
      ograce: best.ograce,
      ograceCost: best.ograceCost,
      chance: best.chance,
      graceAfter: best.grace,
      stepExpectedCost: stepEv,
    });
    item = { name: itemName, level: lvl + 1, grace: best.grace };
    curCost = best.expCost;
  }

  return { path, totalExpectedCost: curCost };
}

export type { MaterialLine, PlanSummaryStep } from "./upgradePathSummary";
export {
  expectedBaseCopies,
  foldExpectedBaseCopies,
  summarizeCompoundPlan,
  summarizeUpgradePlan,
} from "./upgradePathSummary";
export { expectedPlanShrineMs, shrineClickMs } from "./upgradePathShrine";
export { formatAttempts, formatChancePct, formatGold, formatShrineTime } from "./upgradePathFormat";
