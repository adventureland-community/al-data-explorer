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
import { useContext, useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { ItemInfoPValues, ItemKey } from "typed-adventureland";

import { parseInstanceVariantKey, instanceVariantKey } from "../gameData/itemInstanceData";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { MultiFilterAutocomplete } from "../Shared/MultiFilterAutocomplete";
import { QuerySearchBar } from "../Shared/QuerySearchBar";
import { StickyListLayout, StickyTableShell } from "../Shared/StickyListLayout";
import { abbreviateNumber } from "../Shared/utils";
import { getItemName, getTitleName } from "../Shared/iteminfo-util";
import { BankListingsPanel, GoldOffersPanel, WantOffersPanel } from "./MarketDetailPanels";
import { buildMarketSearchSuggestions, marketRowMatchesSearch } from "./marketSearchQuery";
import {
  DEFAULT_MARKET_SORT,
  defaultDirectionFor,
  nextMarketSort,
  sortMarketRows,
  type MarketSortConfig,
  type MarketSortKey,
} from "./marketSort";
import { splitMarketOffers } from "./marketOfferRows";
import { useBankTrades } from "./useBankTrades";
import { emptyBuySellPrices, useMerchants } from "./useMerchants";
import type { BuySellItemPrices, Merchant } from "./useMerchants";
import { listingKey } from "../Trades/tradeViewModel";

function Info() {
  return (
    <Card>
      <CardContent>
        <Typography component="div">
          Live merchant stands from{" "}
          <a href="https://aldata.earthiverse.ca">earthiverse&apos;s aldata</a> (gold asks/bids and
          official item-for-item <code>want</code> offers), plus bank WTS/WTB listings from the same
          API. Expand a row for Buying / Selling / stand trades / bank listings.
          <br />
          Search with market ops — try <code>price:&gt;=1m</code>, <code>attr:armor&gt;=40</code>,{" "}
          <code>is:sell</code>. Column headers sort; Selling Best (low ask) starts high→low on first
          click. REFRESH DATA reloads stands and bank listings.
        </Typography>
      </CardContent>
    </Card>
  );
}

function RenderShortNumber({ number }: { number?: number }) {
  if (number == null || number === 0) {
    return <TableCell component="td" />;
  }
  return (
    <TableCell component="td" title={number.toLocaleString()}>
      {abbreviateNumber(number)}
    </TableCell>
  );
}

function TradeItemRow({
  itemKey,
  title,
  data,
  level,
  prices,
  merchants,
  bankRows,
}: {
  itemKey: ItemKey;
  title: string;
  data?: string;
  level: number;
  prices: BuySellItemPrices;
  merchants: { [id: string]: Merchant };
  bankRows: ReturnType<typeof useBankTrades>["allRows"];
}) {
  const G = useContext(GDataContext);
  const [showDetails, setShowDetails] = useState(false);
  const gItem = G?.items[itemKey];

  const buyerCount = Object.keys(prices.buying.merchants).length;
  const sellerCount = Object.keys(prices.selling.merchants).length;
  const offers = splitMarketOffers(prices);

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
  const hasDetail =
    offers.buyGold.length > 0 ||
    offers.sellGold.length > 0 ||
    offers.outgoingWant.length > 0 ||
    offers.incomingWant.length > 0 ||
    bankRows.length > 0;

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
        <RenderShortNumber number={prices.buying.goldQty || prices.buying.amount} />
        <RenderShortNumber number={prices.buying.maxPrice.price} />
        <RenderShortNumber number={prices.buying.minPrice.price} />
        <RenderShortNumber number={prices.buying.avgPrice} />
        <TableCell component="td">{sellerCount || ""}</TableCell>
        <RenderShortNumber number={prices.selling.goldQty || prices.selling.amount} />
        <RenderShortNumber number={prices.selling.minPrice.price} />
        <RenderShortNumber number={prices.selling.maxPrice.price} />
        <RenderShortNumber number={prices.selling.avgPrice} />
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={13}>
          <Collapse in={showDetails} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                <GoldOffersPanel
                  title="Buying (gold bids)"
                  rows={offers.buyGold}
                  merchants={merchants}
                  bestLabel="Bid"
                />
                <GoldOffersPanel
                  title="Selling (gold asks)"
                  rows={offers.sellGold}
                  merchants={merchants}
                  bestLabel="Ask"
                />
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                <WantOffersPanel
                  title="Stand trades (offering this)"
                  rows={offers.outgoingWant}
                  merchants={merchants}
                  viewedItem={{ name: itemKey, level }}
                />
                <WantOffersPanel
                  title="Stand trades (want this)"
                  rows={offers.incomingWant}
                  merchants={merchants}
                  viewedItem={{ name: itemKey, level }}
                />
              </Box>
              <BankListingsPanel rows={bankRows} />
            </Box>
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
    allRows: bankAllRows,
    getRowsForItem,
    lastRefresh: bankRefresh,
    refresh: refreshBank,
  } = useBankTrades();
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
    refreshBank();
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

    // Bank-only listings (no live stand) still appear as market rows.
    const seen = new Set(
      tmpRows.map((row) =>
        listingKey({ name: row.itemName, level: row.level, p: row.title || undefined }),
      ),
    );
    for (const bankRow of bankAllRows) {
      const key = listingKey(bankRow.listing);
      if (seen.has(key)) continue;
      seen.add(key);
      const variantKey = instanceVariantKey({
        p: bankRow.listing.p,
      });
      const { title, data } = parseInstanceVariantKey(variantKey);
      tmpRows.push({
        itemName: bankRow.listing.name as ItemKey,
        title: bankRow.listing.p ?? title,
        data,
        level: bankRow.listing.level ?? 0,
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
  }, [items, bankAllRows]);

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
      const hasBank = getRowsForItem({
        name: row.itemName,
        level: row.level,
        p: row.title || undefined,
      }).length;

      return (
        (hasSellers || hasBuyers || hasWantedBy || hasBank > 0) &&
        buyerMatches &&
        sellerMatches &&
        marketRowMatchesSearch(row, G, filter)
      );
    });
    return sortMarketRows(matched, sortConfig);
  }, [rows, selectedBuyers, selectedSellers, filter, G, sortConfig, getRowsForItem]);

  const refreshedAt = [lastRefresh, bankRefresh]
    .filter(Boolean)
    .map((d) => d!.toLocaleString())
    .join(" · stands / bank ");

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
            {filteredRows.map(({ itemName, title, data, level, prices }) => (
              <TradeItemRow
                key={`${itemName}\0${title}\0${data ?? ""}\0${level}`}
                itemKey={itemName}
                title={title}
                data={data}
                level={level}
                prices={prices}
                merchants={merchants}
                bankRows={getRowsForItem({
                  name: itemName,
                  level,
                  p: title || undefined,
                })}
              />
            ))}
          </TableBody>
        </Table>
      </StickyTableShell>
    </StickyListLayout>
  );
}
