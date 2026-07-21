import { useState, useEffect, useContext } from "react";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewCompactIcon from "@mui/icons-material/ViewCompact";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { ItemKey, ItemType } from "typed-adventureland";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getBankData, BankDataProps } from "./getBankData";
import { BankPacksView } from "./BankPacksView";
import { findMatchingListings, getOwnerTrades } from "./getTrades";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { abbreviateNumber, msToTime } from "../Shared/utils";
import { getItemName, getItemInstanceTitle, getTitleName } from "../Shared/iteminfo-util";
import { ListingNotes, TradeSideSummary, formatGoldPrice } from "../Trades/TradeSideDisplay";
import { TradeListing } from "../Trades/tradeTypes";

type BankRenderProps = {
  ownerId: string;
};

type AggregatedBankItem = {
  p?: string;
  level?: number;
  name: ItemKey;
  q: number;
  stack: number;
  category: string;
  type?: string;
  listings: TradeListing[];
};

const types: { [key in ItemType | "exchange" | "other"]?: string } = {
  helmet: "Helmets",
  chest: "Armors",
  pants: "Pants",
  gloves: "Gloves",
  shoes: "Shoes",
  cape: "Capes",
  ring: "Rings",
  earring: "Earrings",
  amulet: "Amulets",
  belt: "Belts",
  orb: "Orbs",
  weapon: "Weapons",
  shield: "Shields",
  source: "Offhands",
  quiver: "Offhands",
  misc_offhand: "Offhands",
  elixir: "Elixirs",
  pot: "Potions",
  cscroll: "Scrolls",
  uscroll: "Scrolls",
  pscroll: "Scrolls",
  offering: "Scrolls",
  material: "Crafting and Collecting",
  exchange: "Exchangeables",
  dungeon_key: "Keys",
  token: "Tokens",
  other: "Others",
};

function getUniqueItemKey(item: { name: string; level?: number; p?: string }) {
  return `${item.p ?? ""}${item.level}${item.name}`;
}

function itemHasTradeInfo(item: AggregatedBankItem) {
  return item.listings.length > 0;
}

function TradeBadges({ listings }: { listings: TradeListing[] }) {
  if (!listings.length) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, marginTop: 0.5 }}>
      {listings.map((listing) => (
        <Box
          key={`${listing.name}-${listing.level ?? ""}-${listing.p ?? ""}-${listing.note ?? ""}-${
            listing.wts?.price ?? ""
          }-${listing.wtb?.price ?? ""}`}
          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}
        >
          {listing.wts && <TradeSideSummary label="WTS" side={listing.wts} compact />}
          {listing.wtb && <TradeSideSummary label="WTB" side={listing.wtb} compact />}
          {listing.wts && formatGoldPrice(listing.wts) && (
            <Typography variant="caption" title={listing.wts.price?.toLocaleString()}>
              WTS {formatGoldPrice(listing.wts)}
            </Typography>
          )}
          {listing.wtb && formatGoldPrice(listing.wtb) && (
            <Typography variant="caption" title={listing.wtb.price?.toLocaleString()}>
              WTB {formatGoldPrice(listing.wtb)}
            </Typography>
          )}
          {(listing.wts?.trades ?? []).map((offer) => (
            <Typography
              key={`wts-${offer.item.name}-${offer.item.level ?? ""}-${offer.give}-${
                offer.receive
              }`}
              variant="caption"
              color="text.secondary"
            >
              WTS {offer.give}:{offer.receive} {offer.item.name}
              {offer.negotiable ? " (nego)" : ""}
            </Typography>
          ))}
          {(listing.wtb?.trades ?? []).map((offer) => (
            <Typography
              key={`wtb-${offer.item.name}-${offer.item.level ?? ""}-${offer.give}-${
                offer.receive
              }`}
              variant="caption"
              color="text.secondary"
            >
              WTB {offer.give}:{offer.receive} {offer.item.name}
              {offer.negotiable ? " (nego)" : ""}
            </Typography>
          ))}
          <ListingNotes note={listing.note} />
        </Box>
      ))}
    </Box>
  );
}

function BankTableView({ items }: { items: AggregatedBankItem[] }) {
  const G = useContext(GDataContext);

  return (
    <Table stickyHeader size="small">
      <TableHead>
        <TableRow>
          <TableCell component="th" width={100}>
            Category
          </TableCell>
          <TableCell component="th" width={100} align="right">
            Quantity
          </TableCell>
          <TableCell component="th">Name</TableCell>
          <TableCell component="th">Level</TableCell>
          <TableCell component="th">Stacks</TableCell>
          <TableCell component="th">Trades</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((itemInfo) => {
          const itemKey = itemInfo.name as ItemKey;
          const gItem = G?.items[itemKey];
          if (!gItem) return <></>;

          const stackSize = Number(gItem.s);
          const stackCount = itemInfo.stack;
          const optimalStackCount = Math.ceil(itemInfo.q / stackSize);
          const optimalStackCountMessage =
            stackCount > optimalStackCount ? `⚠️${optimalStackCount}` : "";

          let titleName = getTitleName(itemInfo, G);
          if (titleName) {
            titleName += " ";
          }

          const itemName = getItemName(itemKey, gItem);

          return (
            <TableRow key={getUniqueItemKey(itemInfo)} hover>
              <TableCell component="td">{itemInfo.category}</TableCell>
              <TableCell component="td" align="right" title={itemInfo.q.toLocaleString()}>
                {abbreviateNumber(itemInfo.q)}
              </TableCell>
              <TableCell component="td">
                <div style={{ display: "inline-block" }}>
                  <ItemInstance
                    itemInfo={{
                      name: itemInfo.name,
                      level: itemInfo.level,
                      p: itemInfo.p as any,
                      q: itemInfo.q,
                    }}
                  />
                </div>
                <div style={{ marginLeft: "10px", display: "inline-block" }}>
                  <div>
                    {titleName}
                    {itemName}
                  </div>
                  <div style={{ color: "grey" }}>{itemInfo.name}</div>
                </div>
              </TableCell>
              <TableCell component="td">{itemInfo.level}</TableCell>
              <TableCell component="td">
                {itemInfo.stack}
                {optimalStackCountMessage}
              </TableCell>
              <TableCell component="td">
                <TradeBadges listings={itemInfo.listings} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function BankGridViewItemRow({ items }: { items: AggregatedBankItem[] }) {
  const G = useContext(GDataContext);

  return (
    <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "2px" }}>
      {items.map((itemInfo) => {
        const itemKey = itemInfo.name as ItemKey;
        const gItem = G?.items[itemKey];
        if (!gItem || !G) return <></>;

        const instance = {
          name: itemInfo.name,
          level: itemInfo.level,
          p: itemInfo.p as any,
          q: itemInfo.q,
        };

        let htmlTitle = getItemInstanceTitle(instance, G);
        if (itemInfo.listings.length) {
          htmlTitle += `\n${itemInfo.listings.length} trade listing(s)`;
        }

        return (
          <div key={getUniqueItemKey(itemInfo)} title={htmlTitle} style={{ position: "relative" }}>
            <ItemInstance showQuantity itemInfo={instance} />
            {itemHasTradeInfo(itemInfo) && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "1px",
                }}
              >
                {itemInfo.listings.some((l) => l.wts) && (
                  <TradeSideSummary
                    label="WTS"
                    side={itemInfo.listings.find((l) => l.wts)?.wts}
                    compact
                  />
                )}
                {itemInfo.listings.some((l) => l.wtb) && (
                  <TradeSideSummary
                    label="WTB"
                    side={itemInfo.listings.find((l) => l.wtb)?.wtb}
                    compact
                  />
                )}
              </Box>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BankGridView({
  items,
  itemsByCategory,
  showCategory,
}: {
  items: AggregatedBankItem[];
  itemsByCategory: Record<string, AggregatedBankItem[]>;
  showCategory: boolean;
}) {
  const sortedGroupKeys = [...new Set(Object.values(types))];

  return (
    <>
      <div style={{ width: "100%" }}>
        {showCategory ? (
          sortedGroupKeys.map((category) => {
            const categoryItems = itemsByCategory[category];
            if (!categoryItems) return <></>;
            return (
              <div
                key={category}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: "2px",
                  alignItems: "center",
                }}
              >
                <h1>{category}</h1>
                <BankGridViewItemRow items={categoryItems} />
              </div>
            );
          })
        ) : (
          <BankGridViewItemRow items={items} />
        )}
      </div>
    </>
  );
}

export function BankRender(props: BankRenderProps) {
  const G = useContext(GDataContext);
  const { ownerId } = props;

  const [bankData, setBankData] = useState<BankDataProps>({});
  const [tradeListings, setTradeListings] = useState<TradeListing[]>([]);
  const [owner, setOwner] = useState<string>("");
  const [renderMode, setRenderMode] = useState<"list" | "grid" | "gridCompact" | "packs">(
    "gridCompact",
  );
  const [sortMode, setSortMode] = useState<"category" | "quantity" | "stack">("category");
  const [onlyWithTrades, setOnlyWithTrades] = useState(false);

  useEffect(() => {
    if (!Object.keys(bankData).length) {
      getBankData(ownerId).then((newBankData) => {
        if (Object.keys(newBankData).length) {
          setBankData({ ...newBankData });
        }
      });
      getOwnerTrades(ownerId).then((trades) => {
        setTradeListings(trades.listings ?? []);
      });
    }

    if (owner !== ownerId) {
      setOwner(ownerId);
      setBankData({});
      setTradeListings([]);
    }
  }, [bankData, owner, ownerId]);

  if (!Object.keys(bankData).length) {
    return <></>;
  }

  const onSortModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSortMode((event.target as HTMLInputElement).value as any);
  };

  let usedSlots = 0;
  let totalSlots = 0;
  const items: AggregatedBankItem[] = [];
  const itemsByKey: Record<string, AggregatedBankItem> = {};
  const itemsByCategory: Record<string, AggregatedBankItem[]> = {};

  // eslint-disable-next-line guard-for-in
  for (const bankKey in bankData) {
    const bankItems = bankData[bankKey];
    if (!Array.isArray(bankItems)) continue;

    totalSlots += 42;

    for (const item of bankItems) {
      if (!item) continue;

      usedSlots++;

      const key = getUniqueItemKey(item);
      let data = itemsByKey[key];
      if (!data) {
        const itemKey = item.name as ItemKey;
        const gItem = G?.items[itemKey];
        let category = (gItem && types[gItem.type]) ?? "Others";

        if (gItem && gItem.e) {
          category = types.exchange ?? "Others";
        }

        data = {
          p: item.p,
          level: item.level,
          name: itemKey,
          q: 0,
          stack: 0,
          category,
          type: gItem?.type ?? undefined,
          listings: findMatchingListings(tradeListings, item),
        };

        itemsByKey[key] = data;

        items.push(data);

        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        itemsByCategory[category].push(data);
      }
      data.q += item.q ?? 1;
      data.stack++;
    }
  }

  const sortedGroupKeys = [...new Set(Object.values(types))];

  items.sort((a, b) => {
    if (sortMode === "stack" && a.stack !== b.stack) {
      return b.stack - a.stack;
    }

    if (sortMode === "quantity" && a.q !== b.q) {
      return b.q - a.q;
    }

    if (a.category !== b.category) {
      return sortedGroupKeys.indexOf(a.category) - sortedGroupKeys.indexOf(b.category);
    }

    if (a.type && b.type && a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }

    if (a.name !== b.name) {
      return a.name.localeCompare(b.name);
    }

    return (b.level ?? 0) - (a.level ?? 0);
  });

  const visibleItems = onlyWithTrades ? items.filter(itemHasTradeInfo) : items;
  const visibleItemsByCategory: Record<string, AggregatedBankItem[]> = {};
  for (const item of visibleItems) {
    if (!visibleItemsByCategory[item.category]) {
      visibleItemsByCategory[item.category] = [];
    }
    visibleItemsByCategory[item.category].push(item);
  }

  const lastUpdated = bankData.lastUpdated ? new Date(bankData.lastUpdated) : undefined;
  const lastUpdateAgo = lastUpdated ? msToTime(new Date().getTime() - lastUpdated.getTime()) : "";
  const tradeCount = items.filter(itemHasTradeInfo).length;

  return (
    <>
      {renderMode !== "packs" && (
        <Grid container>
          <Grid xs={4}>
            <FormControl>
              <FormLabel id="demo-controlled-radio-buttons-group">Sorting</FormLabel>
              <RadioGroup
                row
                aria-labelledby="demo-controlled-radio-buttons-group"
                name="controlled-radio-buttons-group"
                value={sortMode}
                onChange={onSortModeChange}
              >
                <FormControlLabel value="category" control={<Radio />} label="Category" />
                <FormControlLabel value="quantity" control={<Radio />} label="Quantity" />
                <FormControlLabel value="stack" control={<Radio />} label="Stack" />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid xs={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={onlyWithTrades}
                  onChange={(e) => setOnlyWithTrades(e.target.checked)}
                />
              }
              label={`Only items with trade info (${tradeCount})`}
            />
          </Grid>
        </Grid>
      )}
      <Grid container>
        <Grid xs={4}>
          {usedSlots} / {totalSlots} ({totalSlots - usedSlots})
        </Grid>

        <Grid xs={4}>
          {lastUpdated?.toLocaleString()} ({lastUpdateAgo} Ago)
        </Grid>
        <Grid xs={4} container justifyContent="right">
          <ViewCompactIcon
            titleAccess="Show Compact Grid"
            style={{ cursor: "pointer" }}
            onClick={() => setRenderMode("gridCompact")}
            color={renderMode === "gridCompact" ? "primary" : "secondary"}
          />
          <ViewListIcon
            titleAccess="Show List"
            style={{ cursor: "pointer" }}
            onClick={() => setRenderMode("list")}
            color={renderMode === "list" ? "primary" : "secondary"}
          />
          <GridViewIcon
            titleAccess="Show Grid"
            style={{ cursor: "pointer" }}
            onClick={() => setRenderMode("grid")}
            color={renderMode === "grid" ? "primary" : "secondary"}
          />
          <ViewModuleIcon
            titleAccess="Show Bank Packs"
            style={{ cursor: "pointer" }}
            onClick={() => setRenderMode("packs")}
            color={renderMode === "packs" ? "primary" : "secondary"}
          />
        </Grid>
      </Grid>

      {(renderMode === "grid" || renderMode === "gridCompact") && (
        <BankGridView
          showCategory={renderMode === "grid"}
          items={visibleItems}
          itemsByCategory={visibleItemsByCategory}
        />
      )}
      {renderMode === "list" && <BankTableView items={visibleItems} />}
      {renderMode === "packs" && <BankPacksView bankData={bankData} />}
    </>
  );
}
