import { GItem, ItemKey } from "typed-adventureland";

import { instanceVariantKey } from "./itemInstanceData";
import { GItems, NpcShopSource } from "./types";

const PLAIN_VARIANT = instanceVariantKey({});

/** Unit gold price keyed by item id (scrolls, offerings, base item). */
export type PriceTable = Record<string, number>;

export const UPGRADE_SCROLL_KEYS = ["scroll0", "scroll1", "scroll2", "scroll3", "scroll4"] as const;
export const COMPOUND_SCROLL_KEYS = ["cscroll0", "cscroll1", "cscroll2", "cscroll3"] as const;
export const OFFERING_KEYS = [null, "offeringp", "offering", "offeringx"] as const;
/** Ingot/nugget polish materials for Shiny (keep in sync with `POLISH_MATERIALS`). */
export const POLISH_MATERIAL_KEYS = [
  "goldnugget",
  "bronzeingot",
  "platinumnugget",
  "goldingot",
  "platinumingot",
] as const;
/**
 * Proxy pscroll for grace-technique costing (all catalog pscrolls share `.g`).
 * Server consumes `needed[itemGrade]` of any compatible property scroll.
 */
export const STAT_SCROLL_PROXY_KEY = "strscroll" as const;
/** Qty of pscroll consumed per grade when applying a property scroll (server `needed`). */
export const PSCROLL_QTY_BY_GRADE = [1, 10, 100, 1000, 9999, 9999, 9999] as const;

export type OfferingKeyName = Exclude<typeof OFFERING_KEYS[number], null>;

const DEFAULT_MATERIAL_KEYS: ItemKey[] = [
  ...UPGRADE_SCROLL_KEYS,
  ...COMPOUND_SCROLL_KEYS,
  "offeringp",
  "offering",
  "offeringx",
  STAT_SCROLL_PROXY_KEY,
  "helmet",
  ...POLISH_MATERIAL_KEYS,
];

/** Property-scroll qty required for an item of the given upgrade grade. */
export function pscrollQtyForGrade(grade: number): number {
  const idx = Math.max(0, Math.min(Math.floor(grade), PSCROLL_QTY_BY_GRADE.length - 1));
  return PSCROLL_QTY_BY_GRADE[idx];
}

/**
 * Pastebin primstacking spend: one stat-scroll click is +1 grace (same as two +0.5
 * Primlings) and spends one Primling plus `pscrollQtyForGrade` property scrolls.
 * Used when that pair is no more expensive than two normal Primlings.
 */
export type PrimstackingSpend = {
  statClicks: number;
  normalPrimes: number;
  /** Property scrolls per stat click (0 when unused). */
  statScrollEach: number;
  cost: number;
};

export function primstackingSpend(args: {
  units: number;
  itemGrade: number;
  primlingUnit: number;
  statScrollUnit: number;
  canStat: boolean;
}): PrimstackingSpend {
  const units = args.units || 0;
  const single = args.primlingUnit;
  let statClicks = 0;
  let normal = units;
  let each = 0;
  const scroll = args.statScrollUnit;
  if (
    args.canStat &&
    units >= 2 &&
    Number.isFinite(single) &&
    Number.isFinite(scroll) &&
    scroll >= 0
  ) {
    each = pscrollQtyForGrade(args.itemGrade);
    const pair = single + each * scroll;
    if (pair <= single * 2) {
      statClicks = Math.floor(units / 2);
      normal = units % 2;
    } else {
      each = 0;
    }
  }
  let cost = 0;
  if (units) {
    if (!Number.isFinite(single)) cost = Infinity;
    else cost = statClicks * (single + each * scroll) + normal * single;
  }
  return {
    statClicks,
    normalPrimes: normal,
    statScrollEach: statClicks ? each : 0,
    cost,
  };
}

/** Vendor / catalog `.g` defaults for calculator materials. */
export function defaultPriceTable(items: GItems, baseItemKey?: ItemKey): PriceTable {
  const prices: PriceTable = {};
  for (const key of DEFAULT_MATERIAL_KEYS) {
    const g = items[key]?.g;
    if (typeof g === "number" && g > 0) prices[key] = g;
  }
  if (baseItemKey) {
    const g = items[baseItemKey]?.g;
    if (typeof g === "number" && g > 0) prices[baseItemKey] = g;
  }
  return prices;
}

export type MarketPriceIndex = {
  [name: string]:
    | {
        [title: string]:
          | Array<
              | {
                  selling?: { minPrice?: { price?: number } };
                }
              | undefined
            >
          | undefined;
      }
    | undefined;
};

/**
 * True when an NPC gold shop stocks the item (not token/shell catalogs).
 * Catalog `.g` alone is not a buy price — many drop mats have `.g` but no shelf.
 */
export function isGoldVendorBuyable(
  itemKey: string,
  shopsByItem: Map<ItemKey, NpcShopSource[]> | undefined,
  items: GItems | undefined,
): boolean {
  if (!shopsByItem || !items) return false;
  const item = items[itemKey as ItemKey];
  if (!item) return false;
  if (item.cash != null && Number.isFinite(item.cash)) return false;
  const { g } = item;
  if (typeof g !== "number" || !(g > 0)) return false;
  const shops = shopsByItem.get(itemKey as ItemKey);
  if (!shops?.length) return false;
  for (const shop of shops) {
    if (shop.token == null || shop.token === "") return true;
  }
  return false;
}

/**
 * Cheapest player-merchant *sell* listing for an untitled item at `level`
 * (what you pay to buy from them). Returns undefined when none.
 */
export function marketSellMinPrice(
  market: MarketPriceIndex,
  itemKey: string,
  level = 0,
): number | undefined {
  const byTitle = market[itemKey];
  if (!byTitle) return undefined;
  // Prefer current variant key (`\0`); keep "" / "undefined" for older fixtures/caches.
  const untitled = byTitle[PLAIN_VARIANT] ?? byTitle[""] ?? byTitle["undefined" as never];
  const atLevel = untitled?.[level];
  const price = atLevel?.selling?.minPrice?.price;
  if (typeof price === "number" && Number.isFinite(price) && price > 0) return price;
  return undefined;
}

/**
 * Fill `prices` keys from market sell mins and vendor `.g`.
 *
 * Default: only fills missing keys (market, then catalog `.g`).
 * With `preferMarketForNonVendor`, non-vendor keys take the market min even when a
 * catalog `.g` was already seeded (caller still applies overrides last).
 */
export function seedMissingPrices(args: {
  prices: PriceTable;
  keys: string[];
  items: GItems;
  market?: MarketPriceIndex;
  shopsByItem?: Map<ItemKey, NpcShopSource[]>;
  preferMarketForNonVendor?: boolean;
}): PriceTable {
  const out: PriceTable = { ...args.prices };
  const preferMarket = Boolean(args.preferMarketForNonVendor);
  for (const key of args.keys) {
    const market = args.market ? marketSellMinPrice(args.market, key) : undefined;
    const vendorBuyable = isGoldVendorBuyable(key, args.shopsByItem, args.items);
    const catalogG = args.items[key as ItemKey]?.g;
    const hasCatalogG = typeof catalogG === "number" && catalogG > 0;
    if (preferMarket && !vendorBuyable && market != null) {
      out[key] = market;
      continue;
    }
    if (typeof out[key] === "number" && Number.isFinite(out[key])) continue;
    // Gold NPC shelf → catalog `.g` (what you pay the vendor), not player market.
    if (vendorBuyable && hasCatalogG) {
      out[key] = catalogG;
      continue;
    }
    // Toggle off: keep catalog `.g` so the market line stays a hint / Use market target.
    if (!preferMarket && hasCatalogG) {
      out[key] = catalogG;
      continue;
    }
    if (market != null) {
      out[key] = market;
      continue;
    }
    if (hasCatalogG) out[key] = catalogG;
  }
  return out;
}

export function unitPrice(prices: PriceTable, key: string | null): number {
  if (key == null) return 0;
  const n = prices[key];
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : Infinity;
}

/**
 * Gold cost of one pscroll+offering grace application (+1 item grace on server).
 * `offeringUnit` is the chosen offering's unit price (any offering works).
 */
export function statScrollGraceUnitCost(
  prices: PriceTable,
  itemGrade: number,
  offeringUnit: number,
): number {
  const qty = pscrollQtyForGrade(itemGrade);
  const scroll = unitPrice(prices, STAT_SCROLL_PROXY_KEY);
  if (!Number.isFinite(scroll) || !Number.isFinite(offeringUnit)) return Infinity;
  return qty * scroll + offeringUnit;
}

export function offeringKeyFromGrade(offering: number | null): typeof OFFERING_KEYS[number] {
  if (offering == null) return null;
  // G.items grades: offeringp=1, offering=2, offeringx=3
  if (offering === 1) return "offeringp";
  if (offering === 2) return "offering";
  if (offering === 3) return "offeringx";
  return null;
}

/** Inverse of `offeringKeyFromGrade` (unknown keys → null). */
export function offeringGradeFromKey(key: string | null | undefined): number | null {
  if (key == null || key === "" || key === "none") return null;
  if (key === "offeringp") return 1;
  if (key === "offering") return 2;
  if (key === "offeringx") return 3;
  return null;
}

export function scrollKeyForUpgrade(grade: number): typeof UPGRADE_SCROLL_KEYS[number] | null {
  return UPGRADE_SCROLL_KEYS[grade] ?? null;
}

export function scrollKeyForCompound(grade: number): typeof COMPOUND_SCROLL_KEYS[number] | null {
  return COMPOUND_SCROLL_KEYS[grade] ?? null;
}

export function itemCatalogG(item: GItem | undefined): number {
  const g = item?.g;
  return typeof g === "number" && g > 0 ? g : 0;
}
