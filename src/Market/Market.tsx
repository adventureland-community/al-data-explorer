import {
  Button,
  Divider,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ItemInfo,
  ItemName,
  MapName,
  ServerIdentifier,
  ServerRegion,
  TradeSlotType,
} from "adventureland";
import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../GearPlanner/ItemInstance";

export function Market() {
  const G = useContext(GDataContext);
  const [lastRefresh, setLastRefresh] = useState<Date | undefined>(undefined);
  //   const [merchants, setMerchants] = useState<Merchant[]>([]);

  const [items, setItems] = useState<ItemsByNameAndLevel>({});
  const [filteredItems, setFilteredItems] = useState<ItemsByNameAndLevel>({});

  console.log("market redraw");
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
      setFilteredItems(groupedItems);
      //   setMerchants(parsed.merchants);

      return;
    }

    console.log("fetching data");
    axios
      .get("https://aldata.earthiverse.ca/merchants")
      .then(function (response) {
        // handle success
        setLastRefresh(new Date());
        const groupedItems = groupItemsByNameAndLevel(response.data);
        setItems(groupedItems);
        setFilteredItems(groupedItems);
        sessionStorage.setItem(
          "merchants",
          JSON.stringify({ timestamp: new Date(), merchants: response.data })
        );
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      })
      .then(function () {
        // always executed
      });
  }, []);

  // TODO: store stats for items every time you refresh and new data is present for a merchant

  // TODO: group by filter?
  // TODO: tooltip on hover with assorted calculations?

  const filterDataBySearch = (search: string) => {
    console.log("search triggered filterDataBySearch", search);
    if (!search) {
      setFilteredItems(items);
      return;
    }

    const result: ItemsByNameAndLevel = {};

    let itemName: ItemName;
    for (itemName in items) {
      const item = items[itemName];
      if (item) {
        const gItem = G?.items[itemName];
        if (itemName.indexOf(search) > -1) {
          result[itemName] = item;
        }
      }
    }

    setFilteredItems(result);
  };

  const onRefreshData = () => {
    sessionStorage.removeItem("merchants");
    setItems({});
  };

  let rows: Array<{
    level: number;
    itemName: ItemName;
    prices: BuySellItemPrices;
  }> = [];
  Object.entries(filteredItems).forEach(([key, levels]) => {
    const itemName = key as ItemName;
    for (const level in levels) {
      const prices = levels[level];
      rows.push({ level: Number(level), itemName, prices });
    }
  });
  // TODO: sort by level as well
  rows = rows.sort((a, b) => a.itemName.localeCompare(b.itemName));

  console.log("rows", rows);

  return (
    <>
      <Button onClick={onRefreshData}>Refresh Data</Button>
      <Typography variant="subtitle2">
        <>{lastRefresh?.toLocaleString()}</>
      </Typography>
      <Divider />
      <Search doSearch={filterDataBySearch} />
      <Table stickyHeader  size="small">
        <TableHead>
          <TableRow>
            <TableCell component="th" align="center" colSpan={2}></TableCell>
            <TableCell component="th" align="center" colSpan={5}>
              Buying
            </TableCell>
            <TableCell component="th" align="center" colSpan={5}>
              Selling
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th">Item</TableCell>
            <TableCell component="th">Name</TableCell>

            <TableCell component="th"># Buyers</TableCell>
            <TableCell component="th">Quantity</TableCell>
            <TableCell component="th">Min</TableCell>
            <TableCell component="th">Max</TableCell>
            <TableCell component="th">Avg</TableCell>

            <TableCell component="th"># Sellers</TableCell>
            <TableCell component="th">Quantity</TableCell>
            <TableCell component="th">Min</TableCell>
            <TableCell component="th">Max</TableCell>
            <TableCell component="th">Avg</TableCell>
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

function TradeItemRow({
  level,
  itemName,
  prices,
}: {
  level: number;
  itemName: ItemName;
  prices: BuySellItemPrices;
}) {
  const G = useContext(GDataContext);
  const gItem = G?.items[itemName];
  // TODO: should this be an accordian instead? or do we want a nested table
  // https://mui.com/material-ui/react-table/#column-grouping a group for buy vs sell?
  // collapse https://mui.com/material-ui/react-table/#collapsible-table

  const RenderShortNumber = (number?: number) => {
    if (number) {
      return (
        <TableCell component="td" title={number.toLocaleString()}>
          {abbreviateNumber(number)}
        </TableCell>
      );
    }

    return <TableCell component="td"></TableCell>;
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
        <TableCell component="td" title={price.toLocaleString() + " " + merchant}>
          {abbreviateNumber(price)}
        </TableCell>
      );
    }

    return <TableCell component="td"></TableCell>;
  };

  const buyerCount = Object.keys(prices.buying.merchants).length;
  const sellerCount = Object.keys(prices.selling.merchants).length;
  return (
    <TableRow
      hover
      sx={{
        "&:last-child td, &:last-child th": { border: 0 },
      }}
    >
      <TableCell>{itemName}</TableCell>
      <TableCell>
        <ItemInstance
          itemInfo={{
            name: itemName,
            level: level,
          }}
        />
        <span style={{ marginLeft: "15px" }}>{gItem?.name}</span>
      </TableCell>
      {/* buy averages, total items */}
      <TableCell component="td">{buyerCount ? buyerCount : ""}</TableCell>
      {RenderShortNumber(prices.buying.amount)}
      {RenderShortPriceWithMerchantName(prices.buying.minPrice)}
      {RenderShortPriceWithMerchantName(prices.buying.maxPrice)}
      {RenderShortNumber(prices.buying.avgPrice)}
      {/* sell averages, total items. */}
      <TableCell>{sellerCount ? sellerCount : ""}</TableCell>
      {RenderShortNumber(prices.selling.amount)}
      {RenderShortPriceWithMerchantName(prices.selling.minPrice)}
      {RenderShortPriceWithMerchantName(prices.selling.maxPrice)}
      {RenderShortNumber(prices.selling.avgPrice)}
    </TableRow>
  );
}

function Search({ doSearch }: { doSearch: (search: string) => void }) {
  const [search, setSearch] = useState("");
  const [changed, setChanged] = useState(false);

  const onSearch = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    console.log(value);
    setChanged(true);
    setSearch(value);
  };

  useEffect(() => {
    if (changed) {
      const timeOutId = setTimeout(() => doSearch(search), 500);
      return () => clearTimeout(timeOutId);
    }
  }, [search]);

  return (
    <Input
      id="search"
      placeholder="Search"
      onChange={onSearch}
      autoComplete="off"
    />
  );
}

function Overview({ merchants }: { merchants: Merchant[] }) {
  // TODO: extract out all items by item name and level
  // store each price per merchant
  // TODO: calculate lowest, highest and average price.
  // TODO: do this for buying vs selling
  return <>hello world</>;
}

type ItemPrices = {
  amount: number;
  minPrice: { merchant?: string; price: number };
  maxPrice: { merchant?: string; price: number };
  avgPrice: number;
  merchants: {
    [merchantName: string]: {
      merchant: { id: string; lastSeen: string };
      items: ItemInfo[];
    };
  };
};

type BuySellItemPrices = {
  buying: ItemPrices;
  selling: ItemPrices;
};

type ItemsByNameAndLevel = {
  [T in ItemName]?: BuySellItemPrices[]; // index is equal to level
};

function groupItemsByNameAndLevel(merchants: Merchant[]) {
  const result: ItemsByNameAndLevel = {};

  for (const merchant of merchants) {
    let tradeSlot: TradeSlotType;
    for (tradeSlot in merchant.slots) {
      const item = merchant.slots[tradeSlot];
      if (item) {
        let itemPrices = result[item.name];
        if (!itemPrices) {
          itemPrices = result[item.name] = [];
        }
        const level = item.level ?? 0;

        let itemPricesByLevel = itemPrices[level];

        if (!itemPricesByLevel) {
          itemPricesByLevel = itemPrices[level] = {
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
        }

        let buyingOrSelling: "buying" | "selling" = item.b
          ? "buying"
          : "selling";

        let itemsByBuyingOrSelling = itemPricesByLevel[buyingOrSelling];
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

          itemsByMerchant = itemsByBuyingOrSelling.merchants[merchant.id] = {
            merchant: { id, lastSeen },
            items: [],
          };
        }

        itemsByBuyingOrSelling.amount += item.q ?? 1;

        itemsByMerchant.items.push(item);
      }
    }
  }

  // TODO: loop result and summarize prices

  return result;
}

type Merchant = {
  /** name of the merchant */
  id: string;
  lastSeen: string;
  map: MapName;
  serverIdentifier: ServerIdentifier;
  serverRegion: ServerRegion;
  slots: { [T in TradeSlotType]?: ItemInfo };
  x: number;
  y: number;
};

// https://stackoverflow.com/a/32180863/28145
export function msToTime(ms: number) {
  const seconds = ms / 1000;
  const minutes = ms / (1000 * 60);
  const hours = ms / (1000 * 60 * 60);
  const days = ms / (1000 * 60 * 60 * 24);
  // TODO: could render the "rest" as welll e.g. "1 day, 1 hour, 1 minute, 1 second"
  if (seconds < 60) return seconds.toFixed(1) + " s";
  else if (minutes < 60) return minutes.toFixed(1) + " m";
  else if (hours < 24) return hours.toFixed(1) + " H";
  else return days.toFixed(1) + " D";
}

// https://stackoverflow.com/a/40724354/28145
var SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];

function abbreviateNumber(number?: number) {
  if (!number) {
    return number;
  }

  // what tier? (determines SI symbol)
  var tier = (Math.log10(Math.abs(number)) / 3) | 0;

  // if zero, we don't need a suffix
  if (tier === 0) return number;

  // get suffix and determine scale
  var suffix = SI_SYMBOL[tier];
  var scale = Math.pow(10, tier * 3);

  // scale the number
  var scaled = number / scale;

  // format number and add suffix
  return scaled.toFixed(1) + suffix;
}
