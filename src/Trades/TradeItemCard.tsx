import { Box, Card, CardContent, Link, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { formatItemDisplayName } from "../Shared/iteminfo-util";
import { CopyTradeButton } from "./CopyTradeButton";
import { NegotiableMarker } from "./NegotiableMarker";
import { formatPriceShort } from "./TradesOverview";
import { formatGoldPrice } from "./TradeSideDisplay";
import { TradeRatioRow } from "./TradeRatioRow";
import { GroupedTradeItem, TradeRow, itemRefToItemInfo } from "./tradeViewModel";

const MAX_LISTINGS_SHOWN = 5;

function OfferTerms({ row }: { row: TradeRow }) {
  const { listing, tradeSide } = row;
  const gold = formatGoldPrice(tradeSide);
  const trades = tradeSide.trades ?? [];
  const anyNegotiable = !!tradeSide.priceNegotiable || trades.some((offer) => !!offer.negotiable);
  const slotWidth = 16;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 0.25,
        minWidth: 0,
      }}
    >
      {gold !== undefined ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.4 }}>
          {anyNegotiable || tradeSide.priceNegotiable ? (
            <Box
              sx={{
                width: slotWidth,
                flexShrink: 0,
                display: "inline-flex",
                justifyContent: "center",
              }}
            >
              {tradeSide.priceNegotiable ? (
                <NegotiableMarker title="Price is negotiable" fontSize={13} />
              ) : null}
            </Box>
          ) : null}
          <Typography
            variant="body2"
            component="span"
            title={tradeSide.price?.toLocaleString()}
            sx={{ fontWeight: 600, lineHeight: 1.2 }}
          >
            {gold}
            {tradeSide.quantity !== undefined ? ` ×${tradeSide.quantity}` : ""}
          </Typography>
        </Box>
      ) : null}
      {trades.map((offer) => (
        <Box
          key={`${offer.item.name}-${offer.give}-${offer.receive}`}
          sx={{ display: "flex", justifyContent: "flex-end" }}
        >
          <TradeRatioRow
            listing={listing}
            offer={offer}
            compact
            reserveNegotiableSlot={anyNegotiable}
          />
        </Box>
      ))}
      {!gold && trades.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "right" }}>
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

function SideSection({
  side,
  rows,
  compactHeader,
}: {
  side: "WTS" | "WTB";
  rows: TradeRow[];
  compactHeader?: boolean;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: compactHeader ? 0 : 0.75, minWidth: 0 }}>
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
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
          {rows.length} offer{rows.length === 1 ? "" : "s"}
        </Typography>
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
  const counts: string[] = [];
  if (group.wtsCount > 0) counts.push(`${group.wtsCount} sell`);
  if (group.wtbCount > 0) counts.push(`${group.wtbCount} buy`);

  const prices: string[] = [];
  if (group.cheapestWts !== undefined) prices.push(`from ${formatPriceShort(group.cheapestWts)}`);
  if (group.highestWtb !== undefined) prices.push(`to ${formatPriceShort(group.highestWtb)}`);

  return (
    <Box sx={{ textAlign: "right", flexShrink: 0, pl: 1 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", lineHeight: 1.25 }}
      >
        {counts.join(" · ") || "no offers"}
      </Typography>
      {prices.length > 0 ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.25 }}
        >
          {prices.join(" · ")}
        </Typography>
      ) : null}
      {group.hasBarter ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.25 }}
        >
          barter
        </Typography>
      ) : null}
    </Box>
  );
}

export function TradeItemCard({ group }: { group: GroupedTradeItem }) {
  const G = useContext(GDataContext);
  const itemInfo = itemRefToItemInfo(group.listing);
  const displayName = G ? formatItemDisplayName(itemInfo, G) : group.listing.name;

  const { wtsRows, wtbRows, hiddenCount, dualColumn } = useMemo(() => {
    const wts = group.rows.filter((row) => row.side === "WTS");
    const wtb = group.rows.filter((row) => row.side === "WTB");
    const dual = wts.length > 0 && wtb.length > 0;
    // In dual-column layout, budget each side independently so WTB isn't starved.
    const perSide = dual ? Math.ceil(MAX_LISTINGS_SHOWN / 2) : MAX_LISTINGS_SHOWN;
    const shownWts = wts.slice(0, perSide);
    const shownWtb = wtb.slice(
      0,
      dual ? perSide : Math.max(0, MAX_LISTINGS_SHOWN - shownWts.length),
    );
    return {
      wtsRows: shownWts,
      wtbRows: shownWtb,
      dualColumn: dual,
      hiddenCount: group.rows.length - shownWts.length - shownWtb.length,
    };
  }, [group.rows]);

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", minWidth: 0, flex: 1 }}>
            <Box sx={{ flexShrink: 0 }}>
              <ItemInstance itemInfo={itemInfo} />
            </Box>
            <Box sx={{ minWidth: 0, textAlign: "left" }}>
              <Typography
                variant="subtitle2"
                noWrap
                title={displayName}
                sx={{ lineHeight: 1.15, textAlign: "left" }}
              >
                {displayName}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ display: "block", textAlign: "left" }}
              >
                {group.listing.name}
              </Typography>
            </Box>
          </Box>
          <HeaderSummary group={group} />
        </Box>

        {dualColumn ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1.5,
              mt: 0.75,
              alignItems: "start",
            }}
          >
            <SideSection side="WTS" rows={wtsRows} compactHeader />
            <SideSection side="WTB" rows={wtbRows} compactHeader />
          </Box>
        ) : (
          <>
            <SideSection side="WTS" rows={wtsRows} />
            <SideSection side="WTB" rows={wtbRows} />
          </>
        )}

        {hiddenCount > 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            +{hiddenCount} more
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
