import { GItem, ItemKey } from "typed-adventureland";

import { itemMatchesClasses } from "./itemMeta";
import { GItems } from "./types";

export type ItemFilterOptions = {
  search?: string;
  types?: string[];
  wtypes?: string[];
  tiers?: number[];
};

export type ItemSortKey = "name" | "type" | "tier" | "g";

type ItemSetStats = Record<string, Record<string, unknown>>;

export type ItemQuery = {
  search?: string;
  types?: string[];
  wtypes?: string[];
  tiers?: number[];
  /** Class restrictions — unrestricted items always match. */
  classes?: string[];
  sort?: ItemSortKey;
  /** Match upgrade/compound/set attribute names (gear / picker). */
  matchAttributes?: boolean;
  sets?: ItemSetStats;
  filterItem?: (itemKey: ItemKey, gItem: GItem) => boolean;
};

/** Single-term match: key, name, type, wtype; optionally attrs/sets. */
export function itemMatchesSearch(
  itemKey: string,
  gItem: GItem,
  searchTerm: string,
  options: { matchAttributes?: boolean; sets?: ItemSetStats } = {},
): boolean {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  if (itemKey.toLowerCase().includes(term)) return true;
  if (gItem.name.toLowerCase().includes(term)) return true;
  if (gItem.type?.toLowerCase().includes(term)) return true;
  if (gItem.wtype?.toLowerCase().includes(term)) return true;

  if (!options.matchAttributes) return false;

  const itemAttrs = Object.keys({
    ...gItem,
    ...(gItem.upgrade as object | undefined),
    ...(gItem.compound as object | undefined),
  }).filter((key) => key.toLowerCase().includes(term));
  if (itemAttrs.length > 0) return true;

  if (gItem.set && options.sets?.[gItem.set]) {
    for (const setStats of Object.values(options.sets[gItem.set])) {
      if (Object.keys(setStats ?? {}).some((key) => key.toLowerCase().includes(term))) {
        return true;
      }
    }
  }

  return false;
}

function itemMatchesAnyTermFast(
  itemKey: string,
  gItem: GItem,
  terms: string[],
  options: { matchAttributes?: boolean; sets?: ItemSetStats },
): boolean {
  if (terms.length === 0) return true;

  const keyLower = itemKey.toLowerCase();
  const nameLower = gItem.name.toLowerCase();
  const typeLower = gItem.type?.toLowerCase() ?? "";
  const wtypeLower = gItem.wtype?.toLowerCase() ?? "";

  for (const term of terms) {
    if (
      keyLower.includes(term) ||
      nameLower.includes(term) ||
      typeLower.includes(term) ||
      wtypeLower.includes(term)
    ) {
      return true;
    }
  }

  if (!options.matchAttributes) return false;
  return terms.some((term) => itemMatchesSearch(itemKey, gItem, term, options));
}

export function sortItems(
  entries: [ItemKey, GItem][],
  sort: ItemSortKey = "name",
): [ItemKey, GItem][] {
  const sorted = [...entries];
  sorted.sort(([aKey, aItem], [bKey, bItem]) => {
    switch (sort) {
      case "name":
        return aItem.name.localeCompare(bItem.name) || aKey.localeCompare(bKey);
      case "type":
        return (
          (aItem.type ?? "").localeCompare(bItem.type ?? "") || aItem.name.localeCompare(bItem.name)
        );
      case "tier":
        return (aItem.tier ?? 0) - (bItem.tier ?? 0) || aItem.name.localeCompare(bItem.name);
      case "g":
        return (aItem.g ?? 0) - (bItem.g ?? 0) || aItem.name.localeCompare(bItem.name);
      default: {
        const _exhaustive: never = sort;
        return _exhaustive;
      }
    }
  });
  return sorted;
}

/**
 * Catalog query — one interface for browse facets and picker search/sort.
 * Browse: facets + search (type/wtype, no attrs). Picker: search ± attrs + filterItem.
 */
export function queryItems(items: GItems, query: ItemQuery = {}): [ItemKey, GItem][] {
  const {
    search,
    types = [],
    wtypes = [],
    tiers = [],
    classes = [],
    sort = "name",
    matchAttributes = false,
    sets,
    filterItem,
  } = query;
  const searchLower = search?.trim().toLowerCase();
  const terms = searchLower ? searchLower.split(/[\s,]+/).filter(Boolean) : [];
  const typeSet = types.length > 0 ? new Set(types) : null;
  const wtypeSet = wtypes.length > 0 ? new Set(wtypes) : null;
  const tierSet = tiers.length > 0 ? new Set(tiers) : null;
  const matchOpts = { matchAttributes, sets };

  const filtered = Object.entries(items).filter(([itemKey, gItem]) => {
    if ((gItem as { ignore?: boolean }).ignore) return false;
    if (filterItem && !filterItem(itemKey as ItemKey, gItem)) return false;
    if (typeSet && !typeSet.has(gItem.type)) return false;
    if (wtypeSet && (!gItem.wtype || !wtypeSet.has(gItem.wtype))) return false;
    if (tierSet && !tierSet.has(gItem.tier ?? 0)) return false;
    if (!itemMatchesClasses(gItem, classes)) return false;
    return itemMatchesAnyTermFast(itemKey, gItem, terms, matchOpts);
  }) as [ItemKey, GItem][];

  return sortItems(filtered, sort);
}

/** @deprecated Prefer queryItems — kept for call-site migration. */
export function filterItemsBySearch(
  items: GItems,
  options: ItemFilterOptions = {},
): [ItemKey, GItem][] {
  return queryItems(items, {
    search: options.search,
    types: options.types,
    wtypes: options.wtypes,
    tiers: options.tiers,
    sort: "name",
    matchAttributes: false,
  });
}

export function getItemTypes(items: GItems): string[] {
  const types = new Set<string>();
  for (const gItem of Object.values(items)) {
    if (gItem.type) types.add(gItem.type);
  }
  return Array.from(types).sort();
}

export function getItemTiers(items: GItems): number[] {
  const tiers = new Set<number>();
  for (const gItem of Object.values(items)) {
    if (gItem.tier != null) tiers.add(gItem.tier);
  }
  return Array.from(tiers).sort((a, b) => a - b);
}

export function getItemWtypes(items: GItems): string[] {
  const wtypes = new Set<string>();
  for (const gItem of Object.values(items)) {
    if (gItem.wtype) wtypes.add(gItem.wtype);
  }
  return Array.from(wtypes).sort();
}

/** Order item keys by tier (asc), then name — for matrix / bulk-add. */
export function sortItemKeysByTier(keys: ItemKey[], items: GItems): ItemKey[] {
  const entries = keys
    .filter((key) => items[key])
    .map((key) => [key, items[key]] as [ItemKey, GItem]);
  return sortItems(entries, "tier").map(([key]) => key);
}

/** @deprecated Prefer itemMatchesSearch / queryItems. */
export function matchesItemSearch(
  itemKey: string,
  gItem: GItem,
  search: string,
  sets?: ItemSetStats,
): boolean {
  const searchTerm = search.trim().toLowerCase();
  if (!searchTerm) return true;
  return itemMatchesSearch(itemKey, gItem, searchTerm, {
    matchAttributes: true,
    sets,
  });
}
