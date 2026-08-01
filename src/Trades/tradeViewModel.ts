import { ItemInfo, ItemInfoPValues, ItemKey } from "typed-adventureland";

import { formatOwnerLabel } from "../Shared/ownerLabel";
import { ItemRef, OwnerTrades, TradeListing, TradeSide } from "./tradeTypes";

export type SideFilter = "all" | "wts" | "wtb";
export type TradesViewMode = "cards" | "compact" | "table";
export type GroupSortKey = "activity" | "updated" | "name";
export type TableSortKey = "updated" | "owner" | "item" | "side";

export type TradeRow = {
  owner: string;
  ownerLabel: string;
  listing: TradeListing;
  side: "WTS" | "WTB";
  tradeSide: TradeSide;
  lastUpdated?: number;
  discordName?: string;
  discordId?: string;
};

export type GroupedTradeItem = {
  key: string;
  listing: ItemRef;
  wtsCount: number;
  wtbCount: number;
  ownerCount: number;
  cheapestWts?: number;
  highestWtb?: number;
  hasBarter: boolean;
  lastUpdated?: number;
  rows: TradeRow[];
};

export type TradeOverviewItem = {
  key: string;
  listing: ItemRef;
  wtsCount: number;
  wtbCount: number;
  totalCount: number;
};

export type TradeOverviewStats = {
  totalListings: number;
  wtsCount: number;
  wtbCount: number;
  uniqueItems: number;
  uniqueOwners: number;
  topItems: TradeOverviewItem[];
};

export function listingKey(listing: ItemRef): string {
  return `${listing.name}|${listing.level ?? ""}|${listing.p ?? ""}`;
}

export function itemRefToItemInfo(item: ItemRef): ItemInfo {
  return {
    name: item.name as ItemKey,
    level: item.level,
    ...(item.p !== undefined ? { p: item.p as ItemInfoPValues } : {}),
  };
}

export function flattenTrades(owners: OwnerTrades[]): TradeRow[] {
  const rows: TradeRow[] = [];

  for (const ownerEntry of owners) {
    for (const listing of ownerEntry.listings ?? []) {
      const shared = {
        owner: ownerEntry.owner,
        ownerLabel: formatOwnerLabel(
          ownerEntry.owner,
          ownerEntry.characters,
          ownerEntry.label,
          ownerEntry.displayName,
        ),
        listing,
        lastUpdated: ownerEntry.lastUpdated,
        discordName: ownerEntry.discordName,
        discordId: ownerEntry.discordId,
      };
      if (listing.wts) {
        rows.push({
          ...shared,
          side: "WTS",
          tradeSide: listing.wts,
        });
      }
      if (listing.wtb) {
        rows.push({
          ...shared,
          side: "WTB",
          tradeSide: listing.wtb,
        });
      }
    }
  }

  return rows;
}

export function groupTradesByItem(rows: TradeRow[]): GroupedTradeItem[] {
  const map = new Map<string, GroupedTradeItem>();

  for (const row of rows) {
    const key = listingKey(row.listing);
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        listing: {
          name: row.listing.name,
          level: row.listing.level,
          p: row.listing.p,
        },
        wtsCount: 0,
        wtbCount: 0,
        ownerCount: 0,
        hasBarter: false,
        rows: [],
      };
      map.set(key, group);
    }

    group.rows.push(row);
    if (row.side === "WTS") {
      group.wtsCount += 1;
      if (row.tradeSide.price !== undefined) {
        group.cheapestWts =
          group.cheapestWts === undefined
            ? row.tradeSide.price
            : Math.min(group.cheapestWts, row.tradeSide.price);
      }
    } else {
      group.wtbCount += 1;
      if (row.tradeSide.price !== undefined) {
        group.highestWtb =
          group.highestWtb === undefined
            ? row.tradeSide.price
            : Math.max(group.highestWtb, row.tradeSide.price);
      }
    }

    if (row.tradeSide.trades && row.tradeSide.trades.length > 0) {
      group.hasBarter = true;
    }

    if (row.lastUpdated !== undefined) {
      group.lastUpdated =
        group.lastUpdated === undefined
          ? row.lastUpdated
          : Math.max(group.lastUpdated, row.lastUpdated);
    }
  }

  const groups = Array.from(map.values());
  for (const group of groups) {
    const owners = new Set<string>();
    for (const row of group.rows) {
      owners.add(row.owner);
    }
    group.ownerCount = owners.size;
  }

  return groups;
}

export function computeOverviewStats(rows: TradeRow[]): TradeOverviewStats {
  const groups = groupTradesByItem(rows);
  const owners = new Set<string>();
  let wtsCount = 0;
  let wtbCount = 0;

  for (const row of rows) {
    owners.add(row.owner);
    if (row.side === "WTS") {
      wtsCount += 1;
    } else {
      wtbCount += 1;
    }
  }

  const topItems = groups
    .map((group) => ({
      key: group.key,
      listing: group.listing,
      wtsCount: group.wtsCount,
      wtbCount: group.wtbCount,
      totalCount: group.wtsCount + group.wtbCount,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  return {
    totalListings: rows.length,
    wtsCount,
    wtbCount,
    uniqueItems: groups.length,
    uniqueOwners: owners.size,
    topItems,
  };
}

export type TradeFilters = {
  sideFilter: SideFilter;
  itemFilter: string;
  hasGoldPrice: boolean;
  hasItemTrades: boolean;
};

export function filterTradeRows(
  rows: TradeRow[],
  filters: TradeFilters,
  itemDisplayName?: (name: string) => string | undefined,
): TradeRow[] {
  const lowercaseFilter = filters.itemFilter.trim().toLowerCase();
  const searchTerms = lowercaseFilter
    ? [...lowercaseFilter.split(" "), ...lowercaseFilter.split(",")].filter(Boolean)
    : [];

  return rows.filter((row) => {
    if (filters.sideFilter === "wts" && row.side !== "WTS") {
      return false;
    }
    if (filters.sideFilter === "wtb" && row.side !== "WTB") {
      return false;
    }
    if (filters.hasGoldPrice && row.tradeSide.price === undefined) {
      return false;
    }
    if (filters.hasItemTrades && !(row.tradeSide.trades && row.tradeSide.trades.length > 0)) {
      return false;
    }

    if (searchTerms.length) {
      const displayName = itemDisplayName?.(row.listing.name);
      const names = [row.listing.name, displayName ?? ""].map((n) => n.toLowerCase());
      const matches = searchTerms.some((term) => names.some((name) => name.includes(term)));
      if (!matches) {
        return false;
      }
    }

    return true;
  });
}

export function sortGroupedItems(
  groups: GroupedTradeItem[],
  sortKey: GroupSortKey,
): GroupedTradeItem[] {
  const sorted = [...groups];
  sorted.sort((a, b) => {
    if (sortKey === "activity") {
      const aCount = a.wtsCount + a.wtbCount;
      const bCount = b.wtsCount + b.wtbCount;
      if (bCount !== aCount) return bCount - aCount;
      return a.listing.name.localeCompare(b.listing.name);
    }
    if (sortKey === "updated") {
      const aTime = a.lastUpdated ?? 0;
      const bTime = b.lastUpdated ?? 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.listing.name.localeCompare(b.listing.name);
    }
    return a.listing.name.localeCompare(b.listing.name);
  });
  return sorted;
}

export function sortTradeRows(
  rows: TradeRow[],
  sortKey: TableSortKey,
  itemDisplayName?: (name: string) => string | undefined,
): TradeRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (sortKey === "updated") {
      const aTime = a.lastUpdated ?? 0;
      const bTime = b.lastUpdated ?? 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.ownerLabel.localeCompare(b.ownerLabel);
    }
    if (sortKey === "owner") {
      const cmp = a.ownerLabel.localeCompare(b.ownerLabel);
      if (cmp !== 0) return cmp;
      return a.listing.name.localeCompare(b.listing.name);
    }
    if (sortKey === "side") {
      const cmp = a.side.localeCompare(b.side);
      if (cmp !== 0) return cmp;
      return a.listing.name.localeCompare(b.listing.name);
    }
    const aName = itemDisplayName?.(a.listing.name) ?? a.listing.name;
    const bName = itemDisplayName?.(b.listing.name) ?? b.listing.name;
    const cmp = aName.localeCompare(bName);
    if (cmp !== 0) return cmp;
    return a.ownerLabel.localeCompare(b.ownerLabel);
  });
  return sorted;
}

const TRADES_VIEW_MODE_KEY = "trades-view-mode";

export function loadTradesViewMode(): TradesViewMode {
  try {
    const stored = localStorage.getItem(TRADES_VIEW_MODE_KEY);
    if (stored === "cards" || stored === "compact" || stored === "table") {
      return stored;
    }
  } catch {
    // ignore
  }
  return "cards";
}

export function saveTradesViewMode(mode: TradesViewMode): void {
  try {
    localStorage.setItem(TRADES_VIEW_MODE_KEY, mode);
  } catch {
    // ignore
  }
}
