import { Box, Chip, Typography } from "@mui/material";

import { ItemInstance } from "../Shared/ItemInstance";
import { ItemRef, TradeOffer } from "./tradeTypes";
import { itemRefToItemInfo } from "./tradeViewModel";

export function TradeRatioRow({
  listing,
  offer,
  compact,
  quiet,
}: {
  listing: ItemRef;
  offer: TradeOffer;
  compact?: boolean;
  /** Softer negotiable marker for dense card layouts. */
  quiet?: boolean;
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
        quiet ? (
          <Typography
            variant="caption"
            color="text.secondary"
            title="Ratio is negotiable"
            sx={{ fontSize, fontStyle: "italic" }}
          >
            negotiable
          </Typography>
        ) : (
          <Chip
            size="small"
            variant="outlined"
            label="negotiable"
            title="Ratio is negotiable"
            sx={{ height: compact ? 18 : 20, fontSize: compact ? "0.65rem" : "0.7rem" }}
          />
        )
      ) : null}
    </Box>
  );
}
