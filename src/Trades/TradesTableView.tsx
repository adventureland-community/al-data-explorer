import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { useContext } from "react";
import { Link as RouterLink } from "react-router-dom";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { formatItemDisplayName } from "../Shared/iteminfo-util";
import { msToTime } from "../Shared/utils";
import { CopyTradeButton } from "./CopyTradeButton";
import { ListingNotes, TradeSideSummary, formatGoldPriceLabel } from "./TradeSideDisplay";
import { TradeRatioRow } from "./TradeRatioRow";
import { TableSortKey, TradeRow, itemRefToItemInfo } from "./tradeViewModel";

function listingRowKey(row: TradeRow): string {
  return `${row.listing.name}-${row.listing.level ?? ""}-${row.listing.p ?? ""}-${
    row.listing.note ?? ""
  }`;
}

function TradeTableRow({ row, G }: { row: TradeRow; G: any }) {
  const { listing, tradeSide, side, owner, ownerLabel, lastUpdated, discordName, discordId } = row;
  const itemInfo = itemRefToItemInfo(listing);
  const displayName = G ? formatItemDisplayName(itemInfo, G) : listing.name;
  const gold = formatGoldPriceLabel(tradeSide);
  const lastUpdatedDate = lastUpdated ? new Date(lastUpdated) : undefined;
  const lastUpdateAgo = lastUpdatedDate
    ? msToTime(new Date().getTime() - lastUpdatedDate.getTime())
    : "";

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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ItemInstance itemInfo={itemInfo} />
          <Box>
            <div>{displayName}</div>
            <Typography variant="caption" color="text.secondary">
              {listing.name}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>{listing.level ?? ""}</TableCell>
      <TableCell>
        <TradeSideSummary label={side} side={tradeSide} />
      </TableCell>
      <TableCell title={tradeSide.price?.toLocaleString()}>{gold ?? ""}</TableCell>
      <TableCell>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {(tradeSide.trades ?? []).map((offer) => (
            <TradeRatioRow
              key={`${offer.item.name}-${offer.item.level ?? ""}-${offer.give}-${offer.receive}`}
              listing={listing}
              offer={offer}
              compact
              reserveNegotiableSlot={(tradeSide.trades ?? []).some((t) => !!t.negotiable)}
            />
          ))}
        </Box>
      </TableCell>
      <TableCell>
        <ListingNotes note={listing.note} />
      </TableCell>
      <TableCell>
        {lastUpdatedDate ? `${lastUpdatedDate.toLocaleString()} (${lastUpdateAgo} Ago)` : ""}
      </TableCell>
      <TableCell>
        <CopyTradeButton row={row} />
      </TableCell>
    </TableRow>
  );
}

export function TradesTableView({
  rows,
  sortKey,
  onSortChange,
}: {
  rows: TradeRow[];
  sortKey: TableSortKey;
  onSortChange: (key: TableSortKey) => void;
}) {
  const G = useContext(GDataContext);

  return (
    <Table stickyHeader size="small">
      <TableHead>
        <TableRow>
          <TableCell sortDirection={sortKey === "owner" ? "asc" : false}>
            <TableSortLabel active={sortKey === "owner"} onClick={() => onSortChange("owner")}>
              Owner
            </TableSortLabel>
          </TableCell>
          <TableCell sortDirection={sortKey === "item" ? "asc" : false}>
            <TableSortLabel active={sortKey === "item"} onClick={() => onSortChange("item")}>
              Item
            </TableSortLabel>
          </TableCell>
          <TableCell>Level</TableCell>
          <TableCell sortDirection={sortKey === "side" ? "asc" : false}>
            <TableSortLabel active={sortKey === "side"} onClick={() => onSortChange("side")}>
              Side
            </TableSortLabel>
          </TableCell>
          <TableCell>Gold</TableCell>
          <TableCell>Item trades</TableCell>
          <TableCell>Notes</TableCell>
          <TableCell sortDirection={sortKey === "updated" ? "desc" : false}>
            <TableSortLabel active={sortKey === "updated"} onClick={() => onSortChange("updated")}>
              Updated
            </TableSortLabel>
          </TableCell>
          <TableCell>Message</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TradeTableRow key={`${row.owner}-${row.side}-${listingRowKey(row)}`} row={row} G={G} />
        ))}
      </TableBody>
    </Table>
  );
}
