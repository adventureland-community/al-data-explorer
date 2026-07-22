import { Box, Tooltip, Typography } from "@mui/material";
import { useContext } from "react";

import { CustomGData, GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { formatItemDisplayName } from "../Shared/iteminfo-util";
import { NegotiableMarker } from "./NegotiableMarker";
import { ItemRef, TradeOffer } from "./tradeTypes";
import { itemRefToItemInfo } from "./tradeViewModel";

function itemWithQty(item: ItemRef, quantity: number) {
  return {
    ...itemRefToItemInfo(item),
    q: quantity,
  };
}

/** Human-readable tooltip for a ratio trade, e.g. "Trade 2× Crypt Key for 1× Tomb Key". */
export function formatTradeOfferTooltip(
  listing: ItemRef,
  offer: TradeOffer,
  G: CustomGData | undefined,
): string {
  const giveLabel = G ? formatItemDisplayName(listing, G) : listing.name;
  const receiveLabel = G ? formatItemDisplayName(offer.item, G) : offer.item.name;
  const giveQty = offer.give.toLocaleString();
  const receiveQty = offer.receive.toLocaleString();
  let text = `Trade ${giveQty}× ${giveLabel} for ${receiveQty}× ${receiveLabel}`;
  if (offer.negotiable) {
    text += " · negotiable";
  }
  return text;
}

export function TradeRatioRow({
  listing,
  offer,
  compact,
  /** When true, always reserve left space for negotiable so sibling rows stay aligned. */
  reserveNegotiableSlot,
}: {
  listing: ItemRef;
  offer: TradeOffer;
  compact?: boolean;
  reserveNegotiableSlot?: boolean;
}) {
  const G = useContext(GDataContext);
  // Keep near full size so sprites + quantity badges stay readable in cards/table.
  const scale = compact ? 0.9 : 1;
  const slotWidth = compact ? 18 : 20;
  const tooltip = formatTradeOfferTooltip(listing, offer, G);

  return (
    <Tooltip title={tooltip} placement="top" enterDelay={300}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: compact ? 0.5 : 0.75,
          flexWrap: "nowrap",
          cursor: "help",
        }}
      >
        {reserveNegotiableSlot || offer.negotiable ? (
          <Box
            sx={{
              width: slotWidth,
              flexShrink: 0,
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {offer.negotiable ? (
              <NegotiableMarker title="Ratio is negotiable" fontSize={compact ? 14 : 16} />
            ) : null}
          </Box>
        ) : null}
        <Box sx={{ transform: `scale(${scale})`, transformOrigin: "center", flexShrink: 0 }}>
          <ItemInstance itemInfo={itemWithQty(listing, offer.give)} showQuantity />
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: compact ? "0.75rem" : "0.85rem", lineHeight: 1, fontWeight: 600 }}
        >
          →
        </Typography>
        <Box sx={{ transform: `scale(${scale})`, transformOrigin: "center", flexShrink: 0 }}>
          <ItemInstance itemInfo={itemWithQty(offer.item, offer.receive)} showQuantity />
        </Box>
      </Box>
    </Tooltip>
  );
}
