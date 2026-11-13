import type { ItemKey } from "typed-adventureland";

import type { BuySellItemPrices } from "./merchantTypes";

export type MarketSortKey =
  | "name"
  | "buyCount"
  | "buyQty"
  | "buyMin"
  | "buyMax"
  | "buyAvg"
  | "sellCount"
  | "sellQty"
  | "sellMin"
  | "sellMax"
  | "sellAvg";

export type MarketSortDirection = "asc" | "desc";

export type MarketSortConfig = {
  key: MarketSortKey;
  direction: MarketSortDirection;
};

export type MarketSortRow = {
  itemName: ItemKey;
  title: string;
  data?: string;
  level: number;
  prices: BuySellItemPrices;
};

export const DEFAULT_MARKET_SORT: MarketSortConfig = {
  key: "name",
  direction: "asc",
};

/** First click on price/count columns goes high→low (browse expensive listings). */
export function defaultDirectionFor(key: MarketSortKey): MarketSortDirection {
  return key === "name" ? "asc" : "desc";
}

export function nextMarketSort(current: MarketSortConfig, key: MarketSortKey): MarketSortConfig {
  if (current.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: defaultDirectionFor(key) };
}

function merchantCount(side: BuySellItemPrices["buying"]): number {
  return Object.keys(side.merchants).length;
}

function priceOrNull(price: number, count: number): number | null {
  return count > 0 ? price : null;
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: MarketSortDirection,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const delta = a - b;
  return direction === "asc" ? delta : -delta;
}

function nameTieBreak(a: MarketSortRow, b: MarketSortRow): number {
  return (
    a.itemName.localeCompare(b.itemName) ||
    (a.data ?? "").localeCompare(b.data ?? "") ||
    a.title.localeCompare(b.title) ||
    a.level - b.level
  );
}

function sortValue(row: MarketSortRow, key: MarketSortKey): number | null {
  const buyCount = merchantCount(row.prices.buying);
  const sellCount = merchantCount(row.prices.selling);

  switch (key) {
    case "name":
      return null;
    case "buyCount":
      return buyCount;
    case "buyQty":
      return buyCount > 0 ? row.prices.buying.goldQty || row.prices.buying.amount : null;
    case "buyMin":
      return priceOrNull(row.prices.buying.minPrice.price, buyCount);
    case "buyMax":
      return priceOrNull(row.prices.buying.maxPrice.price, buyCount);
    case "buyAvg":
      return priceOrNull(row.prices.buying.avgPrice, buyCount);
    case "sellCount":
      return sellCount;
    case "sellQty":
      return sellCount > 0 ? row.prices.selling.goldQty || row.prices.selling.amount : null;
    case "sellMin":
      return priceOrNull(row.prices.selling.minPrice.price, sellCount);
    case "sellMax":
      return priceOrNull(row.prices.selling.maxPrice.price, sellCount);
    case "sellAvg":
      return priceOrNull(row.prices.selling.avgPrice, sellCount);
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function compareMarketRows(
  a: MarketSortRow,
  b: MarketSortRow,
  config: MarketSortConfig,
): number {
  if (config.key === "name") {
    const nameCmp = nameTieBreak(a, b);
    return config.direction === "asc" ? nameCmp : -nameCmp;
  }

  const primary = compareNullableNumber(
    sortValue(a, config.key),
    sortValue(b, config.key),
    config.direction,
  );
  return primary || nameTieBreak(a, b);
}

export function sortMarketRows<T extends MarketSortRow>(rows: T[], config: MarketSortConfig): T[] {
  return [...rows].sort((a, b) => compareMarketRows(a, b, config));
}
