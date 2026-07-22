import { Box, Card, CardContent, Typography } from "@mui/material";
import { useContext } from "react";
import { ItemKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { getItemName } from "../Shared/iteminfo-util";
import { abbreviateNumber } from "../Shared/utils";
import { TradeOverviewStats, itemRefToItemInfo } from "./tradeViewModel";

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <Box
      sx={{
        flex: "1 1 120px",
        minWidth: 100,
        p: 1.5,
        borderRadius: 1,
        bgcolor: "action.hover",
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Box>
  );
}

function TopItemsChart({ stats }: { stats: TradeOverviewStats }) {
  const G = useContext(GDataContext);
  if (!G || stats.topItems.length === 0) {
    return null;
  }

  const maxTotal = Math.max(...stats.topItems.map((item) => item.totalCount), 1);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Most listed items
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {stats.topItems.map((item) => {
          const itemInfo = itemRefToItemInfo(item.listing);
          const gItem = G.items[item.listing.name as ItemKey];
          const displayName = gItem
            ? getItemName(item.listing.name as ItemKey, gItem)
            : item.listing.name;
          const wtsWidth = (item.wtsCount / maxTotal) * 100;
          const wtbWidth = (item.wtbCount / maxTotal) * 100;

          return (
            <Box key={item.key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ transform: "scale(0.7)", transformOrigin: "left center", width: 36 }}>
                <ItemInstance itemInfo={itemInfo} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" noWrap title={displayName}>
                  {displayName}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    height: 8,
                    borderRadius: 0.5,
                    overflow: "hidden",
                    mt: 0.25,
                  }}
                >
                  {item.wtsCount > 0 ? (
                    <Box
                      sx={{
                        width: `${wtsWidth}%`,
                        bgcolor: "success.main",
                        minWidth: item.wtsCount > 0 ? 4 : 0,
                      }}
                      title={`${item.wtsCount} WTS`}
                    />
                  ) : null}
                  {item.wtbCount > 0 ? (
                    <Box
                      sx={{
                        width: `${wtbWidth}%`,
                        bgcolor: "info.main",
                        minWidth: item.wtbCount > 0 ? 4 : 0,
                      }}
                      title={`${item.wtbCount} WTB`}
                    />
                  ) : null}
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {item.totalCount}
              </Typography>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
        <Typography variant="caption" color="success.main">
          ■ WTS
        </Typography>
        <Typography variant="caption" color="info.main">
          ■ WTB
        </Typography>
      </Box>
    </Box>
  );
}

export function TradesOverview({ stats }: { stats: TradeOverviewStats }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          What&apos;s trading
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Bank WTS/WTB listings from{" "}
          <a href="https://aldata.earthiverse.ca">earthiverse&apos;s aldata</a> — distinct from
          merchant stands on Market.
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <StatBox label="Listings" value={stats.totalListings} />
          <StatBox label="WTS" value={stats.wtsCount} />
          <StatBox label="WTB" value={stats.wtbCount} />
          <StatBox label="Items" value={stats.uniqueItems} />
          <StatBox label="Owners" value={stats.uniqueOwners} />
        </Box>
        <TopItemsChart stats={stats} />
      </CardContent>
    </Card>
  );
}

export function formatPriceShort(price?: number): string {
  if (price === undefined) return "";
  const abbreviated = abbreviateNumber(price);
  return abbreviated !== undefined ? String(abbreviated) : String(price);
}
