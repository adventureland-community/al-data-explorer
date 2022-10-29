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
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | undefined>(undefined);

  console.log("market redraw");
  useEffect(() => {
    // TODO: should probably cache this somehow, perhaps track diffs in localstorage?
    // or build a database or something.

    const sessionStorageMerchants = sessionStorage.getItem("merchants");

    if (sessionStorageMerchants) {
      console.log("fetching data from session");
      const parsed = JSON.parse(sessionStorageMerchants);
      setLastRefresh(new Date(parsed.timestamp));

      setMerchants(parsed.merchants);
      setFilteredMerchants([...merchants].reverse());
      return;
    }

    console.log("fetching data");
    axios
      .get("https://aldata.earthiverse.ca/merchants")
      .then(function (response) {
        // handle success
        setLastRefresh(new Date());
        setMerchants(response.data);
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
  }, [merchants.length]);

  // TODO: restructure the data to be per item, per level, with buyers and sellers
  // TODO: render each item as an accordion, with min,max and average price for buying and selling
  // TODO: store stats for items every time you refresh and new data is present for a merchant

  // TODO: a search, filtering everything by search
  // TODO: should we group items by merchant, or should we group it differently?
  // TODO: let's just recreate the marketplace as an initial attempt

  // TODO: group by filter?
  // TODO: tooltip on hove with assorted calculations?

  const filterDataBySearch = (search: string) => {
    console.log("search triggered filterDataBySearch", search);
    if (!search) {
      setFilteredMerchants([...merchants].reverse());
      return;
    }

    const result: Merchant[] = [];
    const merchantsByLastSeen = [...merchants].reverse();
    for (const merchant of merchantsByLastSeen) {
      const clonedMerchant = { ...merchant };
      clonedMerchant.slots = {};
      let hasItem = false;

      let tradeSlot: TradeSlotType;
      for (tradeSlot in merchant.slots) {
        const item = merchant.slots[tradeSlot];
        if (item) {
          const gItem = G?.items[item.name];
          if (item.name.indexOf(search) > -1) {
            hasItem = true;
            clonedMerchant.slots[tradeSlot] = item;
          }
        }
      }

      if (hasItem) {
        result.push(clonedMerchant);
      }
    }

    setFilteredMerchants(result);
  };

  const onRefreshData = () => {
    sessionStorage.removeItem("merchants");
    setMerchants([]);
  };

  return (
    <>
      <Button onClick={onRefreshData}>Refresh Data</Button>
      <Typography variant="subtitle2">
        <>{lastRefresh?.toLocaleString()}</>
      </Typography>
      <Divider />
      <Search doSearch={filterDataBySearch} />
      {filteredMerchants.map((merchant) => {
        const ms = new Date().getTime() - new Date(merchant.lastSeen).getTime();
        const timeago = msToTime(ms);
        return (
          <div key={merchant.id} style={{ textAlign: "left", padding: "5px" }}>
            <Typography variant="h4">{merchant.id}</Typography>
            <Typography variant="subtitle1">{timeago} Ago</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="100px;"></TableCell>
                  <TableCell width="100px;">Price</TableCell>
                  <TableCell width="50px;">Quantity</TableCell>
                  <TableCell width="50px;">Item</TableCell>
                  <TableCell>Item Name</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(merchant.slots).map(([slot, item]) => {
                  const gItem = G?.items[item.name];
                  const price = abbreviateNumber(item.price);
                  return (
                    <TableRow
                      key={merchant.id + slot}
                      hover
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                      }}
                    >
                      <TableCell>{item.b ? "Buying" : "Selling"}</TableCell>
                      <TableCell title={item.price?.toString()}>
                        {price}
                      </TableCell>
                      <TableCell>{item.q}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <ItemInstance
                          itemInfo={{
                            name: item.name,
                            level: item.level,
                          }}
                        />
                        <span style={{ marginLeft: "15px" }}>
                          {gItem?.name}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </>
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

function groupItemsByNameAndLevel(merchants: Merchant[]) {
  const result: {
    [T in ItemName]?: [
      {
        buying: {
          minPrice: number;
          maxPrice: number;
          avgPrice: number;
          merchants: { [merchantName: string]: ItemInfo[] };
        };
        selling: {
          minPrice: number;
          maxPrice: number;
          avgPrice: number;
          merchants: { [merchantName: string]: ItemInfo[] };
        };
      }
    ]; // index is equal to level
  } = {};

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
