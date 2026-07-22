import { Box, Typography } from "@mui/material";

import { ItemInstance } from "../Shared/ItemInstance";
import { NegotiableMarker } from "./NegotiableMarker";
import { ItemRef, TradeOffer } from "./tradeTypes";
import { itemRefToItemInfo } from "./tradeViewModel";

function itemWithQty(item: ItemRef, quantity: number) {
  return {
    ...itemRefToItemInfo(item),
    q: quantity,
  };
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
  const scale = compact ? 0.65 : 1;
  const slotWidth = compact ? 16 : 18;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 0.4 : 0.75,
        flexWrap: "nowrap",
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
            <NegotiableMarker title="Ratio is negotiable" fontSize={compact ? 13 : 15} />
          ) : null}
        </Box>
      ) : null}
      <Box sx={{ transform: `scale(${scale})`, transformOrigin: "center", flexShrink: 0 }}>
        <ItemInstance itemInfo={itemWithQty(listing, offer.give)} showQuantity />
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: compact ? "0.65rem" : "0.75rem", lineHeight: 1 }}
      >
        →
      </Typography>
      <Box sx={{ transform: `scale(${scale})`, transformOrigin: "center", flexShrink: 0 }}>
        <ItemInstance itemInfo={itemWithQty(offer.item, offer.receive)} showQuantity />
      </Box>
    </Box>
  );
}
