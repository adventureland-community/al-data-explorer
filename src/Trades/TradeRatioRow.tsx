import { Box, Typography } from "@mui/material";

import { ItemInstance } from "../Shared/ItemInstance";
import { NegotiableMarker } from "./NegotiableMarker";
import { ItemRef, TradeOffer } from "./tradeTypes";
import { itemRefToItemInfo } from "./tradeViewModel";

export function TradeRatioRow({
  listing,
  offer,
  compact,
}: {
  listing: ItemRef;
  offer: TradeOffer;
  compact?: boolean;
}) {
  const scale = compact ? 0.65 : 1;
  const fontSize = compact ? "0.7rem" : "0.8rem";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 0.4 : 1,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ transform: `scale(${scale})`, transformOrigin: "left center" }}>
        <ItemInstance itemInfo={itemRefToItemInfo(listing)} />
      </Box>
      <Typography variant="caption" sx={{ fontSize, fontWeight: 600, whiteSpace: "nowrap" }}>
        {offer.give}:{offer.receive}
      </Typography>
      <Box sx={{ transform: `scale(${scale})`, transformOrigin: "left center" }}>
        <ItemInstance itemInfo={itemRefToItemInfo(offer.item)} />
      </Box>
      {offer.negotiable ? (
        <NegotiableMarker title="Ratio is negotiable" fontSize={compact ? 13 : 15} />
      ) : null}
    </Box>
  );
}
