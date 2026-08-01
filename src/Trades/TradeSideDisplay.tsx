import { Box, Chip, Typography } from "@mui/material";
import { formatGoldPriceLabel, TradeOfferTerms } from "./TradeOfferTerms";
import { ItemRef, TradeOffer, TradeSide } from "./tradeTypes";

export { formatGoldPrice, formatGoldPriceLabel } from "./TradeOfferTerms";

function formatItemRef(item: ItemRef): string {
  let label = item.name;
  if (item.level !== undefined && item.level > 0) {
    label += `+${item.level}`;
  }
  if (item.p) {
    label = `${item.p} ${label}`;
  }
  return label;
}

function formatTradeOffer(offer: TradeOffer, side: "WTS" | "WTB"): string {
  const other = formatItemRef(offer.item);
  const negotiable = offer.negotiable ? " (negotiable)" : "";
  // Lister wallet: WTS listed→other, WTB other→listed.
  if (side === "WTB") {
    return `${offer.receive} ${other} → ${offer.give}${negotiable}`;
  }
  return `${offer.give} → ${offer.receive} ${other}${negotiable}`;
}

export function TradeSideSummary({
  label,
  side,
  listing,
  compact,
}: {
  label: "WTS" | "WTB";
  side?: TradeSide;
  /** When set, barter ratios render with ItemInstance on both sides. */
  listing?: ItemRef;
  compact?: boolean;
}) {
  if (!side) {
    return null;
  }

  const goldLabel = formatGoldPriceLabel(side);
  const trades = side.trades ?? [];
  const color = label === "WTS" ? "success" : "info";

  if (compact) {
    const parts: string[] = [];
    if (goldLabel) {
      parts.push(goldLabel);
    }
    if (trades.length) {
      parts.push(trades.map((offer) => formatTradeOffer(offer, label)).join(", "));
    }
    if (side.note) {
      parts.push(side.note);
    }
    const title = parts.join(" · ") || label;

    return <Chip size="small" color={color} label={label} title={title} sx={{ height: 20 }} />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-start" }}>
      <Chip size="small" color={color} label={label} />
      <TradeOfferTerms listing={listing} tradeSide={side} side={label} layout="summary" />
      {!listing
        ? trades.map((offer) => (
            <Typography
              key={`${offer.item.name}-${offer.item.level ?? ""}-${offer.give}-${offer.receive}-${
                offer.negotiable ? "n" : ""
              }`}
              variant="caption"
            >
              {formatTradeOffer(offer, label)}
            </Typography>
          ))
        : null}
      {side.note && (
        <Typography variant="caption" color="text.secondary">
          {side.note}
        </Typography>
      )}
    </Box>
  );
}

/** Item-level listing note only (side notes are rendered by TradeSideSummary). */
export function ListingNotes({ note }: { note?: string }) {
  if (!note) {
    return null;
  }

  return (
    <Typography variant="caption" color="text.secondary">
      {note}
    </Typography>
  );
}
