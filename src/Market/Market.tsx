import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { ItemInfoPValues, ItemKey } from "typed-adventureland";

import { parseInstanceVariantKey, instanceVariantKey } from "../gameData/itemInstanceData";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { MultiFilterAutocomplete } from "../Shared/MultiFilterAutocomplete";
import { QuerySearchBar } from "../Shared/QuerySearchBar";
import { StickyListLayout, StickyTableShell } from "../Shared/StickyListLayout";
import { abbreviateGold, abbreviateNumber } from "../Shared/utils";
import { getItemName, getTitleName } from "../Shared/iteminfo-util";
import { GoldOffersPanel, WantOffersPanel } from "./MarketDetailPanels";
import { buildMarketSearchSuggestions, marketRowMatchesSearch } from "./marketSearchQuery";
import { useItemCalcRange } from "./useItemCalcRange";
import {
  DEFAULT_MARKET_SORT,
  defaultDirectionFor,
  nextMarketSort,
  sortMarketRows,
  type MarketSortConfig,
  type MarketSortKey,
} from "./marketSort";
import { splitMarketOffers } from "./marketOfferRows";
import { CalcCostGlance } from "./CalcCostGlance";
import { PriceSpreadGlance } from "./PriceSpreadGlance";
import { useListedTrades } from "./useListedTrades";
import { emptyBuySellPrices, useMerchants } from "./useMerchants";
import type { BuySellItemPrices, Merchant } from "./useMerchants";
import { listingKey } from "../Trades/tradeViewModel";

function Info() {
  return (
    <Card>
      <CardContent>
        <Typography component="div">
          Stands from <a href="https://aldata.earthiverse.ca">earthiverse&apos;s aldata</a>, plus
          Earth <code>/trades</code> WTS/WTB. Gold goes under Buying/Selling. Item barters split
          into You get this / You give this; Earth rows get an Earth chip.
          <br />
          Search ops: <code>price:&gt;=1m</code>, <code>attr:armor&gt;=40</code>,{" "}
          <code>is:sell</code>. Click a column to sort. Best ask sorts cheapest-first on the first
          click. Refresh Data reloads stands and Earth.
        </Typography>
      </CardContent>
    </Card>
  );
}

function TradeItemRow({
  itemKey,
  title,
  data,
  level,
  prices,
  merchants,
  marketItems,
  listedRows,
}: {
  itemKey: ItemKey;
  title: string;
  data?: string;
  level: number;
  prices: BuySellItemPrices;
  merchants: { [id: string]: Merchant };
  marketItems: ReturnType<typeof useMerchants>["items"];
  listedRows: ReturnType<typeof useListedTrades>["allRows"];
}) {
  const G = useContext(GDataContext);
  const [showDetails, setShowDetails] = useState(false);
  /** Mount want panels after gold glance paints so expand stays responsive. */
  const [showWantPanels, setShowWantPanels] = useState(false);
  const gItem = G?.items[itemKey];

  const buyerCount = Object.keys(prices.buying.merchants).length;
  const sellerCount = Object.keys(prices.selling.merchants).length;
  const viewedItem = useMemo(
    () => ({
      name: itemKey,
      level,
      p: title || undefined,
    }),
    [itemKey, level, title],
  );

  // Cheap expand chevron: stand slots or any Earth row for this listing.
  const hasDetail =
    buyerCount > 0 ||
    sellerCount > 0 ||
    prices.wantedBy.length > 0 ||
    Object.values(prices.buying.merchants).some((m) =>
      m.items.some((it) => it.want != null && typeof it.want.name === "string"),
    ) ||
    Object.values(prices.selling.merchants).some((m) =>
      m.items.some((it) => it.want != null && typeof it.want.name === "string"),
    ) ||
    listedRows.length > 0;

  const offers = useMemo(
    () => (showDetails ? splitMarketOffers(prices, listedRows, viewedItem) : null),
    [showDetails, prices, listedRows, viewedItem],
  );

  useEffect(() => {
    if (!showDetails) {
      setShowWantPanels(false);
      return;
    }
    const raf = window.requestAnimationFrame(() => setShowWantPanels(true));
    return () => window.cancelAnimationFrame(raf);
  }, [showDetails]);

  const calcState = useItemCalcRange(
    showDetails,
    { name: itemKey, level },
    { G, market: marketItems },
  );
  const calcRange = calcState.status === "ready" ? calcState.range : undefined;
  const calcLoading = showDetails && calcState.status === "loading";

  if (!gItem) return null;

  const itemInfo = {
    name: itemKey,
    ...(title ? { p: title as ItemInfoPValues } : {}),
    ...(data ? { data } : {}),
    level,
  };

  let titleName = getTitleName(itemInfo, G);
  if (titleName) {
    titleName += " ";
  }

  const itemName = getItemName(itemKey, gItem);
  const keyLine = data ? `${itemInfo.name} · ${data}` : itemInfo.name;
  const standTradeCount = offers
    ? offers.outgoingWant.filter((r) => r.source === "stand").length +
      offers.incomingWant.filter((r) => r.source === "stand").length
    : 0;
  const earthCount = offers
    ? offers.buyGold.filter((r) => r.source === "earth").length +
      offers.sellGold.filter((r) => r.source === "earth").length +
      offers.outgoingWant.filter((r) => r.source === "earth").length +
      offers.incomingWant.filter((r) => r.source === "earth").length
    : 0;

  const buyQty = prices.buying.goldQty || prices.buying.amount;
  const sellQty = prices.selling.goldQty || prices.selling.amount;
  const buyMax = prices.buying.maxPrice.price;
  const buyMin = prices.buying.minPrice.price;
  const buyAvg = prices.buying.avgPrice;
  const sellMin = prices.selling.minPrice.price;
  const sellMax = prices.selling.maxPrice.price;
  const sellAvg = prices.selling.avgPrice;

  return (
    <>
      <TableRow
        onClick={() => hasDetail && setShowDetails(!showDetails)}
        hover
        sx={{ "& > *": { borderBottom: "unset" }, cursor: hasDetail ? "pointer" : "default" }}
      >
        <TableCell>
          <IconButton aria-label="expand row" size="small" disabled={!hasDetail}>
            {showDetails ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="td">
          <div style={{ display: "inline-block" }}>
            <ItemInstance itemInfo={itemInfo as never} />
          </div>
          <div style={{ marginLeft: "10px", display: "inline-block" }}>
            <div>
              {titleName}
              {itemName}
            </div>
            <div style={{ color: "grey" }}>{keyLine}</div>
          </div>
        </TableCell>
        <TableCell component="td">{buyerCount || ""}</TableCell>
        <TableCell component="td" title={buyQty ? buyQty.toLocaleString() : undefined}>
          {buyQty ? abbreviateNumber(buyQty) : null}
        </TableCell>
        <TableCell component="td" title={buyMax ? buyMax.toLocaleString() : undefined}>
          {buyMax ? abbreviateGold(buyMax) : null}
        </TableCell>
        <TableCell component="td" title={buyMin ? buyMin.toLocaleString() : undefined}>
          {buyMin ? abbreviateGold(buyMin) : null}
        </TableCell>
        <TableCell component="td" title={buyAvg ? buyAvg.toLocaleString() : undefined}>
          {buyAvg ? abbreviateGold(buyAvg) : null}
        </TableCell>
        <TableCell component="td">{sellerCount || ""}</TableCell>
        <TableCell component="td" title={sellQty ? sellQty.toLocaleString() : undefined}>
          {sellQty ? abbreviateNumber(sellQty) : null}
        </TableCell>
        <TableCell component="td" title={sellMin ? sellMin.toLocaleString() : undefined}>
          {sellMin ? abbreviateGold(sellMin) : null}
        </TableCell>
        <TableCell component="td" title={sellMax ? sellMax.toLocaleString() : undefined}>
          {sellMax ? abbreviateGold(sellMax) : null}
        </TableCell>
        <TableCell component="td" title={sellAvg ? sellAvg.toLocaleString() : undefined}>
          {sellAvg ? abbreviateGold(sellAvg) : null}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={13}>
          <Collapse in={showDetails} timeout="auto" unmountOnExit>
            {offers ? (
              <Box sx={{ margin: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "stretch" }}>
                  <PriceSpreadGlance
                    buyGold={offers.buyGold}
                    sellGold={offers.sellGold}
                    standTradeCount={standTradeCount}
                    earthCount={earthCount}
                  />
                  <CalcCostGlance calcRange={calcRange} loading={calcLoading} />
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                  <GoldOffersPanel
                    title="Buying (gold bids)"
                    rows={offers.buyGold}
                    merchants={merchants}
                    bestLabel="Bid"
                    side="bid"
                    calcRange={calcRange}
                  />
                  <GoldOffersPanel
                    title="Selling (gold asks)"
                    rows={offers.sellGold}
                    merchants={merchants}
                    bestLabel="Ask"
                    side="ask"
                    calcRange={calcRange}
                  />
                </Box>
                {showWantPanels ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                    <WantOffersPanel
                      title="You get this"
                      rows={offers.outgoingWant}
                      merchants={merchants}
                      viewedItem={{ name: itemKey, level }}
                      marketItems={marketItems}
                    />
                    <WantOffersPanel
                      title="You give this"
                      rows={offers.incomingWant}
                      merchants={merchants}
                      viewedItem={{ name: itemKey, level }}
                      marketItems={marketItems}
                    />
                  </Box>
                ) : null}
              </Box>
            ) : null}
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export function Market() {
  const G = useContext(GDataContext);
  const { items, merchants, lastRefresh, refresh } = useMerchants();
  const {
    allRows: listedAllRows,
    getRowsForItem,
    lastRefresh: listedRefresh,
    refresh: refreshListed,
  } = useListedTrades();
  const [filter, setFilter] = useState("");
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<MarketSortConfig>(DEFAULT_MARKET_SORT);

  const handleSort = (key: MarketSortKey) => {
    setSortConfig((prev) => nextMarketSort(prev, key));
  };

  const sortLabelProps = (key: MarketSortKey) => {
    const direction = sortConfig.key === key ? sortConfig.direction : defaultDirectionFor(key);
    return {
      active: sortConfig.key === key,
      direction,
      onClick: () => handleSort(key),
    };
  };

  const uniqueBuyers = useMemo(() => {
    const buyers = new Set<string>();

    // eslint-disable-next-line guard-for-in
    for (const itemKey in items) {
      const itemsByItemKey = items[itemKey as ItemKey];
      // eslint-disable-next-line guard-for-in
      for (const variantKey in itemsByItemKey) {
        const itemsByVariant = itemsByItemKey[variantKey] ?? [];
        // eslint-disable-next-line guard-for-in
        for (const level in itemsByVariant) {
          const pricesByLevel = itemsByVariant[level];
          // eslint-disable-next-line guard-for-in
          for (const merchantName in pricesByLevel.buying.merchants) {
            buyers.add(merchantName);
          }
        }
      }
    }

    return Array.from(buyers);
  }, [items]);

  const uniqueSellers = useMemo(() => {
    const sellers = new Set<string>();

    // eslint-disable-next-line guard-for-in
    for (const itemKey in items) {
      const itemsByItemKey = items[itemKey as ItemKey];
      // eslint-disable-next-line guard-for-in
      for (const variantKey in itemsByItemKey) {
        const itemsByVariant = itemsByItemKey[variantKey] ?? [];
        // eslint-disable-next-line guard-for-in
        for (const level in itemsByVariant) {
          const pricesByLevel = itemsByVariant[level];
          // eslint-disable-next-line guard-for-in
          for (const merchantName in pricesByLevel.selling.merchants) {
            sellers.add(merchantName);
          }
        }
      }
    }

    return Array.from(sellers);
  }, [items]);

  const merchantIds = useMemo(
    () => Array.from(new Set([...uniqueBuyers, ...uniqueSellers])),
    [uniqueBuyers, uniqueSellers],
  );

  const suggestions = useMemo(
    () => (draft: string) =>
      buildMarketSearchSuggestions(draft, {
        itemKeys: Object.keys(items),
        merchants: merchantIds,
      }),
    [items, merchantIds],
  );

  const onRefreshData = () => {
    refresh();
    refreshListed();
  };

  const rows = useMemo(() => {
    const tmpRows: Array<{
      itemName: ItemKey;
      title: string;
      data?: string;
      level: number;
      prices: BuySellItemPrices;
    }> = [];

    // eslint-disable-next-line guard-for-in
    for (const itemKey in items) {
      const itemsByItemKey = items[itemKey as ItemKey];
      // eslint-disable-next-line guard-for-in
      for (const variantKey in itemsByItemKey) {
        const itemsByVariant = itemsByItemKey[variantKey] ?? [];
        const { title, data } = parseInstanceVariantKey(variantKey);
        // eslint-disable-next-line guard-for-in
        for (const level in itemsByVariant) {
          const pricesByLevel = itemsByVariant[level];
          tmpRows.push({
            itemName: itemKey as ItemKey,
            title,
            data,
            level: Number(level),
            prices: pricesByLevel,
          });
        }
      }
    }

    // Listed-only items (no live stand) still appear as market rows.
    const seen = new Set(
      tmpRows.map((row) =>
        listingKey({ name: row.itemName, level: row.level, p: row.title || undefined }),
      ),
    );
    for (const listedRow of listedAllRows) {
      const key = listingKey(listedRow.listing);
      if (seen.has(key)) continue;
      seen.add(key);
      const variantKey = instanceVariantKey({
        p: listedRow.listing.p,
      });
      const { title, data } = parseInstanceVariantKey(variantKey);
      tmpRows.push({
        itemName: listedRow.listing.name as ItemKey,
        title: listedRow.listing.p ?? title,
        data,
        level: listedRow.listing.level ?? 0,
        prices: emptyBuySellPrices(),
      });
    }

    tmpRows.sort(
      (a, b) =>
        a.itemName.localeCompare(b.itemName) ||
        (a.data ?? "").localeCompare(b.data ?? "") ||
        a.title.localeCompare(b.title),
    );
    return tmpRows;
  }, [items, listedAllRows]);

  const filteredRows = useMemo(() => {
    const matched = rows.filter((row) => {
      const buyerKeys = Object.keys(row.prices.buying.merchants);
      const sellerKeys = Object.keys(row.prices.selling.merchants);
      const buyerMatches =
        selectedBuyers.length === 0 || selectedBuyers.some((buyer) => buyerKeys.includes(buyer));
      const sellerMatches =
        selectedSellers.length === 0 ||
        selectedSellers.some((seller) => sellerKeys.includes(seller));

      const hasSellers = sellerKeys.length > 0;
      const hasBuyers = buyerKeys.length > 0;
      const hasWantedBy = row.prices.wantedBy.length > 0;
      const hasListed = getRowsForItem({
        name: row.itemName,
        level: row.level,
        p: row.title || undefined,
      }).length;

      return (
        (hasSellers || hasBuyers || hasWantedBy || hasListed > 0) &&
        buyerMatches &&
        sellerMatches &&
        marketRowMatchesSearch(row, G, filter)
      );
    });
    return sortMarketRows(matched, sortConfig);
  }, [rows, selectedBuyers, selectedSellers, filter, G, sortConfig, getRowsForItem]);

  const refreshedAt = [lastRefresh, listedRefresh]
    .filter(Boolean)
    .map((d) => d!.toLocaleString())
    .join(" · stands / earth ");

  return (
    <StickyListLayout
      toolbar={
        <Box>
          <Info />
          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 2 }}>
            <Button onClick={onRefreshData}>Refresh Data</Button>
            <Typography variant="subtitle2">{refreshedAt}</Typography>
          </Box>
        </Box>
      }
      filters={
        <Paper sx={{ p: 2 }}>
          <Box display="flex" flexWrap="wrap" gap={2} alignItems="flex-start">
            <Box sx={{ flex: "1 1 280px", minWidth: 220, maxWidth: 420 }}>
              <QuerySearchBar
                context="market"
                value={filter}
                onChange={setFilter}
                suggestions={suggestions}
              />
            </Box>
            <Box sx={{ minWidth: 220, flex: 1 }}>
              <MultiFilterAutocomplete
                label="Buyers"
                options={uniqueBuyers}
                value={selectedBuyers}
                onChange={setSelectedBuyers}
              />
            </Box>
            <Box sx={{ minWidth: 220, flex: 1 }}>
              <MultiFilterAutocomplete
                label="Sellers"
                options={uniqueSellers}
                value={selectedSellers}
                onChange={setSelectedSellers}
              />
            </Box>
          </Box>
        </Paper>
      }
    >
      <StickyTableShell>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" colSpan={3} />
              <TableCell align="center" colSpan={5}>
                Buying
              </TableCell>
              <TableCell align="center" colSpan={5}>
                Selling
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell />
              <TableCell>
                <TableSortLabel {...sortLabelProps("name")}>Name</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel {...sortLabelProps("buyCount")}># Buyers</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel {...sortLabelProps("buyQty")}>Qty</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel {...sortLabelProps("buyMax")}>Best bid</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel {...sortLabelProps("buyMin")}>Low bid</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel {...sortLabelProps("buyAvg")}>Avg</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel {...sortLabelProps("sellCount")}># Sellers</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel {...sortLabelProps("sellQty")}>Qty</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel {...sortLabelProps("sellMin")}>Best ask</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel {...sortLabelProps("sellMax")}>High ask</TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel {...sortLabelProps("sellAvg")}>Avg</TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map(({ itemName, title, data, level, prices }) => {
              const rowKey = listingKey({
                name: itemName,
                level,
                p: title || undefined,
              });
              return (
                <TradeItemRow
                  key={`${rowKey}\0${data ?? ""}`}
                  itemKey={itemName}
                  title={title}
                  data={data}
                  level={level}
                  prices={prices}
                  merchants={merchants}
                  marketItems={items}
                  listedRows={getRowsForItem({
                    name: itemName,
                    level,
                    p: title || undefined,
                  })}
                />
              );
            })}
          </TableBody>
        </Table>
      </StickyTableShell>
    </StickyListLayout>
  );
}
