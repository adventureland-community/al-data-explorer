import { Box, Button, Card, CardContent, Chip, Typography } from "@mui/material";
import { useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { getItemName, getTitleName } from "../Shared/iteminfo-util";
import { CopyTradeButton } from "./CopyTradeButton";
import { formatPriceShort } from "./TradesOverview";
import { formatGoldPrice } from "./TradeSideDisplay";
import { TradeRatioRow } from "./TradeRatioRow";
import { GroupedTradeItem, TradeRow, itemRefToItemInfo } from "./tradeViewModel";

const MAX_LISTINGS_SHOWN = 4;

function SideBadge({ side }: { side: "WTS" | "WTB" }) {
  return (
    <Chip
      size="small"
      color={side === "WTS" ? "success" : "info"}
      label={side}
      sx={{ height: 18, fontSize: "0.65rem", minWidth: 40 }}
    />
  );
}

function OfferTerms({ row }: { row: TradeRow }) {
  const { listing, tradeSide } = row;
  const gold = formatGoldPrice(tradeSide);
  const trades = tradeSide.trades ?? [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
      {gold !== undefined ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
          <Typography variant="body2" component="span" title={tradeSide.price?.toLocaleString()}>
            {gold}
            {tradeSide.quantity !== undefined ? ` ×${tradeSide.quantity}` : ""}
          </Typography>
          {tradeSide.priceNegotiable ? (
            <Chip
              size="small"
              variant="outlined"
              label="negotiable"
              sx={{ height: 18, fontSize: "0.65rem" }}
            />
          ) : null}
        </Box>
      ) : null}
      {trades.map((offer) => (
        <TradeRatioRow
          key={`${offer.item.name}-${offer.item.level ?? ""}-${offer.give}-${offer.receive}-${
            offer.negotiable ? "n" : ""
          }`}
          listing={listing}
          offer={offer}
          compact
        />
      ))}
      {!gold && trades.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          (no terms)
        </Typography>
      ) : null}
    </Box>
  );
}

function ListingOfferRow({ row }: { row: TradeRow }) {
  const { owner, ownerLabel, listing, side, tradeSide, discordName } = row;
  const note = tradeSide.note ?? listing.note;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        columnGap: 1,
        rowGap: 0.25,
        alignItems: "start",
        py: 0.5,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <SideBadge side={side} />
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
          <Button
            component={RouterLink}
            to={`/bank?owner=${encodeURIComponent(owner)}`}
            size="small"
            sx={{
              textTransform: "none",
              minWidth: 0,
              p: 0,
              fontSize: "0.8rem",
              lineHeight: 1.2,
            }}
            title={owner}
          >
            {ownerLabel}
          </Button>
          {discordName && discordName.toLowerCase() !== ownerLabel.toLowerCase() ? (
            <Typography variant="caption" color="text.secondary">
              @{discordName}
            </Typography>
          ) : null}
        </Box>
        <OfferTerms row={row} />
        {note ? (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            title={note}
            sx={{ display: "block", maxWidth: "100%" }}
          >
            {note}
          </Typography>
        ) : null}
      </Box>
      <CopyTradeButton row={row} />
    </Box>
  );
}

function HeaderSummary({ group }: { group: GroupedTradeItem }) {
  const parts: string[] = [];
  if (group.wtsCount > 0) parts.push(`${group.wtsCount} WTS`);
  if (group.wtbCount > 0) parts.push(`${group.wtbCount} WTB`);
  parts.push(`${group.ownerCount} owner${group.ownerCount === 1 ? "" : "s"}`);

  const priceBits: string[] = [];
  if (group.cheapestWts !== undefined)
    priceBits.push(`from ${formatPriceShort(group.cheapestWts)}`);
  if (group.highestWtb !== undefined) {
    priceBits.push(`buy to ${formatPriceShort(group.highestWtb)}`);
  }

  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
      {parts.join(" · ")}
      {priceBits.length ? ` · ${priceBits.join(" · ")}` : ""}
      {group.hasBarter ? " · barter" : ""}
    </Typography>
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
      <CardContent sx={{ flex: 1, p: 1.25, "&:last-child": { pb: 1.25 } }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 0.5 }}>
          <Box sx={{ transform: "scale(0.9)", transformOrigin: "left center", flexShrink: 0 }}>
            <ItemInstance itemInfo={itemInfo} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap title={itemName} sx={{ lineHeight: 1.2 }}>
              {titleName ? `${titleName} ` : ""}
              {itemName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {group.listing.name}
              {group.listing.level !== undefined ? ` +${group.listing.level}` : ""}
            </Typography>
            <HeaderSummary group={group} />
          </Box>
        </Box>
        <Box>
          {shownRows.map((row) => (
            <ListingOfferRow
              key={`${row.owner}-${row.side}-${row.listing.note ?? ""}-${
                formatGoldPrice(row.tradeSide) ?? ""
              }`}
              row={row}
            />
          ))}
          {hiddenCount > 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", pt: 0.5 }}>
              +{hiddenCount} more
            </Typography>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
