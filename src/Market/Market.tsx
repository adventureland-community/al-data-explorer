import {
  Autocomplete,
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
  TextField,
  Typography,
} from "@mui/material";
import { useContext, useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { ItemInfoPValues, ItemKey, TitleKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { MultiFilterAutocomplete } from "../Shared/MultiFilterAutocomplete";
import { StickyListLayout, StickyTableShell } from "../Shared/StickyListLayout";
import { abbreviateNumber } from "../Shared/utils";
import { getItemName, getTitleName } from "../Shared/iteminfo-util";
import { useMerchants } from "./useMerchants";
import type { BuySellItemPrices, Merchant } from "./useMerchants";

function Info() {
  return (
    <Card>
      <CardContent>
        <Typography component="div">
          This page shows market data from adventureland merchants using the merchant endpoint from{" "}
          <a href="https://aldata.earthiverse.ca">earthiverse&apos;s aldata</a>
          <br />
          You can search for items, separating searches by either space or comma. Press REFRESH DATA
          to refresh the data from the merchant endpoint.
        </Typography>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(lastSeen: string | Date) {
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInMs = now.getTime() - lastSeenDate.getTime();

  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${days}d ${hours}h ${minutes}m ago`;
}

function TradeItemRow({
  itemKey,
  title,
  level,
  prices,
  merchants,
}: {
  itemKey: ItemKey;
  title: TitleKey;
  level: number;
  prices: BuySellItemPrices;
  merchants: { [id: string]: Merchant };
}) {
  const G = useContext(GDataContext);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const gItem = G?.items[itemKey];

  const RenderShortNumber = (number?: number) => {
    if (number) {
      return (
        <TableCell component="td" title={number.toLocaleString()}>
          {abbreviateNumber(number)}
        </TableCell>
      );
    }
    return <TableCell component="td" />;
  };

  const RenderMerchantName = (merchantName?: string) => {
    if (merchantName) {
      const merchantDetails = merchants[merchantName];
      let tooltip = `${merchantName}`;

      if (merchantDetails) {
        tooltip += `\nServer: ${merchantDetails.serverRegion}${merchantDetails.serverIdentifier}`;
        tooltip += `\nMap: ${merchantDetails.map}`;
        tooltip += `\nX: ${merchantDetails.x.toFixed(2)}, Y: ${merchantDetails.y.toFixed(2)}`;
        tooltip += `\nLast seen: ${getTimeAgo(merchantDetails.lastSeen)}`;
      }

      const handleCopy = () => {
        const command = `smart_move({map: "${merchantDetails?.map}", x: ${merchantDetails?.x}, y: ${merchantDetails?.y}})`;
        navigator.clipboard.writeText(command).then(() => {
          console.log("Copied to clipboard:", command);
        });
      };

      return (
        <TableCell
          component="td"
          title={tooltip}
          onClick={handleCopy}
          style={{ cursor: "pointer" }}
        >
          {merchantName}
        </TableCell>
      );
    }
    return <TableCell component="td" />;
  };

  const buyerCount = Object.keys(prices.buying.merchants).length;
  const sellerCount = Object.keys(prices.selling.merchants).length;

  const buyItems = Object.entries(prices.buying.merchants)
    .flatMap(([merchantName, m]) => m.items.map((x) => ({ merchantName, ...x })))
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  const sellItems = Object.entries(prices.selling.merchants)
    .flatMap(([merchantName, m]) => m.items.map((x) => ({ merchantName, ...x })))
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));

  const maxDetailIndex = Math.max(buyItems.length, sellItems.length);

  const detailRows = [];

  for (let index = 0; index < maxDetailIndex; index++) {
    const buy = buyItems[index];
    const sell = sellItems[index];
    detailRows.push({ buy, sell });
  }
  if (!gItem) return <></>;

  const itemInfo = {
    name: itemKey,
    p: title as ItemInfoPValues,
    level,
  };

  let titleName = getTitleName(itemInfo, G);
  if (titleName) {
    titleName += " ";
  }

  const itemName = getItemName(itemKey, gItem);

  return (
    <>
      <TableRow
        onClick={() => setShowDetails(!showDetails)}
        hover
        sx={{ "& > *": { borderBottom: "unset" } }}
      >
        <TableCell>
          <IconButton aria-label="expand row" size="small">
            {showDetails ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        {/* <TableCell>{itemName}</TableCell> */}
        <TableCell component="td">
          <div style={{ display: "inline-block" }}>
            <ItemInstance itemInfo={itemInfo} />
          </div>
          <div style={{ marginLeft: "10px", display: "inline-block" }}>
            <div>
              {titleName}
              {itemName}
            </div>
            <div style={{ color: "grey" }}>{itemInfo.name}</div>
          </div>
        </TableCell>
        <TableCell component="td">{buyerCount || ""}</TableCell>
        {RenderShortNumber(prices.buying.amount)}
        {RenderShortNumber(prices.buying.minPrice.price)}
        {RenderShortNumber(prices.buying.maxPrice.price)}
        {RenderShortNumber(prices.buying.avgPrice)}
        <TableCell>{sellerCount || ""}</TableCell>
        {RenderShortNumber(prices.selling.amount)}
        {RenderShortNumber(prices.selling.minPrice.price)}
        {RenderShortNumber(prices.selling.maxPrice.price)}
        {RenderShortNumber(prices.selling.avgPrice)}
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={13}>
          <Collapse in={showDetails} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  {" "}
                  <TableRow>
                    <TableCell align="center" colSpan={3} />
                    <TableCell align="center" colSpan={3}>
                      Buying
                    </TableCell>
                    <TableCell align="center" colSpan={3}>
                      Selling
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} />
                    <TableCell>Merchant</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Merchant</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailRows.map(({ buy, sell }) => (
                    <TableRow
                      key={`${itemName}-${level}-${buy?.merchantName || ""}-${
                        sell?.merchantName || ""
                      }`}
                    >
                      <TableCell colSpan={3} />
                      {RenderMerchantName(buy?.merchantName)}
                      {RenderShortNumber(buy?.q)}
                      {RenderShortNumber(buy?.price)}
                      {RenderMerchantName(sell?.merchantName)}
                      {RenderShortNumber(sell?.q)}
                      {RenderShortNumber(sell?.price)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
  const [filter, setFilter] = useState("");
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);

  const uniqueBuyers = useMemo(() => {
    const buyers = new Set<string>();

    // eslint-disable-next-line guard-for-in
    for (const itemKey in items) {
      const itemsByItemKey = items[itemKey as ItemKey];
      // eslint-disable-next-line guard-for-in
      for (const titleKey in itemsByItemKey) {
        const itemsByTitle = itemsByItemKey[titleKey as TitleKey] ?? [];
        // eslint-disable-next-line guard-for-in
        for (const level in itemsByTitle) {
          const pricesByLevel = itemsByTitle[level];
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
      for (const titleKey in itemsByItemKey) {
        const itemsByTitle = itemsByItemKey[titleKey as TitleKey] ?? [];
        // eslint-disable-next-line guard-for-in
        for (const level in itemsByTitle) {
          const pricesByLevel = itemsByTitle[level];
          // eslint-disable-next-line guard-for-in
          for (const merchantName in pricesByLevel.selling.merchants) {
            sellers.add(merchantName);
          }
        }
      }
    }

    return Array.from(sellers);
  }, [items]);

  const getMerchantData = () => {
    refresh();
  };

  const onRefreshData = () => {
    getMerchantData();
  };

  const rows = useMemo(() => {
    let tmpRows: Array<{
      itemName: ItemKey;
      title: TitleKey;
      level: number;
      prices: BuySellItemPrices;
    }> = [];

    console.log("search triggered filterDataBySearch", filter);

    // eslint-disable-next-line guard-for-in
    for (const itemKey in items) {
      const itemsByItemKey = items[itemKey as ItemKey];
      // eslint-disable-next-line guard-for-in
      for (const titleKey in itemsByItemKey) {
        const itemsByTitle = itemsByItemKey[titleKey as TitleKey] ?? [];
        // eslint-disable-next-line guard-for-in
        for (const level in itemsByTitle) {
          const pricesByLevel = itemsByTitle[level];

          // why are we filtering it twice? here and in filtered rows?
          if (filter) {
            const lowercaseFilter = filter.toLowerCase();

            const itemNames: string[] = [];
            itemNames.push(...lowercaseFilter.split(" "));
            itemNames.push(...lowercaseFilter.split(","));

            const itemNameMatchesSearch = (name: string) =>
              itemNames.some((nname) => name.toLowerCase().includes(nname));

            const gItem = G?.items[itemKey as ItemKey];
            const itemNameMatches = itemNameMatchesSearch(itemKey);
            const gItemNameMatches = gItem && itemNameMatchesSearch(gItem.name);

            if (!itemNameMatches && !gItemNameMatches) {
              continue;
            }
          }

          // TODO: no filter
          tmpRows.push({
            itemName: itemKey as ItemKey,
            title: titleKey as TitleKey,
            level: Number(level),
            prices: pricesByLevel,
          });
        }
      }
    }

    tmpRows = tmpRows.sort((a, b) => a.itemName.localeCompare(b.itemName));
    console.log("=========================================");

    return tmpRows;
  }, [filter, items, G]);

  const filteredRows = useMemo(
    () =>
      rows.filter(({ itemName, prices }) => {
        const buyerKeys = Object.keys(prices.buying.merchants);
        const sellerKeys = Object.keys(prices.selling.merchants);
        const buyerMatches =
          selectedBuyers.length === 0 || selectedBuyers.some((buyer) => buyerKeys.includes(buyer));
        const sellerMatches =
          selectedSellers.length === 0 ||
          selectedSellers.some((seller) => sellerKeys.includes(seller));

        const hasSellers = sellerKeys.length > 0;
        const hasBuyers = buyerKeys.length > 0;

        const itemNameMatchesSearch = (name: string) =>
          !filter || name.toLowerCase().includes(filter.toLowerCase());

        return (
          (hasSellers || hasBuyers) &&
          buyerMatches &&
          sellerMatches &&
          itemNameMatchesSearch(itemName)
        );
      }),
    [rows, selectedBuyers, selectedSellers, filter],
  );

  // TODO: two children with key = helmet10 ???
  console.log(filteredRows.filter((x) => x.itemName === "helmet"));
  // TODO: also when searching, helmet10 shows up???

  return (
    <StickyListLayout
      toolbar={
        <Box>
          <Info />
          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 2 }}>
            <Button onClick={onRefreshData}>Refresh Data</Button>
            <Typography variant="subtitle2">{lastRefresh?.toLocaleString()}</Typography>
          </Box>
        </Box>
      }
      filters={
        <Paper sx={{ p: 2 }}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Box sx={{ width: 300, maxWidth: "100%" }}>
              <Autocomplete
                options={Object.keys(items)}
                onInputChange={(event, newInputValue) => {
                  setFilter(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Search Items" variant="outlined" size="small" />
                )}
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
              <TableCell>Name</TableCell>
              <TableCell># Buyers</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Min</TableCell>
              <TableCell>Max</TableCell>
              <TableCell>Avg</TableCell>
              <TableCell># Sellers</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Min</TableCell>
              <TableCell>Max</TableCell>
              <TableCell>Avg</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map(({ itemName, title, level, prices }) => (
              <TradeItemRow
                key={`${itemName}${title}${level}`}
                itemKey={itemName}
                title={title}
                level={level}
                prices={prices}
                merchants={merchants}
              />
            ))}
          </TableBody>
        </Table>
      </StickyTableShell>
    </StickyListLayout>
  );
}
