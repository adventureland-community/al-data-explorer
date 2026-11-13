import type { GData, ItemKey } from "typed-adventureland";

import { instanceVariantKey } from "../gameData/itemInstanceData";
import {
  buildItemUpgradeCostRange,
  itemUpgradeMode,
  type ItemUpgradeCostRange,
} from "../gameData/itemUpgradeSnapshot";
import { calculateItemNpcSellValue } from "../gameData/itemSellValue";
import type { ItemsByNameTitleLevel } from "./merchantTypes";
import type { WantTradeSides } from "./marketOfferRows";

const PLAIN_VARIANT = instanceVariantKey({});

/**
 * Trade-stand "parking" asks are listed around 100G (often slightly under so
 * `abbreviateNumber` still shows "100G"). Rarely real sell prices.
 */
export const PARKING_GOLD = 99_000_000_000;

export function isParkingGoldPrice(price: number): boolean {
  const n = typeof price === "number" ? price : Number(price);
  return Number.isFinite(n) && n >= PARKING_GOLD;
}

/** Best ask ignoring parking placeholders; falls back to first row if all park. */
export function leadAskPrice(rows: { price: number }[]): number | undefined {
  for (const row of rows) {
    if (!isParkingGoldPrice(row.price)) return row.price;
  }
  return rows[0]?.price;
}

export type GoldVsBest = {
  /** Absolute delta vs best (bid: ≤0; ask: ≥0). */
  diff: number;
  /** Percent of best. */
  pct: number;
  isBest: boolean;
};

export type GoldEstimateSource = "market-ask" | "market-bid" | "calc" | "npc" | "catalog";

export type GoldEstimate = {
  gold: number;
  source: GoldEstimateSource;
};

export type BarterGoldCompare = {
  give: GoldEstimate;
  receive: GoldEstimate;
  /** Visitor net: value of what you get − value of what you give. */
  diff: number;
  pct: number | null;
};

/** Per-side market quotes (either side may be missing). */
export type BarterMarketSides = {
  give?: GoldEstimate;
  receive?: GoldEstimate;
  /** Present only when both sides have a live market quote. */
  compare: BarterGoldCompare | null;
};

/** Market-only and/or calc-only sides for a barter row. */
export type BarterValueSplit = {
  market: BarterMarketSides;
  calc: BarterGoldCompare | null;
};

export type ItemRef = {
  name: string;
  level?: number;
  q?: number;
  p?: string;
  data?: string;
};

export type ItemCalcRange =
  | (ItemUpgradeCostRange & { kind: "upgrade-path" })
  | { kind: "npc"; low: number; high: number };

function positivePrice(n: number | undefined): number | undefined {
  if (typeof n === "number" && Number.isFinite(n) && n > 0) return n;
  return undefined;
}

function levelBucket(
  market: ItemsByNameTitleLevel,
  name: string,
  level: number,
  p?: string,
  data?: string,
) {
  const byVariant = market[name as ItemKey];
  if (!byVariant) return undefined;
  const variant = instanceVariantKey({ p, data });
  return byVariant[variant]?.[level] ?? byVariant[PLAIN_VARIANT]?.[level];
}

function chanceTablesFromG(G: GData) {
  const gAny = G as GData & {
    upgrades?: Record<number, Record<number, number>>;
    compounds?: Record<number, Record<number, number>>;
  };
  if (!gAny.upgrades && !gAny.compounds) return undefined;
  return { upgrades: gAny.upgrades, compounds: gAny.compounds };
}

function formatCompact(n: number): string {
  const SI = ["", "k", "M", "G", "T"];
  const tier = (Math.log10(Math.abs(n)) / 3) | 0;
  if (tier === 0) return String(Math.round(n));
  const suffix = SI[Math.min(tier, SI.length - 1)] ?? "";
  const scaled = n / 10 ** (Math.min(tier, SI.length - 1) * 3);
  const rounded = Math.round(scaled * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}${suffix}` : `${rounded.toFixed(1)}${suffix}`;
}

/**
 * Cheapest live stand ask for one unit (replacement cost).
 * Skips ≥~100G parking placeholders so barters / EV don't treat park as price.
 */
export function marketUnitAsk(market: ItemsByNameTitleLevel, item: ItemRef): number | undefined {
  const bucket = levelBucket(market, item.name, item.level ?? 0, item.p, item.data);
  if (!bucket?.selling) return undefined;

  let best: number | undefined;
  for (const entry of Object.values(bucket.selling.merchants)) {
    for (const slot of entry.items) {
      const price = positivePrice(slot.price);
      if (price == null || isParkingGoldPrice(price)) continue;
      if (best == null || price < best) best = price;
    }
  }
  if (best != null) return best;

  const min = positivePrice(bucket.selling.minPrice?.price);
  if (min != null && !isParkingGoldPrice(min)) return min;
  return undefined;
}

/**
 * Highest live stand bid for one unit.
 * Ignores parking-tier gold the same way asks do.
 */
export function marketUnitBid(market: ItemsByNameTitleLevel, item: ItemRef): number | undefined {
  const bucket = levelBucket(market, item.name, item.level ?? 0, item.p, item.data);
  if (!bucket?.buying) return undefined;

  let best: number | undefined;
  for (const entry of Object.values(bucket.buying.merchants)) {
    for (const slot of entry.items) {
      const price = positivePrice(slot.price);
      if (price == null || isParkingGoldPrice(price)) continue;
      if (best == null || price > best) best = price;
    }
  }
  if (best != null) return best;

  const max = positivePrice(bucket.buying.maxPrice?.price);
  if (max != null && !isParkingGoldPrice(max)) return max;
  return undefined;
}

/**
 * NPC calculated sell value for one unit (`calculate_item_value` formula).
 */
export function itemNpcUnitGold(item: ItemRef, G: GData | undefined): number | undefined {
  if (!G) return undefined;
  const gItem = G.items[item.name as ItemKey];
  const value = calculateItemNpcSellValue({ name: item.name, level: item.level ?? 0 }, gItem, G);
  return positivePrice(value);
}

/** Midpoint of a calc range (or the single point). */
export function itemCalcMidGold(range: { low: number; high: number }): number {
  return (range.low + range.high) / 2;
}

/**
 * Upgrade/compound expected-cost range (Cheapest … Fewest), else NPC sell value as a point.
 */
export function itemCalcUnitRange(
  item: ItemRef,
  args: { G?: GData; market?: ItemsByNameTitleLevel },
): ItemCalcRange | undefined {
  const { G, market } = args;
  if (!G) return undefined;
  const gItem = G.items[item.name as ItemKey];
  if (!gItem) return undefined;

  const level = item.level ?? 0;
  if (itemUpgradeMode(gItem) && level >= 1) {
    const range = buildItemUpgradeCostRange({
      itemKey: item.name as ItemKey,
      gItem,
      level,
      items: G.items,
      market,
      tables: chanceTablesFromG(G),
      snappy: true,
    });
    if (range) return { kind: "upgrade-path", ...range };
  }

  const npc = itemNpcUnitGold(item, G);
  if (npc == null) return undefined;
  return { kind: "npc", low: npc, high: npc };
}

/** Format low–high (or a single value when nearly equal). */
export function formatCalcGoldRange(low: number, high: number): string {
  if (Math.abs(high - low) / Math.max(high, low, 1) < 0.02) {
    return formatCompact(low);
  }
  return `${formatCompact(low)}–${formatCompact(high)}`;
}

export function calcRangeLabel(range: ItemCalcRange): string {
  const body = formatCalcGoldRange(range.low, range.high);
  if (range.kind === "upgrade-path") {
    return range.mode === "compound" ? `compound ${body}` : `upgrade ${body}`;
  }
  return `npc ${body}`;
}

export function calcRangeTitle(range: ItemCalcRange): string {
  if (range.kind === "npc") {
    return `NPC sell value ${range.low.toLocaleString()}`;
  }
  const parts = [
    `Cheapest ${range.cheapest != null ? range.cheapest.toLocaleString() : "—"}`,
    `Fewest copies ${range.fewest != null ? range.fewest.toLocaleString() : "—"}`,
    `to +${range.targetLevel}`,
  ];
  return parts.join(" · ");
}

/** Live market ask/bid only (skips parking). */
export function estimateMarketItemGold(
  item: ItemRef,
  args: { market?: ItemsByNameTitleLevel },
): GoldEstimate | undefined {
  const qty = item.q != null && item.q > 0 ? item.q : 1;
  const { market } = args;
  if (!market) return undefined;
  const ask = marketUnitAsk(market, item);
  if (ask != null) return { gold: ask * qty, source: "market-ask" };
  const bid = marketUnitBid(market, item);
  if (bid != null) return { gold: bid * qty, source: "market-bid" };
  return undefined;
}

/**
 * Upgrade/compound EV only. No NPC sell value, no catalog `.g`.
 * Pass `light: true` to skip (keeps expand/barter paint snappy).
 */
export function estimateCalcItemGold(
  item: ItemRef,
  args: { market?: ItemsByNameTitleLevel; G?: GData; light?: boolean },
): GoldEstimate | undefined {
  const qty = item.q != null && item.q > 0 ? item.q : 1;
  const { G, light } = args;
  if (!G || light) return undefined;

  const gItem = G.items[item.name as ItemKey];
  const level = item.level ?? 0;
  if (!gItem || !itemUpgradeMode(gItem) || level < 1) return undefined;

  const range = itemCalcUnitRange(item, args);
  if (range?.kind !== "upgrade-path") return undefined;
  return { gold: itemCalcMidGold(range) * qty, source: "calc" };
}

/**
 * Estimate gold for a stack: market ask → market bid → upgrade/compound mid.
 * Pass `light: true` to skip upgrade/compound EV (keeps expand/barter UI snappy).
 */
export function estimateItemGold(
  item: ItemRef,
  args: { market?: ItemsByNameTitleLevel; G?: GData; light?: boolean },
): GoldEstimate | undefined {
  return estimateMarketItemGold(item, args) ?? estimateCalcItemGold(item, args);
}

/** Diff and % vs the panel's best bid (max) or ask (min). */
export function goldVsBest(price: number, best: number): GoldVsBest | null {
  if (!Number.isFinite(price) || !Number.isFinite(best) || best <= 0) return null;
  const diff = price - best;
  return {
    diff,
    pct: (diff / best) * 100,
    isBest: Math.abs(diff) < 1e-9,
  };
}

function pairBarter(
  give: GoldEstimate | undefined,
  receive: GoldEstimate | undefined,
): BarterGoldCompare | null {
  if (!give || !receive) return null;
  const diff = give.gold - receive.gold;
  const pct = receive.gold > 0 ? (diff / receive.gold) * 100 : null;
  return { give, receive, diff, pct };
}

/**
 * Value both sides of an x:y barter.
 * WantTradeSides: merchant gives `give`, wants `receive`.
 * Visitor pays `receive`, gets `give` → net = giveGold − receiveGold.
 */
export function barterGoldCompare(
  sides: WantTradeSides,
  args: { market?: ItemsByNameTitleLevel; G?: GData; light?: boolean },
): BarterGoldCompare | null {
  return pairBarter(estimateItemGold(sides.give, args), estimateItemGold(sides.receive, args));
}

/** Split market (actual) vs calc estimates for a barter. */
export function barterValueSplit(
  sides: WantTradeSides,
  args: { market?: ItemsByNameTitleLevel; G?: GData; light?: boolean },
): BarterValueSplit {
  const marketGive = estimateMarketItemGold(sides.give, args);
  const marketReceive = estimateMarketItemGold(sides.receive, args);
  return {
    market: {
      give: marketGive,
      receive: marketReceive,
      compare: pairBarter(marketGive, marketReceive),
    },
    calc: pairBarter(
      estimateCalcItemGold(sides.give, args),
      estimateCalcItemGold(sides.receive, args),
    ),
  };
}

export function formatSignedGold(n: number): string {
  const abs = Math.abs(n);
  const body =
    abs >= 1000 ? formatCompact(abs) : abs.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n > 0) return `+${body}`;
  if (n < 0) return `−${body}`;
  return body;
}

export function formatPct(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  const body =
    Number.isInteger(rounded) || Math.abs(rounded) >= 100
      ? String(Math.round(rounded))
      : rounded.toFixed(1);
  if (rounded > 0) return `+${body}%`;
  if (rounded < 0) return `−${body.replace("-", "")}%`;
  return "0%";
}

export function estimateSourceLabel(source: GoldEstimateSource): string {
  switch (source) {
    case "market-ask":
      return "market ask";
    case "market-bid":
      return "market bid";
    case "calc":
      return "upgrade/compound calc";
    case "npc":
      return "NPC sell value";
    case "catalog":
      return "catalog g";
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}
