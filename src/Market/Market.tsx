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
} from "@mui/material";
import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { ItemKey, MapKey, TradeItemInfo, TradeSlotType } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../GearPlanner/ItemInstance";
import { Search } from "../Shared/Search";

// https://stackoverflow.com/a/40724354/28145
const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];

function abbreviateNumber(number?: number) {
  if (!number) {
    return number;
  }

  // what tier? (determines SI symbol)
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;

  // if zero, we don't need a suffix
  if (tier === 0) return number;

  // get suffix and determine scale
  const suffix = SI_SYMBOL[tier];
  const scale = 10 ** (tier * 3);

  // scale the number
  const scaled = number / scale;

  // format number and add suffix
  //   return scaled.toFixed(1) + suffix;
  return (
    scaled.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + suffix
  );
}

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

function TradeItemRow({
  level,
  itemName,
  prices,
}: {
  level: number;
  itemName: ItemKey;
  prices: BuySellItemPrices;
}) {
  const G = useContext(GDataContext);

  const [showDetails, setShowDetails] = useState<boolean>(false);

  const gItem = G?.items[itemName];
  // TODO: should this be an accordian instead? or do we want a nested table
  // https://mui.com/material-ui/react-table/#column-grouping a group for buy vs sell?
  // collapse https://mui.com/material-ui/react-table/#collapsible-table

  // When rendering individual merchant prices, we could render a row relative to gItem price?

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

  const RenderShortPriceWithMerchantName = ({
    merchant,
    price,
  }: {
    merchant?: string;
    price: number;
  }) => {
    if (price) {
      return (
        <TableCell component="td" title={`${price.toLocaleString()} ${merchant}`}>
          {abbreviateNumber(price)}
        </TableCell>
      );
    }

    return <TableCell component="td" />;
  };

  const buyerCount = Object.keys(prices.buying.merchants).length;
  const sellerCount = Object.keys(prices.selling.merchants).length;

  // TODO: collapse by price, in case the same price exists
  const buyItems = Object.entries(prices.buying.merchants)
    .flatMap(([merchantName, m]) => m.items.map((x) => ({ merchantName, ...x })))
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); // sort descending, we want to sell most expensive

  const sellItems = Object.entries(prices.selling.merchants)
    .flatMap(([merchantName, m]) => m.items.map((x) => ({ merchantName, ...x })))
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); // sort ascending, we want to buy the cheapest

  const maxDetailIndex = Math.max(buyItems.length, sellItems.length);

  const detailRows: Array<{
    buy: { merchantName: string; q?: number; price?: number };
    sell: { merchantName: string; q?: number; price?: number };
  }> = [];

  for (let index = 0; index < maxDetailIndex; index++) {
    const buy = buyItems[index];
    const sell = sellItems[index];
    detailRows.push({ buy, sell });
  }

  return (
    <>
      <TableRow
        onClick={() => setShowDetails(!showDetails)}
        hover
        // sx={{
        //   "&:last-child td, &:last-child th": { border: 0 },
        // }}
        sx={{ "& > *": { borderBottom: "unset" } }}
      >
        <TableCell>
          <IconButton aria-label="expand row" size="small">
            {showDetails ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{itemName}</TableCell>
        <TableCell>
          <ItemInstance
            itemInfo={{
              name: itemName,
              level,
            }}
          />
          <span style={{ marginLeft: "15px" }}>{gItem?.name}</span>
        </TableCell>
        {/* buy averages, total items */}
        <TableCell component="td">{buyerCount || ""}</TableCell>
        {RenderShortNumber(prices.buying.amount)}
        {RenderShortPriceWithMerchantName(prices.buying.minPrice)}
        {RenderShortPriceWithMerchantName(prices.buying.maxPrice)}
        {RenderShortNumber(prices.buying.avgPrice)}
        {/* sell averages, total items. */}
        <TableCell>{sellerCount || ""}</TableCell>
        {RenderShortNumber(prices.selling.amount)}
        {RenderShortPriceWithMerchantName(prices.selling.minPrice)}
        {RenderShortPriceWithMerchantName(prices.selling.maxPrice)}
        {RenderShortNumber(prices.selling.avgPrice)}
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={13}>
          <Collapse in={showDetails} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              {/* <Typography variant="h6" gutterBottom component="div">
                Details
              </Typography> */}
              <Table size="small" aria-label="purchases">
                <TableHead>
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
                    {/* Buying */}
                    <TableCell>Merchant</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Price</TableCell>
                    {/* selling */}
                    <TableCell>Merchant</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailRows.map(({ buy, sell }, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <TableRow key={`details${itemName}${index}`}>
                      <TableCell colSpan={3} />

                      <TableCell component="td">{buy?.merchantName}</TableCell>
                      {RenderShortNumber(buy?.q)}
                      {RenderShortNumber(buy?.price)}

                      <TableCell component="td">{sell?.merchantName}</TableCell>
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

// function Overview({ merchants }: { merchants: Merchant[] }) {
//     // TODO: extract out all items by item name and level
//     // store each price per merchant
//     // TODO: calculate lowest, highest and average price.
//     // TODO: do this for buying vs selling
//     return <>hello world</>;
// }

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

type ItemsByNameAndLevel = {
  [T in ItemKey]?: BuySellItemPrices[]; // index is equal to level
};

function groupItemsByNameAndLevel(merchants: Merchant[]) {
  const result: ItemsByNameAndLevel = {};

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

      result[item.name] = result[item.name] ?? [];
      const itemPrices = result[item.name] ?? [];

      const level = item.level ?? 0;

      let itemPricesByLevel = itemPrices[level];

      if (!itemPricesByLevel) {
        itemPrices[level] = {
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
        itemPricesByLevel = itemPrices[level];
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

  // TODO: loop result and summarize prices

  return result;
}

type Merchant = {
  /** name of the merchant */
  id: string;
  lastSeen: string;
  map: MapKey;
  serverIdentifier: string; // ServerIdentifier;
  serverRegion: string; // ServerRegion;
  slots: { [T in TradeSlotType]?: TradeItemInfo };
  x: number;
  y: number;
};

// https://stackoverflow.com/a/32180863/28145
// export function msToTime(ms: number) {
//     const seconds = ms / 1000;
//     const minutes = ms / (1000 * 60);
//     const hours = ms / (1000 * 60 * 60);
//     const days = ms / (1000 * 60 * 60 * 24);
//     // TODO: could render the "rest" as welll e.g. "1 day, 1 hour, 1 minute, 1 second"
//     if (seconds < 60) return `${seconds.toFixed(1)} s`;
//     if (minutes < 60) return `${minutes.toFixed(1)} m`;
//     if (hours < 24) return `${hours.toFixed(1)} H`;
//     return `${days.toFixed(1)} D`;
// }

export function Market() {
  const G = useContext(GDataContext);
  const [lastRefresh, setLastRefresh] = useState<Date | undefined>(undefined);
  const [filter, setFilter] = useState("");
  //   const [merchants, setMerchants] = useState<Merchant[]>([]);

  const [items, setItems] = useState<ItemsByNameAndLevel>({});

  const getMerchantData = () => {
    console.log("fetching merchant data ");
    axios
      .get("https://aldata.earthiverse.ca/merchants")
      .then((response) => {
        // handle success
        setLastRefresh(new Date());
        const groupedItems = groupItemsByNameAndLevel(response.data);
        setItems(groupedItems);
        sessionStorage.setItem(
          "merchants",
          JSON.stringify({ timestamp: new Date(), merchants: response.data }),
        );
      })
      .catch((error) => {
        // handle error
        console.log(error);
      })
      .then(() => {
        // always executed
      });
  };

  useEffect(() => {
    // TODO: should probably cache this somehow, perhaps track diffs in localstorage?
    // or build a database or something.

    const sessionStorageMerchants = sessionStorage.getItem("merchants");

    if (sessionStorageMerchants) {
      console.log("fetching data from session");
      const parsed = JSON.parse(sessionStorageMerchants);
      setLastRefresh(new Date(parsed.timestamp));
      const groupedItems = groupItemsByNameAndLevel(parsed.merchants);
      setItems(groupedItems);
      //   setMerchants(parsed.merchants);

      return;
    }

    getMerchantData();
  }, []);

  // TODO: store stats for items every time you refresh and new data is present for a merchant

  // TODO: group by filter?
  // TODO: tooltip on hover with assorted calculations?

  const onRefreshData = () => {
    getMerchantData();
  };

  const rows = useMemo(() => {
    let tmpRows: Array<{
      level: number;
      itemName: ItemKey;
      prices: BuySellItemPrices;
    }> = [];

    console.log("search triggered filterDataBySearch", filter);

    Object.entries(items).forEach(([key, levels]) => {
      const itemName = key as ItemKey;

      if (filter) {
        const lowercaseFilter = filter.toLowerCase();

        const itemNames: string[] = [];
        itemNames.push(...lowercaseFilter.split(" "));
        itemNames.push(...lowercaseFilter.split(","));

        const itemNameMatchesSearch = (name: string) =>
          itemNames.some((nname) => name.toLowerCase().includes(nname));

        const item = items[itemName];
        if (item) {
          const gItem = G?.items[itemName];
          const itemNameMatches = itemNameMatchesSearch(itemName);
          const gItemNameMatches = Boolean(gItem && itemNameMatchesSearch(gItem.name));

          if (!itemNameMatches && !gItemNameMatches) {
            return;
          }
        } else {
          return;
        }
      }

      for (const level in levels) {
        if (!Object.hasOwn(levels, level)) {
          continue;
        }

        const prices = levels[level];
        tmpRows.push({ level: Number(level), itemName, prices });
      }
    });

    // TODO: sort by level as well
    tmpRows = tmpRows.sort((a, b) => a.itemName.localeCompare(b.itemName));
    console.log("=========================================");

    return tmpRows;
  }, [filter, items, G]);

  return (
    <>
      <Info />
      <Button onClick={onRefreshData}>Refresh Data</Button>
      <Typography variant="subtitle2">
        <>{lastRefresh?.toLocaleString()}</>
      </Typography>
      <Divider />
      <Search doSearch={setFilter} />
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
            <TableCell>Item</TableCell>
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
          {rows.map(({ level, itemName, prices }) => (
            <TradeItemRow
              key={itemName + level}
              level={level}
              itemName={itemName}
              prices={prices}
            />
          ))}
        </TableBody>
      </Table>
      {/* {filteredMerchants.map((merchant) => {
        const ms = new Date().getTime() - new Date(merchant.lastSeen).getTime();
        const timeago = msToTime(ms);
        return (
          <div key={merchant.id} style={{ textAlign: "left", padding: "5px" }}>
            <Typography variant="h4">{merchant.id}</Typography>
            <Typography variant="subtitle1">{timeago} Ago</Typography>
          </div>
        );
      })} */}
    </>
  );
}
