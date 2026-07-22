import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { useContext, useState } from "react";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { formatItemDisplayName } from "../Shared/iteminfo-util";
import { formatPriceShort } from "./TradesOverview";
import { SideMixBar } from "./TradeMarketBits";
import { GroupedTradeItem, itemRefToItemInfo } from "./tradeViewModel";
import { TradeItemCard } from "./TradeItemCard";

export function TradeCompactTile({ group }: { group: GroupedTradeItem }) {
  const G = useContext(GDataContext);
  const [expanded, setExpanded] = useState(false);
  const itemInfo = itemRefToItemInfo(group.listing);
  const displayName = G ? formatItemDisplayName(itemInfo, G) : group.listing.name;
  const hasGold = group.cheapestWts !== undefined || group.highestWtb !== undefined;

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
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: 1,
        },
      }}
    >
      <CardActionArea onClick={() => setExpanded(true)} sx={{ height: "100%" }}>
        <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", minWidth: 0 }}>
              <Box sx={{ flexShrink: 0 }}>
                <ItemInstance itemInfo={itemInfo} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                <Typography
                  variant="body2"
                  noWrap
                  title={displayName}
                  sx={{ fontWeight: 600, lineHeight: 1.15 }}
                >
                  {displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {group.listing.name}
                </Typography>
              </Box>
            </Box>

            <SideMixBar wtsCount={group.wtsCount} wtbCount={group.wtbCount} showLabels={false} />

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "baseline" }}>
              {group.wtsCount > 0 ? (
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
                  {group.wtsCount} sell
                </Typography>
              ) : null}
              {group.wtbCount > 0 ? (
                <Typography variant="caption" color="info.main" sx={{ fontWeight: 700 }}>
                  {group.wtbCount} buy
                </Typography>
              ) : null}
              {group.hasBarter ? (
                <Typography variant="caption" color="text.secondary">
                  barter
                </Typography>
              ) : null}
            </Box>

            {hasGold ? (
              <Typography variant="caption" color="text.secondary" noWrap>
                {group.cheapestWts !== undefined ? (
                  <>
                    from{" "}
                    <Box component="span" sx={{ color: "success.main", fontWeight: 700 }}>
                      {formatPriceShort(group.cheapestWts)}
                    </Box>
                  </>
                ) : null}
                {group.cheapestWts !== undefined && group.highestWtb !== undefined ? " · " : ""}
                {group.highestWtb !== undefined ? (
                  <>
                    buy to{" "}
                    <Box component="span" sx={{ color: "info.main", fontWeight: 700 }}>
                      {formatPriceShort(group.highestWtb)}
                    </Box>
                  </>
                ) : null}
              </Typography>
            ) : group.hasBarter ? (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                item trades only
              </Typography>
            ) : null}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
