import { Box, Card, CardActionArea, CardContent, Chip, Typography } from "@mui/material";
import { useContext, useState } from "react";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { formatItemDisplayName } from "../Shared/iteminfo-util";
import { formatPriceShort } from "./TradesOverview";
import { GroupedTradeItem, itemRefToItemInfo } from "./tradeViewModel";
import { TradeItemCard } from "./TradeItemCard";

export function TradeCompactTile({ group }: { group: GroupedTradeItem }) {
  const G = useContext(GDataContext);
  const [expanded, setExpanded] = useState(false);
  const itemInfo = itemRefToItemInfo(group.listing);
  const displayName = G ? formatItemDisplayName(itemInfo, G) : group.listing.name;

  if (expanded) {
    return (
      <Box sx={{ gridColumn: "1 / -1" }}>
        <TradeItemCard group={group} />
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: "pointer", display: "block", mt: 0.5 }}
          onClick={() => setExpanded(false)}
        >
          Collapse
        </Typography>
      </Box>
    );
  }

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardActionArea onClick={() => setExpanded(true)} sx={{ height: "100%" }}>
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ transform: "scale(0.85)", transformOrigin: "center" }}>
              <ItemInstance itemInfo={itemInfo} />
            </Box>
            <Typography
              variant="caption"
              align="center"
              noWrap
              sx={{ width: "100%" }}
              title={displayName}
            >
              {displayName}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.25, justifyContent: "center" }}>
              {group.wtsCount > 0 ? (
                <Chip
                  size="small"
                  color="success"
                  label={group.wtsCount}
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              ) : null}
              {group.wtbCount > 0 ? (
                <Chip
                  size="small"
                  color="info"
                  label={group.wtbCount}
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              ) : null}
            </Box>
            {group.cheapestWts !== undefined ? (
              <Typography variant="caption" color="text.secondary">
                from {formatPriceShort(group.cheapestWts)}
              </Typography>
            ) : null}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
