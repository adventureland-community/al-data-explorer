/**
 * Essence of Greed farm EV: spam one upgrade step (buy/replace item each attempt).
 *
 * Server: on uscroll fail, when parseInt(result*10000)==parseInt(chance*10000) and
 * grade ≥ 1 with a free inventory slot → +1 essenceofgreed.
 *
 * Per-attempt P(greed) = (1 − frac) / 10000 (fail slice of the edge bucket).
 * Item price is caller-supplied (vendor `.g`, market, or event estimate).
 */

import { GItem, ItemKey } from "typed-adventureland";

import { getItemGrade } from "./itemGrade";
import {
  applyLuckySlotChance,
  ChanceTables,
  getUpgradeChance,
  OfferingChoice,
} from "./upgradeChance";
import {
  offeringKeyFromGrade,
  PriceTable,
  scrollKeyForUpgrade,
  unitPrice,
  UPGRADE_SCROLL_KEYS,
} from "./upgradePrices";
import { edgeBucketOdds } from "./upgradeSideEffects";

/** Common vendor-friendly farm bases (any upgradeable item still works). */
export const GREED_QUICK_PICKS: readonly ItemKey[] = [
  "sword",
  "helmet1",
  "mace",
  "gloves",
  "helmet",
  "shoes",
  "pants",
];

export type GreedScrollKey = typeof UPGRADE_SCROLL_KEYS[number];

export type GreedFarmInput = {
  gItem: GItem;
  itemKey: ItemKey;
  /** Item level when the upgrade click happens. */
  level: number;
  scrollKey: GreedScrollKey;
  offering: OfferingChoice;
  itemUnit: number;
  prices: PriceTable;
  luckySlot?: boolean;
  tables?: ChanceTables;
  /** How many essences to price (default 1). */
  targetCount?: number;
};

export type GreedFarmResult = {
  level: number;
  toLevel: number;
  grade: number;
  eligible: boolean;
  /** Lowest level where grade ≥ 1 for this item. */
  minEligibleLevel: number;
  /** Game-visible upgrade chance (matches in-game UI). */
  chance: number;
  /**
   * Expected success rate when Lucky Slot is on (EV); otherwise equals `chance`.
   * Essence edge buckets still use `chance` (server equality on the table rate).
   */
  successRate: number;
  greedPerAttempt: number;
  luckyPerAttempt: number;
  scrollKey: GreedScrollKey;
  offeringKey: ReturnType<typeof offeringKeyFromGrade>;
  itemUnit: number;
  scrollUnit: number;
  offeringUnit: number;
  /** Gold spent per attempt (item + scroll + offering); item replaced each try. */
  attemptCost: number;
  /** Expected attempts for one essence. */
  attemptsPerGreed: number;
  goldPerGreed: number;
  targetCount: number;
  goldForTarget: number;
  attemptsForTarget: number;
  /** Expected Lucky titles while farming `targetCount` essences. */
  expectedLuckyForTarget: number;
};

/** First level at which `getItemGrade` is ≥ 1 (High+). */
export function minGreedEligibleLevel(gItem: GItem): number {
  if (!gItem.upgrade) return Infinity;
  for (let level = 0; level <= 12; level++) {
    if (getItemGrade(gItem, level) >= 1) return level;
  }
  return Infinity;
}

export function scrollGradeFromKey(scrollKey: GreedScrollKey): number {
  const idx = UPGRADE_SCROLL_KEYS.indexOf(scrollKey);
  return idx >= 0 ? idx : 0;
}

/**
 * Expected gold / attempts to farm Essence of Greed at one fixed upgrade step.
 * Assumes each attempt consumes a fresh copy at `level` (fail destroys; success
 * upgrades away from the farm level) plus the scroll/offering.
 */
export function planGreedFarm(input: GreedFarmInput): GreedFarmResult {
  const level = Math.max(0, Math.min(12, Math.floor(input.level)));
  const toLevel = level + 1;
  const grade = getItemGrade(input.gItem, level);
  const minEligibleLevel = minGreedEligibleLevel(input.gItem);
  const targetCount = Math.max(1, Math.floor(input.targetCount ?? 1));

  const scrollGrade = scrollGradeFromKey(input.scrollKey);
  const scrollKey = scrollKeyForUpgrade(scrollGrade) ?? input.scrollKey;
  const offeringKey = offeringKeyFromGrade(input.offering);

  const scrollUnit = unitPrice(input.prices, scrollKey);
  const offeringUnit = offeringKey ? unitPrice(input.prices, offeringKey) : 0;
  const itemUnit =
    typeof input.itemUnit === "number" && Number.isFinite(input.itemUnit) && input.itemUnit >= 0
      ? input.itemUnit
      : Infinity;

  let chance = 0;
  if (input.gItem.upgrade && grade <= scrollGrade) {
    const lookup = (name: ItemKey) => (name === input.itemKey ? input.gItem : undefined);
    const raw = getUpgradeChance(
      lookup,
      { name: input.itemKey, level },
      scrollGrade,
      input.offering,
      input.tables,
    );
    chance = raw.chance;
  }
  const successRate = input.luckySlot ? applyLuckySlotChance(chance) : chance;

  // Greed/Lucky title edge buckets key off the game-visible chance string.
  const edge = edgeBucketOdds(chance);
  const eligible = grade >= 1 && chance > 0 && chance < 1;
  const greedPerAttempt = eligible ? edge.greedPerAttempt : 0;
  const luckyPerAttempt = eligible ? edge.luckyPerAttempt : 0;

  const attemptCost = itemUnit + scrollUnit + offeringUnit;
  const attemptsPerGreed =
    greedPerAttempt > 0 && Number.isFinite(greedPerAttempt) ? 1 / greedPerAttempt : Infinity;
  const goldPerGreed =
    Number.isFinite(attemptCost) && Number.isFinite(attemptsPerGreed)
      ? attemptCost * attemptsPerGreed
      : Infinity;
  const attemptsForTarget = Number.isFinite(attemptsPerGreed)
    ? attemptsPerGreed * targetCount
    : Infinity;
  const goldForTarget = Number.isFinite(goldPerGreed) ? goldPerGreed * targetCount : Infinity;
  const expectedLuckyForTarget =
    greedPerAttempt > 0 && Number.isFinite(attemptsForTarget)
      ? luckyPerAttempt * attemptsForTarget
      : 0;

  return {
    level,
    toLevel,
    grade,
    eligible,
    minEligibleLevel,
    chance,
    successRate,
    greedPerAttempt,
    luckyPerAttempt,
    scrollKey,
    offeringKey,
    itemUnit,
    scrollUnit,
    offeringUnit,
    attemptCost,
    attemptsPerGreed,
    goldPerGreed,
    targetCount,
    goldForTarget,
    attemptsForTarget,
    expectedLuckyForTarget,
  };
}

export type GreedScrollCompareRow = {
  scrollKey: GreedScrollKey;
  offering: OfferingChoice;
  result: GreedFarmResult;
};

/** Compare scroll0–3 (and optional offerings) at one level; cheapest gold/greed first. */
export function compareGreedKits(args: {
  gItem: GItem;
  itemKey: ItemKey;
  level: number;
  itemUnit: number;
  prices: PriceTable;
  luckySlot?: boolean;
  tables?: ChanceTables;
  offerings?: OfferingChoice[];
  maxScrollGrade?: number;
}): GreedScrollCompareRow[] {
  const offerings = args.offerings ?? [null];
  const maxScroll = Math.min(3, args.maxScrollGrade ?? 3);
  const minScroll = getItemGrade(args.gItem, args.level);
  const rows: GreedScrollCompareRow[] = [];
  for (let sg = minScroll; sg <= maxScroll; sg++) {
    const scrollKey = scrollKeyForUpgrade(sg);
    if (!scrollKey) continue;
    for (const offering of offerings) {
      const result = planGreedFarm({
        gItem: args.gItem,
        itemKey: args.itemKey,
        level: args.level,
        scrollKey,
        offering,
        itemUnit: args.itemUnit,
        prices: args.prices,
        luckySlot: args.luckySlot,
        tables: args.tables,
        targetCount: 1,
      });
      if (!result.eligible) continue;
      rows.push({ scrollKey, offering, result });
    }
  }
  rows.sort((a, b) => a.result.goldPerGreed - b.result.goldPerGreed);
  return rows;
}
