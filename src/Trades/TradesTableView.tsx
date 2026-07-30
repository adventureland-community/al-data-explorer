import {
  Box,
  Chip,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
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
import { TradeOfferTerms } from "./TradeOfferTerms";
import { TableSortKey, TradeRow, itemRefToItemInfo } from "./tradeViewModel";

function listingRowKey(row: TradeRow): string {
  return `${row.listing.name}-${row.listing.level ?? ""}-${row.listing.p ?? ""}-${
    row.listing.note ?? ""
  }`;
}

function relativeUpdated(lastUpdated?: number): string {
  if (!lastUpdated) {
    return "";
  }
  const ago = msToTime(Date.now() - lastUpdated);
  return `${ago} ago`;
}

function TradeTableRow({ row, G }: { row: TradeRow; G: any }) {
  const { listing, tradeSide, side, owner, ownerLabel, lastUpdated, discordName, discordId } = row;
  const itemInfo = itemRefToItemInfo(listing);
  const displayName = G ? formatItemDisplayName(itemInfo, G) : listing.name;
  const note = tradeSide.note ?? listing.note;

  return (
    <TableRow
      hover
      title={note || undefined}
      sx={{
        borderLeft: 3,
        borderLeftColor: side === "WTS" ? "success.main" : "info.main",
      }}
    >
      <TableCell sx={{ verticalAlign: "middle", py: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, minWidth: 0 }}>
          <Link
            component={RouterLink}
            to={`/bank?owner=${encodeURIComponent(owner)}`}
            underline="hover"
            title={owner}
            sx={{
              fontSize: "0.85rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 140,
            }}
          >
            {ownerLabel}
          </Link>
          <CopyTradeButton row={row} iconOnly />
        </Box>
        {discordName && discordName.toLowerCase() !== ownerLabel.toLowerCase() ? (
          <Typography variant="caption" display="block" color="text.secondary" title={discordId}>
            @{discordName}
          </Typography>
        ) : null}
      </TableCell>
      <TableCell sx={{ verticalAlign: "middle", py: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ItemInstance itemInfo={itemInfo} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap title={displayName} sx={{ fontWeight: 600 }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {listing.name}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell sx={{ verticalAlign: "middle", py: 1 }}>
        <Chip
          size="small"
          color={side === "WTS" ? "success" : "info"}
          label={side}
          sx={{ height: 22, fontWeight: 700 }}
        />
      </TableCell>
      <TableCell sx={{ verticalAlign: "middle", py: 1, minWidth: 160 }}>
        <TradeOfferTerms listing={listing} tradeSide={tradeSide} side={side} layout="table" />
      </TableCell>
      <TableCell sx={{ verticalAlign: "middle", py: 1, whiteSpace: "nowrap" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          title={new Date(lastUpdated ?? 0).toLocaleString()}
        >
          {relativeUpdated(lastUpdated)}
        </Typography>
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
    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
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
            <TableCell sortDirection={sortKey === "side" ? "asc" : false}>
              <TableSortLabel active={sortKey === "side"} onClick={() => onSortChange("side")}>
                Side
              </TableSortLabel>
            </TableCell>
            <TableCell>Terms</TableCell>
            <TableCell sortDirection={sortKey === "updated" ? "desc" : false}>
              <TableSortLabel
                active={sortKey === "updated"}
                onClick={() => onSortChange("updated")}
              >
                Updated
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TradeTableRow key={`${row.owner}-${row.side}-${listingRowKey(row)}`} row={row} G={G} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
