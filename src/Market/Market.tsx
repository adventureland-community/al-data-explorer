import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
} from "@mui/material";
import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
  ItemInfoPValues,
  ItemKey,
  MapKey,
  TitleKey,
  TradeItemInfo,
  TradeSlotType,
} from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";

import { abbreviateNumber } from "../Shared/utils";
import { getItemName, getTitleName } from "../Shared/iteminfo-util";

function Info() {
  return (
    <Card sx={{ marginBottom: 2 }}>
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

type ItemPrices = {
  amount: number;
  minPrice: { merchant?: string; price: number };
  maxPrice: { merchant?: string; price: number };
  avgPrice: number;
  merchants: {
    [merchantName: string]: {
      merchant: { id: string; lastSeen: string };
      items: TradeItemInfo[];
    };
  };
};

type BuySellItemPrices = {
  buying: ItemPrices;
  selling: ItemPrices;
};

type ItemsByNameTitleLevel = Partial<
  Record<ItemKey, Partial<Record<TitleKey | "", BuySellItemPrices[]>>>
>;

type Merchant = {
  id: string;
  lastSeen: string;
  map: MapKey;
  serverIdentifier: string;
  serverRegion: string;
  slots: { [T in TradeSlotType]?: TradeItemInfo };
  x: number;
  y: number;
};

function groupItemsByNameAndLevel(merchants: Merchant[]) {
  const result: ItemsByNameTitleLevel = {};

  for (const merchant of merchants) {
    let tradeSlot: TradeSlotType;
    for (tradeSlot in merchant.slots) {
      if (!Object.hasOwn(merchant.slots, tradeSlot)) {
        continue;
      }

      const item = merchant.slots[tradeSlot] as TradeItemInfo;
      if (!item) {
        continue;
      }

      result[item.name] = result[item.name] ?? {};
      const itemPricesByName = result[item.name] ?? {};

      const titleKey = item.p ?? "";
      let itemPricesByTitle = itemPricesByName[titleKey];
      if (!itemPricesByTitle) {
        itemPricesByName[titleKey] = [];
        itemPricesByTitle = itemPricesByName[titleKey] ?? [];
      }

      const level = item.level ?? 0;
      let itemPricesByLevel = itemPricesByTitle[level];

      if (!itemPricesByLevel) {
        itemPricesByTitle[level] = {
          buying: {
            amount: 0,
            minPrice: { price: 0 },
            maxPrice: { price: 0 },
            avgPrice: 0,
            merchants: {},
          },
          selling: {
            amount: 0,
            minPrice: { price: 0 },
            maxPrice: { price: 0 },
            avgPrice: 0,
            merchants: {},
          },
        };
        itemPricesByLevel = itemPricesByTitle[level];
      }

      const buyingOrSelling: "buying" | "selling" = item.b ? "buying" : "selling";

      const itemsByBuyingOrSelling = itemPricesByLevel[buyingOrSelling];
      let itemsByMerchant = itemsByBuyingOrSelling.merchants[merchant.id];
      if (!itemsByMerchant) {
        const { id, lastSeen } = merchant;

        if (item.price) {
          if (
            itemsByBuyingOrSelling.minPrice.price === 0 ||
            itemsByBuyingOrSelling.minPrice.price > item.price
          ) {
            itemsByBuyingOrSelling.minPrice.merchant = id;
            itemsByBuyingOrSelling.minPrice.price = item.price;
          }

          if (
            itemsByBuyingOrSelling.maxPrice.price === 0 ||
            itemsByBuyingOrSelling.maxPrice.price < item.price
          ) {
            itemsByBuyingOrSelling.maxPrice.merchant = id;
            itemsByBuyingOrSelling.maxPrice.price = item.price;
          }
        }

        itemsByBuyingOrSelling.merchants[merchant.id] = {
          merchant: { id, lastSeen },
          items: [],
        };

        itemsByMerchant = itemsByBuyingOrSelling.merchants[merchant.id];
      }

      itemsByBuyingOrSelling.amount += item.q ?? 1;

      itemsByMerchant.items.push(item);
    }
  }

  return result;
}

export function Market() {
  const G = useContext(GDataContext);
  const [lastRefresh, setLastRefresh] = useState<Date | undefined>(undefined);
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState<ItemsByNameTitleLevel>({});
  const [selectedBuyer, setSelectedBuyer] = useState<string | undefined>(undefined);
  const [selectedSeller, setSelectedSeller] = useState<string | undefined>(undefined);
  const [merchants, setMerchants] = useState<{ [id: string]: Merchant }>({});

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
    console.log("fetching merchant data ");
    axios
      .get("https://aldata.earthiverse.ca/merchants")
      .then((response) => {
        setLastRefresh(new Date());
        const groupedItems = groupItemsByNameAndLevel(response.data);
        setItems(groupedItems);
        setMerchants(
          response.data.reduce((acc: { [id: string]: Merchant }, merchant: Merchant) => {
            acc[merchant.id] = merchant;
            return acc;
          }, {}),
        );
        sessionStorage.setItem(
          "merchants",
          JSON.stringify({ timestamp: new Date(), merchants: response.data }),
        );
      })
      .catch((error) => {
        console.log(error);
      });
  };

  useEffect(() => {
    const sessionStorageMerchants = sessionStorage.getItem("merchants");

    if (sessionStorageMerchants) {
      console.log("fetching data from session");
      const parsed = JSON.parse(sessionStorageMerchants);
      setLastRefresh(new Date(parsed.timestamp));
      const groupedItems = groupItemsByNameAndLevel(parsed.merchants);
      setItems(groupedItems);
      setMerchants(
        parsed.merchants.reduce((acc: { [id: string]: Merchant }, merchant: Merchant) => {
          acc[merchant.id] = merchant;
          return acc;
        }, {}),
      );
      return;
    }

    getMerchantData();
  }, []);

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
        const buyerMatches = selectedBuyer
          ? Object.keys(prices.buying.merchants).includes(selectedBuyer)
          : true;
        const sellerMatches = selectedSeller
          ? Object.keys(prices.selling.merchants).includes(selectedSeller)
          : true;

        const hasSellers = Object.keys(prices.selling.merchants).length > 0;
        const hasBuyers = Object.keys(prices.buying.merchants).length > 0;

        const itemNameMatchesSearch = (name: string) =>
          !filter || name.toLowerCase().includes(filter.toLowerCase());

        return (
          (hasSellers || hasBuyers) &&
          buyerMatches &&
          sellerMatches &&
          itemNameMatchesSearch(itemName)
        );
      }),
    [rows, selectedBuyer, selectedSeller, filter],
  );

  // TODO: two children with key = helmet10 ???
  console.log(filteredRows.filter((x) => x.itemName === "helmet"));
  // TODO: also when searching, helmet10 shows up???

  return (
    <>
      <Info />
      <Button onClick={onRefreshData}>Refresh Data</Button>
      <Typography variant="subtitle2">
        <>{lastRefresh?.toLocaleString()}</>
      </Typography>
      <Divider />
      <Box display="flex" mb={2}>
        <Box flexGrow={0} mr={2} sx={{ width: "300px" }}>
          <Autocomplete
            options={Object.keys(items)}
            onInputChange={(event, newInputValue) => {
              setFilter(newInputValue);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Search Items" variant="outlined" />
            )}
          />
        </Box>
        <Box flexGrow={0} mr={2}>
          <Select
            value={selectedBuyer || ""}
            onChange={(e) => setSelectedBuyer(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">
              <em>All Buyers</em>
            </MenuItem>
            {uniqueBuyers.map((buyer) => (
              <MenuItem key={buyer} value={buyer}>
                {buyer}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box flexGrow={0}>
          <Select
            value={selectedSeller || ""}
            onChange={(e) => setSelectedSeller(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">
              <em>All Sellers</em>
            </MenuItem>
            {uniqueSellers.map((seller) => (
              <MenuItem key={seller} value={seller}>
                {seller}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

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
            {/* <TableCell>Item</TableCell> */}
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
    </>
  );
}
