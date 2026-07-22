import { Box, Chip, Typography } from "@mui/material";
import { abbreviateNumber } from "../Shared/utils";
import { NegotiableMarker } from "./NegotiableMarker";
import { ItemRef, TradeOffer, TradeSide } from "./tradeTypes";
import { TradeRatioRow } from "./TradeRatioRow";

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

function formatTradeOffer(offer: TradeOffer): string {
  const ratio = `${offer.give}:${offer.receive}`;
  const negotiable = offer.negotiable ? " (negotiable)" : "";
  return `${ratio} ${formatItemRef(offer.item)}${negotiable}`;
}

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

  const gold = formatGoldPrice(side);
  const goldLabel = formatGoldPriceLabel(side);
  const trades = side.trades ?? [];
  const color = label === "WTS" ? "success" : "info";

  if (compact) {
    const parts: string[] = [];
    if (goldLabel) {
      parts.push(goldLabel);
    }
    if (trades.length) {
      parts.push(trades.map(formatTradeOffer).join(", "));
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
      {gold !== undefined && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
          <Typography variant="body2" title={side.price?.toLocaleString()}>
            {gold}
            {side.quantity !== undefined ? ` ×${side.quantity}` : ""}
          </Typography>
          {side.priceNegotiable ? <NegotiableMarker title="Price is negotiable" /> : null}
        </Box>
      )}
      {side.note && (
        <Typography variant="caption" color="text.secondary">
          {side.note}
        </Typography>
      )}
      {listing
        ? trades.map((offer) => (
            <TradeRatioRow
              key={`${offer.item.name}-${offer.item.level ?? ""}-${offer.give}-${offer.receive}-${
                offer.negotiable ? "n" : ""
              }`}
              listing={listing}
              offer={offer}
            />
          ))
        : trades.map((offer) => (
            <Typography
              key={`${offer.item.name}-${offer.item.level ?? ""}-${offer.give}-${offer.receive}-${
                offer.negotiable ? "n" : ""
              }`}
              variant="caption"
            >
              {formatTradeOffer(offer)}
            </Typography>
          ))}
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
