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

function SideMixBar({ wtsCount, wtbCount }: { wtsCount: number; wtbCount: number }) {
  const total = wtsCount + wtbCount;
  if (total === 0) {
    return null;
  }

  const wtsPct = (wtsCount / total) * 100;
  const wtbPct = (wtbCount / total) * 100;

  return (
    <Box sx={{ mt: 0.75 }} title={`${wtsCount} WTS · ${wtbCount} WTB`}>
      <Box
        sx={{
          display: "flex",
          height: 8,
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "action.hover",
        }}
      >
        {wtsCount > 0 ? (
          <Box
            sx={{ width: `${wtsPct}%`, bgcolor: "success.main", minWidth: wtsCount > 0 ? 4 : 0 }}
          />
        ) : null}
        {wtbCount > 0 ? (
          <Box sx={{ width: `${wtbPct}%`, bgcolor: "info.main", minWidth: wtbCount > 0 ? 4 : 0 }} />
        ) : null}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
        <Typography variant="caption" color="success.main" sx={{ fontSize: "0.7rem" }}>
          {wtsCount > 0 ? `sell ${Math.round(wtsPct)}%` : ""}
        </Typography>
        <Typography variant="caption" color="info.main" sx={{ fontSize: "0.7rem" }}>
          {wtbCount > 0 ? `buy ${Math.round(wtbPct)}%` : ""}
        </Typography>
      </Box>
    </Box>
  );
}

function GoldPriceRange({
  cheapestWts,
  highestWtb,
}: {
  cheapestWts?: number;
  highestWtb?: number;
}) {
  if (cheapestWts === undefined && highestWtb === undefined) {
    return null;
  }

  const low = cheapestWts ?? highestWtb!;
  const high = highestWtb ?? cheapestWts!;
  const span = Math.max(high - low, 1);
  const lowPos = cheapestWts !== undefined ? ((cheapestWts - low) / span) * 100 : 0;
  const highPos = highestWtb !== undefined ? ((highestWtb - low) / span) * 100 : 100;

  return (
    <Box sx={{ mt: 0.75 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
          {cheapestWts !== undefined ? `Low ${formatPriceShort(cheapestWts)}` : "Low —"}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
          {highestWtb !== undefined ? `High ${formatPriceShort(highestWtb)}` : "High —"}
        </Typography>
      </Box>
      <Box sx={{ position: "relative", height: 6, borderRadius: 1, bgcolor: "action.hover" }}>
        {cheapestWts !== undefined ? (
          <Box
            sx={{
              position: "absolute",
              left: `calc(${lowPos}% - 4px)`,
              top: -2,
              width: 8,
              height: 10,
              borderRadius: 0.5,
              bgcolor: "success.main",
            }}
            title={`Cheapest WTS ${cheapestWts.toLocaleString()}`}
          />
        ) : null}
        {highestWtb !== undefined ? (
          <Box
            sx={{
              position: "absolute",
              left: `calc(${Math.min(highPos, 100)}% - 4px)`,
              top: -2,
              width: 8,
              height: 10,
              borderRadius: 0.5,
              bgcolor: "info.main",
            }}
            title={`Highest WTB ${highestWtb.toLocaleString()}`}
          />
        ) : null}
      </Box>
    </Box>
  );
}

function CardMarketSummary({ group }: { group: GroupedTradeItem }) {
  const hasGold = group.cheapestWts !== undefined || group.highestWtb !== undefined;
  const barterOnly = group.hasBarter && !hasGold;

  return (
    <Box sx={{ mt: 0.25 }}>
      <SideMixBar wtsCount={group.wtsCount} wtbCount={group.wtbCount} />
      {hasGold ? (
        <GoldPriceRange cheapestWts={group.cheapestWts} highestWtb={group.highestWtb} />
      ) : null}
      {barterOnly ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
        >
          Item trades only — no gold prices listed
        </Typography>
      ) : null}
    </Box>
  );
}

function CardFooter({ group }: { group: GroupedTradeItem }) {
  const hasGold = group.cheapestWts !== undefined || group.highestWtb !== undefined;
  if (!hasGold && !group.hasBarter) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1.5,
        mt: 1,
        pt: 0.75,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      {group.cheapestWts !== undefined ? (
        <Typography variant="caption" color="text.secondary">
          from{" "}
          <Box component="span" sx={{ color: "success.main", fontWeight: 600 }}>
            {formatPriceShort(group.cheapestWts)}
          </Box>
        </Typography>
      ) : null}
      {group.highestWtb !== undefined ? (
        <Typography variant="caption" color="text.secondary">
          buy to{" "}
          <Box component="span" sx={{ color: "info.main", fontWeight: 600 }}>
            {formatPriceShort(group.highestWtb)}
          </Box>
        </Typography>
      ) : null}
      {group.hasBarter ? (
        <Typography variant="caption" color="text.secondary">
          barter available
        </Typography>
      ) : null}
    </Box>
  );
}

function OfferTerms({ row }: { row: TradeRow }) {
  const { listing, tradeSide } = row;
  const gold = formatGoldPrice(tradeSide);
  const trades = tradeSide.trades ?? [];
  const anyNegotiable = !!tradeSide.priceNegotiable || trades.some((offer) => !!offer.negotiable);
  const slotWidth = 16;
  const { quantity } = tradeSide;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0.35,
        minWidth: 0,
        width: "100%",
      }}
    >
      {gold !== undefined || quantity !== undefined ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 1,
            width: "100%",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, minWidth: 0 }}>
            {gold !== undefined && (anyNegotiable || tradeSide.priceNegotiable) ? (
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
            {gold !== undefined ? (
              <Typography
                variant="body2"
                component="span"
                title={tradeSide.price?.toLocaleString()}
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
              >
                {gold}
              </Typography>
            ) : null}
          </Box>
          {quantity !== undefined ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
              title={`Quantity ${quantity.toLocaleString()}`}
            >
              ×{quantity.toLocaleString()}
            </Typography>
          ) : null}
        </Box>
      ) : null}
      {trades.map((offer) => (
        <TradeRatioRow
          key={`${offer.item.name}-${offer.give}-${offer.receive}`}
          listing={listing}
          offer={offer}
          compact
          reserveNegotiableSlot={anyNegotiable}
        />
      ))}
      {!gold && trades.length === 0 && quantity === undefined ? (
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
        display: "flex",
        flexDirection: "column",
        gap: 0.35,
        py: 0.6,
        borderTop: 1,
        borderColor: "divider",
        minWidth: 0,
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
            minWidth: 0,
            flex: 1,
          }}
        >
          {ownerLabel}
        </Link>
        <CopyTradeButton row={row} iconOnly />
      </Box>
      <OfferTerms row={row} />
      {note ? (
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          title={note}
          sx={{ maxWidth: "100%" }}
        >
          {note}
        </Typography>
      ) : null}
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

export function TradeItemCard({ group }: { group: GroupedTradeItem }) {
  const G = useContext(GDataContext);
  const itemInfo = itemRefToItemInfo(group.listing);
  const displayName = G ? formatItemDisplayName(itemInfo, G) : group.listing.name;

  const { wtsRows, wtbRows, hiddenCount, dualColumn } = useMemo(() => {
    const wts = group.rows.filter((row) => row.side === "WTS");
    const wtb = group.rows.filter((row) => row.side === "WTB");
    const dual = wts.length > 0 && wtb.length > 0;
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
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", minWidth: 0 }}>
          <Box sx={{ flexShrink: 0 }}>
            <ItemInstance itemInfo={itemInfo} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1, textAlign: "left" }}>
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

        <CardMarketSummary group={group} />

        {dualColumn ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 2,
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

        <CardFooter group={group} />
      </CardContent>
    </Card>
  );
}
