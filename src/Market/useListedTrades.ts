import { useCallback, useEffect, useMemo, useState } from "react";

import { getAllTrades } from "../Bank/getTrades";
import type { OwnerTrades } from "../Trades/tradeTypes";
import { flattenTrades, listingKey, type TradeRow } from "../Trades/tradeViewModel";

type ListedTradesCache = {
  timestamp: string;
  owners: OwnerTrades[];
};

/** Session cache for Earth ALData `/trades` (player-posted WTS/WTB, not inventory bank). */
const CACHE_KEY = "listed-trades";

function rowsForItem(
  rows: TradeRow[],
  item: { name: string; level?: number; p?: string },
): TradeRow[] {
  const key = listingKey({
    name: item.name,
    level: item.level,
    p: item.p,
  });
  return rows.filter((row) => listingKey(row.listing) === key);
}

/**
 * Player-posted trades from Earth ALData `/trades`.
 * These are listings a player wants to do — they may or may not be on a live merchant stand.
 */
export function useListedTrades() {
  const [owners, setOwners] = useState<OwnerTrades[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | undefined>(undefined);

  const refresh = useCallback(async () => {
    const data = await getAllTrades();
    setOwners(data);
    const now = new Date();
    setLastRefresh(now);
    const cache: ListedTradesCache = {
      timestamp: now.toISOString(),
      owners: data,
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }, []);

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ListedTradesCache;
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
