import { useCallback, useEffect, useMemo, useState } from "react";

import { getAllTrades } from "../Bank/getTrades";
import type { OwnerTrades } from "../Trades/tradeTypes";
import { flattenTrades, listingKey, type TradeRow } from "../Trades/tradeViewModel";

type BankTradesCache = {
  timestamp: string;
  owners: OwnerTrades[];
};

const CACHE_KEY = "bank-trades";

function rowsForItem(
  rows: TradeRow[],
  item: { name: string; level?: number; p?: string },
): TradeRow[] {
  const key = listingKey({
    name: item.name,
    level: item.level,
    p: item.p,
  });
  // Exact key first; also include wildcards where listing omits level/p.
  return rows.filter((row) => {
    if (row.listing.name !== item.name) return false;
    if (item.p && row.listing.p !== undefined && row.listing.p !== item.p) return false;
    if (
      item.level !== undefined &&
      row.listing.level !== undefined &&
      row.listing.level !== item.level
    ) {
      return false;
    }
    // Prefer exact listingKey matches when both sides specify level/p.
    if (row.listing.level !== undefined && row.listing.p !== undefined) {
      return listingKey(row.listing) === key || listingKey(row.listing) === listingKey(item);
    }
    return true;
  });
}

export function useBankTrades() {
  const [owners, setOwners] = useState<OwnerTrades[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | undefined>(undefined);

  const refresh = useCallback(async () => {
    const data = await getAllTrades();
    setOwners(data);
    const now = new Date();
    setLastRefresh(now);
    const cache: BankTradesCache = {
      timestamp: now.toISOString(),
      owners: data,
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }, []);

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as BankTradesCache;
        setOwners(parsed.owners ?? []);
        setLastRefresh(new Date(parsed.timestamp));
        return;
      } catch {
        // fall through to refresh
      }
    }
    refresh();
  }, [refresh]);

  const allRows = useMemo(() => flattenTrades(owners), [owners]);

  const getRowsForItem = useCallback(
    (item: { name: string; level?: number; p?: string }) => rowsForItem(allRows, item),
    [allRows],
  );

  return {
    owners,
    allRows,
    lastRefresh,
    refresh,
    getRowsForItem,
  };
}
