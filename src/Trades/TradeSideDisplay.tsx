import { Box, Chip, Typography } from "@mui/material";
import { abbreviateNumber } from "../Shared/utils";
import { ItemRef, TradeOffer, TradeSide } from "./tradeTypes";

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
  const negotiable = offer.negotiable ? " (nego)" : "";
  return `${ratio} ${formatItemRef(offer.item)}${negotiable}`;
}

export function formatGoldPrice(side?: TradeSide): string | undefined {
  if (side?.price === undefined) {
    return undefined;
  }
  const gold = abbreviateNumber(side.price) ?? side.price;
  return side.priceNegotiable ? `${gold} OBO` : String(gold);
}

export function TradeSideSummary({
  label,
  side,
  compact,
}: {
  label: "WTS" | "WTB";
  side?: TradeSide;
  compact?: boolean;
}) {
  if (!side) {
    return null;
  }

  const gold = formatGoldPrice(side);
  const trades = side.trades ?? [];
  const color = label === "WTS" ? "success" : "info";

  if (compact) {
    const parts: string[] = [];
    if (gold) {
      parts.push(String(gold));
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
        <Typography variant="body2" title={side.price?.toLocaleString()}>
          {gold}
          {side.quantity !== undefined ? ` ×${side.quantity}` : ""}
        </Typography>
      )}
      {side.note && (
        <Typography variant="caption" color="text.secondary">
          {side.note}
        </Typography>
      )}
      {trades.map((offer) => (
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
