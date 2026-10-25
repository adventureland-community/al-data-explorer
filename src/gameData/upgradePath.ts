/**
 * Upgrade/compound path planner.
 *
 * Cheapest = Kora Dereva pastebin-style level-by-level Pareto search (priming,
 * failstack, primestack, scroll4 survival, stat-scroll priming;
 * https://pastebin.com/jBMKeLfd, CALC_VERSION 8).
 * Fewest Copies = per-level max chance over the scroll/offering/primling toolkit
 * only (zero stacks).
 */

import { GItem, ItemKey } from "typed-adventureland";

import { getItemGrade } from "./playerItemDisplay";
import {
  applyLuckySlotChance,
  ChanceTables,
  getCompoundChance,
  getUpgradeChance,
  ItemLookup,
  OfferingChoice,
  OFFERING_GRADES,
} from "./upgradeChance";
import { itemAcceptsStatScroll } from "./itemAffixes";
import {
  COMPOUND_SCROLL_KEYS,
  offeringKeyFromGrade,
  PriceTable,
  primingSpend,
  PrimingSpend,
  pscrollQtyForGrade,
  scrollKeyForCompound,
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
  MAX_PRIMESTACK,
  primingUnitCost,
  primestackUnitCost,
  StackTables,
} from "./upgradeStacks";

export type UpgradeStepStrategy = "bestOdds" | "balanced" | "costOptimal";

export const BALANCED_NEAR_BEST_EV_FRAC_UPGRADE = 0.05;
export const BALANCED_NEAR_BEST_EV_FRAC_COMPOUND = 0.2;

export type ToolkitOptions = {
  allowPrimlings?: boolean;
  /** When true, Cheapest may use scroll4 (item survives failure). */
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
  /** Primling priming count (0.5 grace each). Alias kept for UI. */
  primstacks: number;
  priming: number;
  /** Pastebin primingSpend: stat-scroll clicks folded into priming. */
  primingStatClicks: number;
  primingNormalPrimes: number;
  /** Property scrolls per priming stat click (0 when unused). */
  primingStatScrollEach: number;
  /** Property-scroll+offering applications (+1 grace each). */
  statScrollGrace: number;
  /** Offering grade used with each pscroll grace app (null if unused). */
  statScrollOffering: OfferingChoice;
  /** Pscroll qty per grace application (server `needed[itemGrade]`). */
  statScrollQty: number;
  failstack: number;
  primestack: number;
  failstackCost: number;
  primestackCost: number;
  chance: number;
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
  primestack: number;
  primestackCost: number;
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
  priming?: number;
  primingCost?: number;
  primingStatClicks?: number;
  primingNormalPrimes?: number;
  primingStatScrollEach?: number;
  statScrollGrace?: number;
  statScrollOffering?: OfferingChoice;
  /** Pscroll qty per grace app at this level (server needed[itemGrade]). */
  statScrollQty?: number;
  scroll_grade?: number;
  offering?: OfferingChoice;
  failstack?: number;
  primestack?: number;
  chance?: number;
  chance_cap?: number;
  graceAfter?: number;
  failstackCost?: number;
  primestackCost?: number;
  level_to?: number;
};

function emptyPrimingSpend(units: number, primingUnit: number): PrimingSpend {
  return {
    statClicks: 0,
    normalPrimes: units,
    statScrollEach: 0,
    cost: units ? (Number.isFinite(primingUnit) ? units * primingUnit : Infinity) : 0,
  };
}

function offeringChoices(toolkit?: ToolkitOptions): OfferingChoice[] {
  if (toolkit?.offerings) return toolkit.offerings;
  return [...OFFERING_GRADES];
}

/**
 * Toolkit ceiling for Fewest Copies: grade, or grade+1 — but never open scroll3+
 * until the item is grade ≥ 3.
 */
export function maxToolkitScrollGrade(grade: number): number {
  const capped = Math.min(grade + 1, 4);
  if (grade < 3 && capped >= 3) return grade;
  return capped;
}

function offeringCost(prices: PriceTable, offering: OfferingChoice): number {
  return unitPrice(prices, offeringKeyFromGrade(offering));
}

function primstackCost(prices: PriceTable): number {
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
  /** Priming + optional pscroll-grace prep gold (pastebin primingCost + ss). */
  prepCost: number;
  scrollCost: number;
  offeringCost: number;
  failstackCost: number;
  primestackCost: number;
  scrollGrade: number;
  chance: number;
}): { cost: number; fixedCost: number; attemptCost: number } {
  const baseCost = args.parentCost + args.prepCost;
  let attemptCost = 0;
  let fixedCost = 0;
  if (args.scrollGrade === 4) {
    // scroll4: item survives failure
    attemptCost = args.scrollCost + args.offeringCost;
    fixedCost = baseCost + args.failstackCost + args.primestackCost;
  } else {
    attemptCost = baseCost + args.scrollCost + args.offeringCost;
    fixedCost = args.failstackCost + args.primestackCost;
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
    allowPrimestack?: boolean;
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
  const allowPrims = ctx.toolkit?.allowPrimlings !== false;
  const allowScroll4 = ctx.toolkit?.allowScroll4 === true;
  const allowFailstack = options.allowFailstack !== false;
  const allowPrimestack = options.allowPrimestack !== false;
  const primingUnit = primingUnitCost(ctx.prices);
  const canStatPrime = itemAcceptsStatScroll(def);
  const dexScrollUnit = unitPrice(ctx.prices, STAT_SCROLL_PROXY_KEY);
  const graceOffering =
    ctx.toolkit?.allowStatScrollGrace && canStatPrime
      ? cheapestOfferingForGrace(ctx.prices, ctx.toolkit)
      : null;
  const maxPrimestackIdx = allowPrimestack
    ? Math.min(MAX_PRIMESTACK, options.stacks.primestack.length - 1)
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
      for (let priming = 0; priming <= maxPriming; priming++) {
        const spend = canStatPrime
          ? primingSpend({
              units: priming,
              itemGrade,
              primingUnit,
              statScrollUnit: dexScrollUnit,
              canStat: true,
            })
          : emptyPrimingSpend(priming, primingUnit);
        for (let statScrollGrace = 0; statScrollGrace <= maxStatScroll; statScrollGrace++) {
          const itemGrace = Math.min(
            itemGraceCap,
            parent.item_grace + priming * 0.5 + statScrollGrace,
          );
          // Avoid 0 * Infinity → NaN when the technique is off.
          const ssPrep = statScrollGrace > 0 ? statScrollGrace * graceUnit : 0;
          const primingCost = spend.cost + ssPrep;
          const cost = parent.cost + primingCost;
          if (!Number.isFinite(cost)) continue;
          p1.getSet(itemGrace, cost, () => ({
            parent,
            priming,
            primingCost,
            primingStatClicks: spend.statClicks,
            primingNormalPrimes: spend.normalPrimes,
            primingStatScrollEach: spend.statScrollEach,
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
      const priming = primed.priming ?? 0;
      const primingCost = primed.primingCost ?? 0;
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

            for (let primestack = 0; primestack <= maxPrimestackIdx; primestack++) {
              const psCost = primestackUnitCost(options.stacks, primestack);
              if (!Number.isFinite(psCost)) break;

              const item = { name: itemName, level: fromLevel, grace: itemGrace };
              const raw = getUpgradeChance(ctx.lookup, item, scrollGrade, offering, ctx.tables, {
                failstack,
                primestack,
                useServerUgrace: ctx.useServerUgrace,
              });
              if (!raw.chance) continue;

              let { chance } = raw;
              let { chanceCap } = raw;
              if (options.luckySlot) {
                chance = applyLuckySlotChance(chance);
                chanceCap = applyLuckySlotChance(chanceCap);
              }
              if (!(chance > 0)) continue;

              const { cost, fixedCost, attemptCost } = calculateUpgradeStepCost({
                parentCost: parent.cost,
                prepCost: primingCost,
                scrollCost: sCost,
                offeringCost: oCost,
                failstackCost: fsCost,
                primestackCost: psCost,
                scrollGrade,
                chance,
              });

              const graceAfter = Math.min(raw.graceAfter, itemGraceCap);
              const best = p2.getSet(graceAfter, cost, () => ({
                parent,
                priming,
                primingCost,
                primingStatClicks: primed.primingStatClicks ?? 0,
                primingNormalPrimes: primed.primingNormalPrimes ?? priming,
                primingStatScrollEach: primed.primingStatScrollEach ?? 0,
                statScrollGrace,
                statScrollOffering: primed.statScrollOffering ?? null,
                statScrollQty: primed.statScrollQty ?? 0,
                scroll_grade: scrollGrade,
                offering,
                failstack,
                primestack,
                chance,
                chance_cap: chanceCap,
                graceAfter,
                failstackCost: fsCost,
                primestackCost: psCost,
                level_to: levelTo,
                item_grace: graceAfter,
                cost,
              }));

              const lowerBound = fixedCost + attemptCost / chanceCap;
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

function reconstructUpgradePlan(best: ParetoState, itemValue: number): UpgradePathPlan {
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
    const priming = node.priming ?? 0;
    const statScrollGrace = node.statScrollGrace ?? 0;
    steps.push({
      fromLevel,
      toLevel: fromLevel + 1,
      scrollGrade: node.scroll_grade ?? 0,
      offering: node.offering ?? null,
      primstacks: priming,
      priming,
      primingStatClicks: node.primingStatClicks ?? 0,
      primingNormalPrimes: node.primingNormalPrimes ?? priming,
      primingStatScrollEach: node.primingStatScrollEach ?? 0,
      statScrollGrace,
      statScrollOffering: statScrollGrace > 0 ? node.statScrollOffering ?? null : null,
      statScrollQty: node.statScrollQty ?? 0,
      failstack: node.failstack ?? 0,
      primestack: node.primestack ?? 0,
      failstackCost: node.failstackCost ?? 0,
      primestackCost: node.primestackCost ?? 0,
      chance: node.chance ?? 0,
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

function computeStacksForPlanner(ctx: PlannerContext): StackTables {
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
      allowPrimlings: true,
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
      allowPrimestack: true,
    },
  );

  if (!helmetFrontier?.length) return seed;
  return buildStackTables(
    ctx.prices,
    ctx.tables,
    cumulativeCostsFromFrontier(helmetFrontier[0], helmetValue),
  );
}

const MAX_ITEM_GRACE = 13;
const PRIMSTACK_GRACE = 0.5;

type ScoredUpgradeRoute = {
  scrollGrade: number;
  offering: OfferingChoice;
  primstacks: number;
  primingStatClicks: number;
  primingNormalPrimes: number;
  primingStatScrollEach: number;
  statScrollGrace: number;
  statScrollOffering: OfferingChoice;
  chance: number;
  luckyChance: number;
  materialCost: number;
  expectedCost: number;
};

function expectedUpgradeCost(materialCost: number, itemValue: number, chance: number): number {
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
  const allowPrims = ctx.toolkit?.allowPrimlings !== false;
  const room = Math.max(0, MAX_ITEM_GRACE - currentGrace);
  const maxPrimstacks = allowPrims ? Math.max(0, Math.ceil(room / PRIMSTACK_GRACE)) : 0;
  const canStatPrime = itemAcceptsStatScroll(def);
  const primingUnit = primstackCost(ctx.prices);
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

  for (let primstacks = 0; primstacks <= maxPrimstacks; primstacks++) {
    const spend = canStatPrime
      ? primingSpend({
          units: primstacks,
          itemGrade: grade,
          primingUnit,
          statScrollUnit: dexScrollUnit,
          canStat: true,
        })
      : emptyPrimingSpend(primstacks, primingUnit);
    for (let statScrollGrace = 0; statScrollGrace <= maxStatScroll; statScrollGrace++) {
      const grace = Math.min(
        MAX_ITEM_GRACE,
        currentGrace + primstacks * PRIMSTACK_GRACE + statScrollGrace,
      );
      const item = { name: itemName, level: currentLevel, grace };
      const maxScrollGrade = maxToolkitScrollGrade(grade);

      for (let scrollGrade = grade; scrollGrade <= maxScrollGrade; scrollGrade++) {
        for (const offering of offerings) {
          // Fewest Copies: zero fail/primestacks
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
            primstacks,
            primingStatClicks: spend.statClicks,
            primingNormalPrimes: spend.normalPrimes,
            primingStatScrollEach: spend.statScrollEach,
            statScrollGrace,
            statScrollOffering: statScrollGrace > 0 ? graceOffering!.offering : null,
            chance,
            luckyChance,
            materialCost,
            expectedCost: expectedUpgradeCost(materialCost, itemValue, chance),
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
  if (!ctx.lookup(itemName)) return null;
  const startLevel = options.startLevel ?? 0;
  const steps: UpgradePathStep[] = [];
  let grace = options.startGrace ?? 0;
  let cumCost = 0;
  let curValue = itemValue;

  for (let lvl = startLevel; lvl < targetLevel; lvl++) {
    const rec = recommendUpgradeStepMaxChance(ctx, itemName, lvl, grace, curValue, options);
    if (!rec) return steps.length ? { steps, totalExpectedCost: cumCost } : null;

    const item = {
      name: itemName,
      level: lvl,
      grace: Math.min(
        MAX_ITEM_GRACE,
        grace + rec.primstacks * PRIMSTACK_GRACE + rec.statScrollGrace,
      ),
    };
    const { chance, graceAfter } = getUpgradeChance(
      ctx.lookup,
      item,
      rec.scrollGrade,
      rec.offering,
      ctx.tables,
    );
    const finalChance = options.luckySlot ? applyLuckySlotChance(chance) : chance;
    const stepEv = expectedUpgradeCost(rec.materialCost, curValue, chance);
    cumCost += stepEv;
    curValue = stepEv;
    grace = graceAfter;
    const def = ctx.lookup(itemName);
    const itemGrade = def ? getItemGrade(def, lvl) : 0;
    steps.push({
      fromLevel: lvl,
      toLevel: lvl + 1,
      scrollGrade: rec.scrollGrade,
      offering: rec.offering,
      primstacks: rec.primstacks,
      priming: rec.primstacks,
      primingStatClicks: rec.primingStatClicks,
      primingNormalPrimes: rec.primingNormalPrimes,
      primingStatScrollEach: rec.primingStatScrollEach,
      statScrollGrace: rec.statScrollGrace,
      statScrollOffering: rec.statScrollOffering,
      statScrollQty: rec.statScrollGrace > 0 ? pscrollQtyForGrade(itemGrade) : 0,
      failstack: 0,
      primestack: 0,
      failstackCost: 0,
      primestackCost: 0,
      chance: finalChance,
      graceAfter,
      stepExpectedCost: stepEv,
    });
  }

  return { steps, totalExpectedCost: cumCost };
}

/** Manual recipe knobs for one upgrade step (planner defaults + user overrides). */
export type UpgradeStepOverride = {
  scrollGrade?: number;
  offering?: OfferingChoice;
  primstacks?: number;
  statScrollGrace?: number;
  failstack?: number;
  primestack?: number;
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
    const primstacks = o.primstacks ?? s.primstacks;
    return {
      ...s,
      scrollGrade: o.scrollGrade ?? s.scrollGrade,
      offering: o.offering !== undefined ? o.offering : s.offering,
      primstacks,
      priming: primstacks,
      statScrollGrace: o.statScrollGrace ?? s.statScrollGrace,
      failstack: o.failstack ?? s.failstack,
      primestack: o.primestack ?? s.primestack,
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
}): UpgradePathPlan | null {
  const { ctx, itemName, itemValue, costModel } = args;
  const def = ctx.lookup(itemName);
  if (!def || !args.steps.length) return null;

  const stacks = costModel === "cheapest" ? computeStacksForPlanner(ctx) : null;
  const allowPrims = ctx.toolkit?.allowPrimlings !== false;
  const primingUnit =
    costModel === "fewest" ? primstackCost(ctx.prices) : primingUnitCost(ctx.prices);
  const canStatPrime = itemAcceptsStatScroll(def);
  const dexScrollUnit = unitPrice(ctx.prices, STAT_SCROLL_PROXY_KEY);
  const graceOffering =
    ctx.toolkit?.allowStatScrollGrace && canStatPrime
      ? cheapestOfferingForGrace(ctx.prices, ctx.toolkit)
      : null;

  let grace = args.startGrace ?? itemIgraceFromDef(def);
  let parentCost = itemValue;
  let curValue = itemValue;
  let cumFewest = 0;
  const out: UpgradePathStep[] = [];

  for (const recipe of args.steps) {
    const { fromLevel } = recipe;
    const itemGrade = getItemGrade(def, fromLevel);
    const maxScroll =
      costModel === "cheapest"
        ? maxScrollForCheapest(itemGrade, ctx.toolkit?.allowScroll4 === true)
        : maxToolkitScrollGrade(itemGrade);
    const scrollGrade = Math.min(Math.max(itemGrade, recipe.scrollGrade), maxScroll);
    const offerings = offeringChoices(ctx.toolkit);
    const offering = offerings.includes(recipe.offering) ? recipe.offering : null;

    const room = Math.max(0, MAX_ITEM_GRACE - grace);
    let primstacks = allowPrims ? Math.max(0, recipe.primstacks) : 0;
    primstacks = Math.min(primstacks, Math.ceil(room / PRIMSTACK_GRACE));
    const spend = canStatPrime
      ? primingSpend({
          units: primstacks,
          itemGrade,
          primingUnit,
          statScrollUnit: dexScrollUnit,
          canStat: true,
        })
      : emptyPrimingSpend(primstacks, primingUnit);

    const graceUnit = graceOffering
      ? statScrollGraceUnitCost(ctx.prices, itemGrade, graceOffering.unit)
      : Infinity;
    const maxStat = graceOffering && Number.isFinite(graceUnit) ? Math.max(0, Math.ceil(room)) : 0;
    let statScrollGrace = Math.max(0, Math.min(recipe.statScrollGrace, maxStat));
    // Leave room for priming grace when both are set.
    const primingGrace = primstacks * PRIMSTACK_GRACE;
    if (primingGrace + statScrollGrace > room) {
      statScrollGrace = Math.max(0, Math.floor(room - primingGrace));
    }

    const graceInto = Math.min(
      MAX_ITEM_GRACE,
      grace + primstacks * PRIMSTACK_GRACE + statScrollGrace,
    );
    const failstack =
      costModel === "cheapest" ? Math.max(0, Math.min(recipe.failstack, MAX_FAILSTACK)) : 0;
    const primestack =
      costModel === "cheapest" ? Math.max(0, Math.min(recipe.primestack, MAX_PRIMESTACK)) : 0;

    const { chance, graceAfter } = getUpgradeChance(
      ctx.lookup,
      { name: itemName, level: fromLevel, grace: graceInto },
      scrollGrade,
      offering,
      ctx.tables,
      costModel === "cheapest"
        ? {
            failstack,
            primestack,
            useServerUgrace: ctx.useServerUgrace,
          }
        : undefined,
    );
    if (!(chance > 0)) return null;
    const finalChance = args.luckySlot ? applyLuckySlotChance(chance) : chance;

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
    let primestackCostVal = 0;
    let stepEv: number;
    if (costModel === "fewest") {
      const materialCost = sCost + oCost + pCost + ssCost;
      // Match planUpgradePathBestOdds: EV uses pre-lucky chance; stored chance is lucky.
      stepEv = expectedUpgradeCost(materialCost, curValue, chance);
      cumFewest += stepEv;
      curValue = stepEv;
    } else {
      failstackCost = stacks ? failstackUnitCost(stacks, fromLevel + 1, failstack) : 0;
      primestackCostVal = stacks ? primestackUnitCost(stacks, primestack) : 0;
      if (!Number.isFinite(failstackCost) || !Number.isFinite(primestackCostVal)) return null;
      const prepCost = pCost + ssCost;
      const priced = calculateUpgradeStepCost({
        parentCost,
        prepCost,
        scrollCost: sCost,
        offeringCost: oCost,
        failstackCost,
        primestackCost: primestackCostVal,
        scrollGrade,
        chance: finalChance,
      });
      stepEv = priced.cost - parentCost;
      parentCost = priced.cost;
    }

    out.push({
      fromLevel,
      toLevel: fromLevel + 1,
      scrollGrade,
      offering,
      primstacks,
      priming: primstacks,
      primingStatClicks: spend.statClicks,
      primingNormalPrimes: spend.normalPrimes,
      primingStatScrollEach: spend.statScrollEach,
      statScrollGrace,
      statScrollOffering: statScrollGrace > 0 ? graceOffering?.offering ?? null : null,
      statScrollQty: statScrollGrace > 0 ? pscrollQtyForGrade(itemGrade) : 0,
      failstack,
      primestack,
      failstackCost,
      primestackCost: primestackCostVal,
      chance: finalChance,
      graceAfter,
      stepExpectedCost: stepEv,
    });
    grace = graceAfter;
  }

  return {
    steps: out,
    totalExpectedCost: costModel === "fewest" ? cumFewest : parentCost,
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
      : maxToolkitScrollGrade(itemGrade);
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
  options: { luckySlot?: boolean; startLevel?: number; startGrace?: number } = {},
): UpgradePathPlan | null {
  if (!ctx.lookup(itemName)) return null;
  if ((options.startLevel ?? 0) > 0) {
    // Partial starts: fall back to bestOdds chain for now (UI always starts at 0).
    return planUpgradePathBestOdds(ctx, itemName, itemValue, targetLevel, options);
  }

  const stacks = computeStacksForPlanner(ctx);
  const frontier = upgradeCalcPareto(ctx, itemName, itemValue, targetLevel, {
    luckySlot: options.luckySlot,
    startGrace: options.startGrace,
    stacks,
  });
  if (!frontier?.length) return null;
  return reconstructUpgradePlan(frontier[0], itemValue);
}

type CompoundRouteCandidate = {
  expCost: number;
  chance: number;
  grace: number;
  scroll: number;
  offering: OfferingChoice;
  primestack: number;
  primestackCost: number;
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

/** Compound Cheapest: Pareto over scroll/offering/primestack (no failstack/priming). */
function planCompoundCheapest(
  ctx: PlannerContext,
  itemName: ItemKey,
  itemValue: number,
  targetLevel: number,
): CompoundPathPlan | null {
  const def = ctx.lookup(itemName);
  if (!def) return null;

  const stacks = computeStacksForPlanner(ctx);
  const offerings = offeringChoices(ctx.toolkit);
  const maxPrimestackIdx = Math.min(MAX_PRIMESTACK, stacks.primestack.length - 1);
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
          for (let primestack = 0; primestack <= maxPrimestackIdx; primestack++) {
            const psCost = primestackUnitCost(stacks, primestack);
            if (!Number.isFinite(psCost)) break;

            const item = { name: itemName, level: fromLevel, grace: parent.item_grace };
            const raw = getCompoundChance(ctx.lookup, item, scrollGrade, offering, ctx.tables, {
              primestack,
            });
            if (!raw.chance) continue;

            const attemptCost = 3 * parent.cost + sCost + oCost;
            const fixedCost = psCost;
            const cost = fixedCost + attemptCost / raw.chance;

            const best = p2.getSet(raw.graceAfter, cost, () => ({
              parent,
              scroll_grade: scrollGrade,
              offering,
              primestack,
              primestackCost: psCost,
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
      primestack: node.primestack ?? 0,
      primestackCost: node.primestackCost ?? 0,
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
): CompoundPathPlan | null {
  if (!ctx.lookup(itemName)) return null;
  const strategy = resolveCompoundStrategy(strategyOrOptimize);

  if (strategy === "costOptimal") {
    return planCompoundCheapest(ctx, itemName, itemValue, targetLevel);
  }

  const offerings = offeringChoices(ctx.toolkit);
  const path: CompoundPathStep[] = [];
  let item = { name: itemName, level: 0, grace: 0 };
  let cumCost = 0;
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
          primestack: 0,
          primestackCost: 0,
        });
      }
    }

    const best = pickCompoundRoute(candidates, strategy);
    if (!best) break;
    cumCost += best.expCost;
    path.push({
      fromLevel: lvl,
      toLevel: lvl + 1,
      scrollGrade: best.scroll,
      offering: best.offering,
      primestack: best.primestack,
      primestackCost: best.primestackCost,
      chance: best.chance,
      graceAfter: best.grace,
      stepExpectedCost: best.expCost,
    });
    item = { name: itemName, level: lvl + 1, grace: best.grace };
    curCost = best.expCost;
  }

  return { path, totalExpectedCost: cumCost };
}

export type PlanSummaryStep = {
  fromLevel: number;
  toLevel: number;
  scrollKey: string;
  offeringKey: string | null;
  primstacks: number;
  priming: number;
  primingStatClicks: number;
  primingNormalPrimes: number;
  primingStatScrollEach: number;
  statScrollGrace: number;
  failstack: number;
  primestack: number;
  chance: number;
  attempts: number;
  stepSpend: number;
  runningTotal: number;
  /** Expected shrine wait for this step alone (Mass Production++). */
  shrineMs: number;
  /** Ingot/nugget polish for the Shiny title (no scroll; fail keeps the item). */
  kind?: "shiny";
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
 * Mass Production++ is assumed on for every click, so shrine wait is /10
 * (pastebin `shrineClickMs`, CALC_VERSION 8).
 */
export function shrineClickMs(
  mode: "upgrade" | "compound",
  levelTo: number,
  igrade: number,
): number {
  if (mode === "compound") return 1000;
  const tmult = igrade >= 2 ? 2 : igrade === 1 ? 1.5 : 1;
  return (500 * levelTo * Math.sqrt(levelTo) * tmult) / 10;
}

/**
 * Expected shrine time to hold one item at each plan step (index 0 = start).
 * Destroy restarts from the previous level; scroll4 does not.
 */
export function expectedPlanShrineMs(
  steps: { toLevel: number; chance: number; scrollGrade: number }[],
  mode: "upgrade" | "compound",
  igrade: number,
): number[] {
  const times = [0];
  for (let n = 0; n < steps.length; n++) {
    const step = steps[n];
    const click = shrineClickMs(mode, step.toLevel, igrade);
    const p = step.chance;
    const prev = times[n];
    if (!(p > 0) || !Number.isFinite(p) || !Number.isFinite(click) || !Number.isFinite(prev)) {
      times.push(Infinity);
      continue;
    }
    const clicks = 1 / p;
    times.push(step.scrollGrade === 4 ? prev + click * clicks : (prev + click) * clicks);
  }
  return times;
}

export function formatShrineTime(ms: number): string {
  if (!Number.isFinite(ms)) return "∞";
  if (ms < 0) return "—";
  const s = ms / 1000;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : s.toFixed(0)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  if (m < 60) return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
}

/** Expand a plan into UI rows + expected material quantities. */
export function summarizeUpgradePlan(
  plan: UpgradePathPlan,
  prices: PriceTable,
  mode: "upgrade" | "compound",
  opts?: { igrade?: number },
): { steps: PlanSummaryStep[]; materials: MaterialLine[]; totalExpectedCost: number } {
  const qty = new Map<string, number>();
  const steps: PlanSummaryStep[] = [];
  let running = 0;
  let stackGold = 0;
  const igrade = opts?.igrade ?? 0;
  const shrineTimes = expectedPlanShrineMs(plan.steps, mode, igrade);

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const scrollKey =
      mode === "upgrade"
        ? scrollKeyForUpgrade(step.scrollGrade) ?? `scroll${step.scrollGrade}`
        : scrollKeyForCompound(step.scrollGrade) ?? `cscroll${step.scrollGrade}`;
    const offeringKey = offeringKeyFromGrade(step.offering);
    const attempts = step.chance > 0 ? 1 / step.chance : Infinity;
    const priming = step.priming ?? step.primstacks ?? 0;
    const primingStatClicks = step.primingStatClicks ?? 0;
    const primingNormalPrimes = step.primingNormalPrimes ?? priming;
    const primingStatScrollEach = step.primingStatScrollEach ?? 0;
    const primlingQty = primingStatClicks + primingNormalPrimes;
    const primingScrollQty = primingStatClicks * primingStatScrollEach;
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
    const primingCost =
      primlingQty * (Number.isFinite(primUnit) ? primUnit : 0) +
      primingScrollQty * (Number.isFinite(ssUnit) ? ssUnit : 0);
    const ssOfferingUnit = unitPrice(prices, statOfferingKey);
    const ssCost =
      statScrollGrace *
      (pscrollQty * (Number.isFinite(ssUnit) ? ssUnit : 0) +
        (Number.isFinite(ssOfferingUnit) ? ssOfferingUnit : 0));
    const fsCost = step.failstackCost ?? 0;
    const psCost = step.primestackCost ?? 0;

    // Prefer planner EV delta when present (includes destroy risk + stacks).
    const stepSpend = Number.isFinite(step.stepExpectedCost)
      ? step.stepExpectedCost
      : Number.isFinite(attempts)
      ? matsPerAttempt * attempts + primingCost + ssCost + fsCost + psCost
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
      primstacks: priming,
      priming,
      primingStatClicks,
      primingNormalPrimes,
      primingStatScrollEach,
      statScrollGrace,
      failstack: step.failstack ?? 0,
      primestack: step.primestack ?? 0,
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
  return { steps, materials, totalExpectedCost: plan.totalExpectedCost };
}

export function summarizeCompoundPlan(
  plan: CompoundPathPlan,
  prices: PriceTable,
  opts?: { igrade?: number },
): { steps: PlanSummaryStep[]; materials: MaterialLine[]; totalExpectedCost: number } {
  const asUpgrade: UpgradePathPlan = {
    steps: plan.path.map((s) => ({
      fromLevel: s.fromLevel,
      toLevel: s.toLevel,
      scrollGrade: s.scrollGrade,
      offering: s.offering,
      primstacks: 0,
      priming: 0,
      primingStatClicks: 0,
      primingNormalPrimes: 0,
      primingStatScrollEach: 0,
      statScrollGrace: 0,
      statScrollOffering: null,
      statScrollQty: 0,
      failstack: 0,
      primestack: s.primestack ?? 0,
      failstackCost: 0,
      primestackCost: s.primestackCost ?? 0,
      chance: s.chance,
      graceAfter: s.graceAfter,
      stepExpectedCost: s.stepExpectedCost,
    })),
    totalExpectedCost: plan.totalExpectedCost,
  };
  return summarizeUpgradePlan(asUpgrade, prices, "compound", opts);
}

export function formatGold(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString("en-US");
}

export function formatChancePct(chance: number): string {
  if (!Number.isFinite(chance)) return "—";
  return `${(chance * 100).toFixed(2)}%`;
}

export function formatAttempts(chance: number): string {
  if (!chance || !Number.isFinite(chance)) return "—";
  const n = 1 / chance;
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}
