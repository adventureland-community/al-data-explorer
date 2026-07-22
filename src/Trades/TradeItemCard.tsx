import { Box, Card, CardContent, Link, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
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

const MAX_LISTINGS_SHOWN = 5;

function OfferTerms({ row }: { row: TradeRow }) {
  const { listing, tradeSide } = row;
  const gold = formatGoldPrice(tradeSide);
  const trades = tradeSide.trades ?? [];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 0.15,
        minWidth: 0,
        textAlign: "right",
      }}
    >
      {gold !== undefined ? (
        <Typography
          variant="body2"
          component="span"
          title={tradeSide.price?.toLocaleString()}
          sx={{ fontWeight: 600, lineHeight: 1.2 }}
        >
          {gold}
          {tradeSide.quantity !== undefined ? ` ×${tradeSide.quantity}` : ""}
          {tradeSide.priceNegotiable ? (
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              title="Price is negotiable"
              sx={{ ml: 0.5, fontWeight: 400, fontStyle: "italic" }}
            >
              negotiable
            </Typography>
          ) : null}
        </Typography>
      ) : null}
      {trades.map((offer) => (
        <Box key={`${offer.item.name}-${offer.give}-${offer.receive}`} sx={{ maxWidth: "100%" }}>
          <TradeRatioRow listing={listing} offer={offer} compact quiet />
        </Box>
      ))}
      {!gold && trades.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          —
        </Typography>
      ) : null}
    </Box>
  );
}

function ListingOfferRow({ row }: { row: TradeRow }) {
  const { owner, ownerLabel, listing, tradeSide, discordName } = row;
  const note = tradeSide.note ?? listing.note;
  const ownerTitle = [
    owner,
    discordName && discordName !== ownerLabel ? `@${discordName}` : "",
    note,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box
      title={ownerTitle || undefined}
      sx={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        columnGap: 1,
        alignItems: "center",
        py: 0.4,
        minHeight: 28,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, minWidth: 0 }}>
        <Link
          component={RouterLink}
          to={`/bank?owner=${encodeURIComponent(owner)}`}
          underline="hover"
          title={owner}
          sx={{
            fontSize: "0.8rem",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {ownerLabel}
        </Link>
        <CopyTradeButton row={row} iconOnly />
      </Box>
      <OfferTerms row={row} />
    </Box>
  );
}

function SideSection({ side, rows }: { side: "WTS" | "WTB"; rows: TradeRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 0.75 }}>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          mb: 0.25,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: side === "WTS" ? "success.main" : "info.main",
        }}
      >
        {side}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {rows.map((row) => (
          <ListingOfferRow
            key={`${row.owner}-${row.side}-${row.listing.note ?? ""}-${
              formatGoldPrice(row.tradeSide) ?? ""
            }`}
            row={row}
          />
        ))}
      </Box>
    </Box>
  );
}

function HeaderSummary({ group }: { group: GroupedTradeItem }) {
  const parts: string[] = [];
  if (group.wtsCount > 0) parts.push(`${group.wtsCount} sell`);
  if (group.wtbCount > 0) parts.push(`${group.wtbCount} buy`);
  if (group.cheapestWts !== undefined) parts.push(`from ${formatPriceShort(group.cheapestWts)}`);
  if (group.highestWtb !== undefined) parts.push(`to ${formatPriceShort(group.highestWtb)}`);

  return (
    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
      {parts.join(" · ")}
    </Typography>
  );
}

export function TradeItemCard({ group }: { group: GroupedTradeItem }) {
  const G = useContext(GDataContext);
  const itemInfo = itemRefToItemInfo(group.listing);
  const gItem = G?.items[group.listing.name as ItemKey];
  const titleName = G ? getTitleName(itemInfo, G) : "";
  const itemName = gItem ? getItemName(group.listing.name as ItemKey, gItem) : group.listing.name;

  const { wtsRows, wtbRows, hiddenCount } = useMemo(() => {
    const wts = group.rows.filter((row) => row.side === "WTS");
    const wtb = group.rows.filter((row) => row.side === "WTB");
    const budget = MAX_LISTINGS_SHOWN;
    const shownWts = wts.slice(0, budget);
    const remaining = budget - shownWts.length;
    const shownWtb = wtb.slice(0, Math.max(0, remaining));
    return {
      wtsRows: shownWts,
      wtbRows: shownWtb,
      hiddenCount: group.rows.length - shownWts.length - shownWtb.length,
    };
  }, [group.rows]);

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Box sx={{ transform: "scale(0.85)", transformOrigin: "left center", flexShrink: 0 }}>
            <ItemInstance itemInfo={itemInfo} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap title={itemName} sx={{ lineHeight: 1.15 }}>
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

        <SideSection side="WTS" rows={wtsRows} />
        <SideSection side="WTB" rows={wtbRows} />

        {hiddenCount > 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            +{hiddenCount} more
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
