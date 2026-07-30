import { Box, Typography } from "@mui/material";

import { abbreviateNumber } from "../Shared/utils";
import { NegotiableMarker } from "./NegotiableMarker";
import { TradeRatioRow } from "./TradeRatioRow";
import { ItemRef, TradeSide } from "./tradeTypes";

export type TradeOfferTermsLayout = "card" | "table" | "summary";

export function formatGoldPrice(side?: TradeSide): string | undefined {
  if (side?.price === undefined) {
    return undefined;
  }
  const gold = abbreviateNumber(side.price) ?? side.price;
  return String(gold);
}

export function formatGoldPriceLabel(side?: TradeSide): string | undefined {
  const gold = formatGoldPrice(side);
  if (gold === undefined) {
    return undefined;
  }
  return side?.priceNegotiable ? `${gold} negotiable` : gold;
}

/**
 * Shared gold / quantity / negotiable / ratio terms for a single trade side.
 * Layout variants keep card, table, and bank-summary visuals close to prior UI.
 */
export function TradeOfferTerms({
  listing,
  tradeSide,
  side,
  layout = "summary",
}: {
  listing?: ItemRef;
  tradeSide: TradeSide;
  side: "WTS" | "WTB";
  layout?: TradeOfferTermsLayout;
}) {
  const gold = formatGoldPrice(tradeSide);
  const trades = tradeSide.trades ?? [];
  const { quantity } = tradeSide;
  const offerNegotiable = trades.some((offer) => !!offer.negotiable);
  const anyNegotiable = !!tradeSide.priceNegotiable || offerNegotiable;
  const empty = gold === undefined && trades.length === 0 && quantity === undefined;

  if (layout === "summary") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-start" }}>
        {gold !== undefined && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
            {tradeSide.priceNegotiable ? <NegotiableMarker title="Price is negotiable" /> : null}
            <Typography variant="body2" title={tradeSide.price?.toLocaleString()}>
              {gold}
              {quantity !== undefined ? ` ×${quantity}` : ""}
            </Typography>
          </Box>
        )}
        {listing
          ? trades.map((offer) => (
              <TradeRatioRow
                key={`${offer.item.name}-${offer.item.level ?? ""}-${offer.give}-${offer.receive}-${
                  offer.negotiable ? "n" : ""
                }`}
                listing={listing}
                offer={offer}
                side={side}
              />
            ))
          : null}
      </Box>
    );
  }

  const reservePriceSlot = layout === "card" && gold !== undefined && anyNegotiable;
  const goldColor =
    layout === "table" ? (side === "WTS" ? "success.main" : "info.main") : undefined;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: layout === "card" ? 0.35 : 0.5,
        minWidth: 0,
        width: "100%",
      }}
    >
      {gold !== undefined || quantity !== undefined ? (
        <Box
          sx={{
            display: "flex",
            alignItems: layout === "card" ? "baseline" : "center",
            justifyContent: layout === "card" ? "space-between" : undefined,
            gap: layout === "card" ? 1 : 0.75,
            flexWrap: layout === "table" ? "wrap" : undefined,
            width: layout === "card" ? "100%" : undefined,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: layout === "card" ? 0.4 : 0.75,
              minWidth: 0,
            }}
          >
            {reservePriceSlot ? (
              <Box
                sx={{
                  width: 16,
                  flexShrink: 0,
                  display: "inline-flex",
                  justifyContent: "center",
                }}
              >
                {tradeSide.priceNegotiable ? (
                  <NegotiableMarker title="Price is negotiable" fontSize={13} />
                ) : null}
              </Box>
            ) : tradeSide.priceNegotiable ? (
              <NegotiableMarker
                title="Price is negotiable"
                fontSize={layout === "table" ? 14 : 13}
              />
            ) : null}
            {gold !== undefined ? (
              <Typography
                variant="body2"
                component="span"
                title={tradeSide.price?.toLocaleString()}
                sx={{
                  fontWeight: 700,
                  lineHeight: layout === "card" ? 1.2 : undefined,
                  color: goldColor,
                }}
              >
                {gold}
              </Typography>
            ) : null}
          </Box>
          {quantity !== undefined ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontWeight: layout === "card" ? 600 : 700,
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}
              title={`Quantity ${quantity.toLocaleString()}`}
            >
              ×{quantity.toLocaleString()}
            </Typography>
          ) : null}
        </Box>
      ) : null}
      {listing
        ? trades.map((offer) => (
            <TradeRatioRow
              key={`${offer.item.name}-${offer.item.level ?? ""}-${offer.give}-${offer.receive}`}
              listing={listing}
              offer={offer}
              side={side}
              compact
              reserveNegotiableSlot={layout === "card" ? anyNegotiable : offerNegotiable}
            />
          ))
        : null}
      {empty ? (
        <Typography variant="caption" color="text.secondary">
          —
        </Typography>
      ) : null}
    </Box>
  );
}
