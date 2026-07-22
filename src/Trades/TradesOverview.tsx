import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { useContext } from "react";
import { ItemKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { getItemName } from "../Shared/iteminfo-util";
import { abbreviateNumber } from "../Shared/utils";
import { TradeOverviewItem, TradeOverviewStats, itemRefToItemInfo } from "./tradeViewModel";

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <Box
      sx={{
        flex: "1 1 100px",
        minWidth: 88,
        p: 1.25,
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

function TopItemTile({ item }: { item: TradeOverviewItem }) {
  const G = useContext(GDataContext);
  if (!G) {
    return null;
  }

  const itemInfo = itemRefToItemInfo(item.listing);
  const gItem = G.items[item.listing.name as ItemKey];
  const displayName = gItem ? getItemName(item.listing.name as ItemKey, gItem) : item.listing.name;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        minWidth: 0,
      }}
      title={`${item.wtsCount} WTS · ${item.wtbCount} WTB`}
    >
      <Box sx={{ transform: "scale(0.75)", transformOrigin: "center", flexShrink: 0 }}>
        <ItemInstance itemInfo={itemInfo} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap title={displayName}>
          {displayName}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
          {item.wtsCount > 0 ? (
            <Chip
              size="small"
              color="success"
              label={`${item.wtsCount} WTS`}
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          ) : null}
          {item.wtbCount > 0 ? (
            <Chip
              size="small"
              color="info"
              label={`${item.wtbCount} WTB`}
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

function TopItemsGrid({ stats }: { stats: TradeOverviewStats }) {
  if (stats.topItems.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Most listed items
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 1,
        }}
      >
        {stats.topItems.map((item) => (
          <TopItemTile key={item.key} item={item} />
        ))}
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
        <TopItemsGrid stats={stats} />
      </CardContent>
    </Card>
  );
}

export function formatPriceShort(price?: number): string {
  if (price === undefined) return "";
  const abbreviated = abbreviateNumber(price);
  return abbreviated !== undefined ? String(abbreviated) : String(price);
}
