import { Box, Button, Card, CardContent, Chip, Divider, Typography } from "@mui/material";
import { useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { getItemName, getTitleName } from "../Shared/iteminfo-util";
import { CopyTradeButton } from "./CopyTradeButton";
import { formatPriceShort } from "./TradesOverview";
import { ListingNotes, TradeSideSummary, formatGoldPrice } from "./TradeSideDisplay";
import { GroupedTradeItem, TradeRow, itemRefToItemInfo } from "./tradeViewModel";

const MAX_LISTINGS_SHOWN = 4;

function ListingOfferRow({ row }: { row: TradeRow }) {
  const { owner, ownerLabel, listing, side, tradeSide, discordName } = row;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 1,
        py: 0.75,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Button
          component={RouterLink}
          to={`/bank?owner=${encodeURIComponent(owner)}`}
          size="small"
          sx={{ textTransform: "none", minWidth: 0, p: 0, mb: 0.25 }}
          title={owner}
        >
          {ownerLabel}
        </Button>
        {discordName && discordName.toLowerCase() !== ownerLabel.toLowerCase() ? (
          <Typography variant="caption" display="block" color="text.secondary">
            @{discordName}
          </Typography>
        ) : null}
        <TradeSideSummary label={side} side={tradeSide} listing={listing} />
        <ListingNotes note={listing.note} />
      </Box>
      <CopyTradeButton row={row} />
    </Box>
  );
}

export function TradeItemCard({ group }: { group: GroupedTradeItem }) {
  const G = useContext(GDataContext);
  const itemInfo = itemRefToItemInfo(group.listing);
  const gItem = G?.items[group.listing.name as ItemKey];
  const titleName = G ? getTitleName(itemInfo, G) : "";
  const itemName = gItem ? getItemName(group.listing.name as ItemKey, gItem) : group.listing.name;
  const shownRows = group.rows.slice(0, MAX_LISTINGS_SHOWN);
  const hiddenCount = group.rows.length - shownRows.length;

  return (
    <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <ItemInstance itemInfo={itemInfo} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
              {titleName ? `${titleName} ` : ""}
              {itemName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {group.listing.name}
              {group.listing.level !== undefined ? ` +${group.listing.level}` : ""}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.75 }}>
              {group.wtsCount > 0 ? (
                <Chip size="small" color="success" label={`${group.wtsCount} WTS`} />
              ) : null}
              {group.wtbCount > 0 ? (
                <Chip size="small" color="info" label={`${group.wtbCount} WTB`} />
              ) : null}
              <Chip size="small" variant="outlined" label={`${group.ownerCount} owners`} />
              {group.hasBarter ? <Chip size="small" variant="outlined" label="barter" /> : null}
            </Box>
            {(group.cheapestWts !== undefined || group.highestWtb !== undefined) && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {group.cheapestWts !== undefined
                  ? `from ${formatPriceShort(group.cheapestWts)}`
                  : ""}
                {group.cheapestWts !== undefined && group.highestWtb !== undefined ? " · " : ""}
                {group.highestWtb !== undefined
                  ? `buy up to ${formatPriceShort(group.highestWtb)}`
                  : ""}
              </Typography>
            )}
          </Box>
        </Box>
        <Divider />
        <Box sx={{ flex: 1 }}>
          {shownRows.map((row) => (
            <ListingOfferRow
              key={`${row.owner}-${row.side}-${row.listing.note ?? ""}-${
                formatGoldPrice(row.tradeSide) ?? ""
              }`}
              row={row}
            />
          ))}
          {hiddenCount > 0 ? (
            <Typography variant="caption" color="text.secondary">
              +{hiddenCount} more listing{hiddenCount === 1 ? "" : "s"}
            </Typography>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
