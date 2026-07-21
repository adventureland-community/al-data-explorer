import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { getAllTrades } from "../Bank/getTrades";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { getItemName, getTitleName } from "../Shared/iteminfo-util";
import { msToTime } from "../Shared/utils";
import { formatCopyTradeMessage } from "./formatCopyTradeMessage";
import { ListingNotes, TradeSideSummary, formatGoldPrice } from "./TradeSideDisplay";
import { OwnerTrades, TradeListing, TradeSide } from "./tradeTypes";
import { formatOwnerLabel } from "../Shared/ownerLabel";

type SideFilter = "all" | "wts" | "wtb";

type TradeRow = {
  owner: string;
  ownerLabel: string;
  listing: TradeListing;
  side: "WTS" | "WTB";
  tradeSide: TradeSide;
  lastUpdated?: number;
  discordName?: string;
  discordId?: string;
};

function Info() {
  return (
    <Card sx={{ marginBottom: 2 }}>
      <CardContent>
        <Typography component="div">
          Bank trade listings from{" "}
          <a href="https://aldata.earthiverse.ca">earthiverse&apos;s aldata</a> — player WTS/WTB
          offers attached to shared banks. Distinct from the Market page (merchant stands). Use
          Copy to build a Discord message (includes a pingable mention when the seller set{" "}
          <code>discordId</code>).
        </Typography>
      </CardContent>
    </Card>
  );
}

function flattenTrades(owners: OwnerTrades[]): TradeRow[] {
  const rows: TradeRow[] = [];

  for (const ownerEntry of owners) {
    for (const listing of ownerEntry.listings ?? []) {
      const shared = {
        owner: ownerEntry.owner,
        ownerLabel: formatOwnerLabel(
          ownerEntry.owner,
          ownerEntry.characters,
          ownerEntry.label,
          ownerEntry.displayName,
        ),
        listing,
        lastUpdated: ownerEntry.lastUpdated,
        discordName: ownerEntry.discordName,
        discordId: ownerEntry.discordId,
      };
      if (listing.wts) {
        rows.push({
          ...shared,
          side: "WTS",
          tradeSide: listing.wts,
        });
      }
      if (listing.wtb) {
        rows.push({
          ...shared,
          side: "WTB",
          tradeSide: listing.wtb,
        });
      }
    }
  }

  return rows;
}

function TradeRowView({ row }: { row: TradeRow }) {
  const G = useContext(GDataContext);
  const { listing, tradeSide, side, owner, ownerLabel, lastUpdated, discordName, discordId } = row;
  const [copied, setCopied] = useState(false);
  const itemKey = listing.name as ItemKey;
  const gItem = G?.items[itemKey];

  const itemInfo = {
    name: itemKey,
    level: listing.level,
    p: listing.p as any,
  };

  let titleName = G ? getTitleName(itemInfo, G) : "";
  if (titleName) {
    titleName += " ";
  }
  const itemName = gItem ? getItemName(itemKey, gItem) : listing.name;
  const gold = formatGoldPrice(tradeSide);
  const lastUpdatedDate = lastUpdated ? new Date(lastUpdated) : undefined;
  const lastUpdateAgo = lastUpdatedDate
    ? msToTime(new Date().getTime() - lastUpdatedDate.getTime())
    : "";

  const onCopy = async () => {
    const text = formatCopyTradeMessage({
      ownerLabel,
      listing,
      side,
      tradeSide,
      discordName,
      discordId,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; ignore
    }
  };

  return (
    <TableRow hover>
      <TableCell>
        <Button
          component={RouterLink}
          to={`/bank?owner=${encodeURIComponent(owner)}`}
          size="small"
          sx={{ textTransform: "none", minWidth: 0, padding: 0 }}
          title={owner}
        >
          {ownerLabel}
        </Button>
        {discordName && discordName.toLowerCase() !== ownerLabel.toLowerCase() ? (
          <Typography variant="caption" display="block" color="text.secondary" title={discordId}>
            @{discordName}
          </Typography>
        ) : null}
      </TableCell>
      <TableCell>
        <div style={{ display: "inline-block" }}>
          <ItemInstance itemInfo={itemInfo} />
        </div>
        <div style={{ marginLeft: "10px", display: "inline-block" }}>
          <div>
            {titleName}
            {itemName}
          </div>
          <div style={{ color: "grey" }}>{listing.name}</div>
        </div>
      </TableCell>
      <TableCell>{listing.level ?? ""}</TableCell>
      <TableCell>
        <TradeSideSummary label={side} side={tradeSide} />
      </TableCell>
      <TableCell title={tradeSide.price?.toLocaleString()}>{gold ?? ""}</TableCell>
      <TableCell>
        {(tradeSide.trades ?? []).map((offer) => (
          <div
            key={`${offer.item.name}-${offer.item.level ?? ""}-${offer.give}-${offer.receive}-${
              offer.negotiable ? "n" : ""
            }`}
          >
            {offer.give}:{offer.receive} {offer.item.name}
            {offer.item.level !== undefined ? `+${offer.item.level}` : ""}
            {offer.negotiable ? " (nego)" : ""}
          </div>
        ))}
      </TableCell>
      <TableCell>
        <ListingNotes note={listing.note} />
      </TableCell>
      <TableCell>
        {lastUpdatedDate ? `${lastUpdatedDate.toLocaleString()} (${lastUpdateAgo} Ago)` : ""}
      </TableCell>
      <TableCell>
        <Button size="small" onClick={onCopy} sx={{ textTransform: "none" }}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function Trades() {
  const G = useContext(GDataContext);
  const [owners, setOwners] = useState<OwnerTrades[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [itemFilter, setItemFilter] = useState("");
  const [hasGoldPrice, setHasGoldPrice] = useState(false);
  const [hasItemTrades, setHasItemTrades] = useState(false);

  useEffect(() => {
    getAllTrades().then((data) => {
      setOwners(data);
      setLoaded(true);
    });
  }, []);

  const rows = useMemo(() => flattenTrades(owners), [owners]);

  const filteredRows = useMemo(() => {
    const lowercaseFilter = itemFilter.trim().toLowerCase();
    const searchTerms = lowercaseFilter
      ? [...lowercaseFilter.split(" "), ...lowercaseFilter.split(",")].filter(Boolean)
      : [];

    return rows.filter((row) => {
      if (sideFilter === "wts" && row.side !== "WTS") {
        return false;
      }
      if (sideFilter === "wtb" && row.side !== "WTB") {
        return false;
      }
      if (hasGoldPrice && row.tradeSide.price === undefined) {
        return false;
      }
      if (hasItemTrades && !(row.tradeSide.trades && row.tradeSide.trades.length > 0)) {
        return false;
      }

      if (searchTerms.length) {
        const gItem = G?.items[row.listing.name as ItemKey];
        const names = [row.listing.name, gItem?.name ?? ""].map((n) => n.toLowerCase());
        const matches = searchTerms.some((term) => names.some((name) => name.includes(term)));
        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }, [rows, sideFilter, itemFilter, hasGoldPrice, hasItemTrades, G]);

  if (!G) {
    return <>WAITING!</>;
  }

  return (
    <>
      <Info />
      {!loaded && <Typography>Loading trades…</Typography>}
      {loaded && owners.length === 0 && (
        <Typography color="text.secondary">
          No trade listings returned (endpoint may be empty or unavailable).
        </Typography>
      )}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="flex-start">
        <TextField
          label="Search items"
          variant="outlined"
          size="small"
          value={itemFilter}
          onChange={(e) => setItemFilter(e.target.value)}
          sx={{ width: 280 }}
        />
        <FormControl>
          <FormLabel>Side</FormLabel>
          <RadioGroup
            row
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value as SideFilter)}
          >
            <FormControlLabel value="all" control={<Radio />} label="All" />
            <FormControlLabel value="wts" control={<Radio />} label="WTS" />
            <FormControlLabel value="wtb" control={<Radio />} label="WTB" />
          </RadioGroup>
        </FormControl>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox
                checked={hasGoldPrice}
                onChange={(e) => setHasGoldPrice(e.target.checked)}
              />
            }
            label="Has gold price"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={hasItemTrades}
                onChange={(e) => setHasItemTrades(e.target.checked)}
              />
            }
            label="Has item trades"
          />
        </FormGroup>
      </Box>
      <Divider sx={{ marginBottom: 2 }} />
      <Typography variant="body2" sx={{ marginBottom: 1 }}>
        {filteredRows.length} listing{filteredRows.length === 1 ? "" : "s"}
      </Typography>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>Owner</TableCell>
            <TableCell>Item</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>Side</TableCell>
            <TableCell>Gold</TableCell>
            <TableCell>Item trades</TableCell>
            <TableCell>Notes</TableCell>
            <TableCell>Updated</TableCell>
            <TableCell>Message</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredRows.map((row) => (
            <TradeRowView
              key={`${row.owner}-${row.side}-${row.listing.name}-${row.listing.level ?? ""}-${
                row.listing.p ?? ""
              }-${row.listing.note ?? ""}`}
              row={row}
            />
          ))}
        </TableBody>
      </Table>
    </>
  );
}
