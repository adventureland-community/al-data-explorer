import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { useContext } from "react";

import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { formatItemDisplayName } from "../Shared/iteminfo-util";
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

function TopItemTile({
  item,
  selected,
  onSelect,
}: {
  item: TradeOverviewItem;
  selected: boolean;
  onSelect: (item: TradeOverviewItem) => void;
}) {
  const G = useContext(GDataContext);
  if (!G) {
    return null;
  }

  const itemInfo = itemRefToItemInfo(item.listing);
  const displayName = formatItemDisplayName(itemInfo, G);

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onSelect(item)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        borderRadius: 1,
        border: 1,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? "action.selected" : "background.paper",
        minWidth: 0,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": {
          borderColor: "primary.main",
          bgcolor: selected ? "action.selected" : "action.hover",
        },
      }}
      title={
        selected
          ? `Clear filter for ${displayName}`
          : `Filter to ${displayName} (${item.wtsCount} WTS · ${item.wtbCount} WTB)`
      }
      aria-pressed={selected}
    >
      <Box sx={{ flexShrink: 0 }}>
        <ItemInstance itemInfo={itemInfo} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1, textAlign: "left" }}>
        <Typography variant="subtitle2" noWrap title={displayName} sx={{ lineHeight: 1.15 }}>
          {displayName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {item.listing.name}
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

function TopItemsGrid({
  stats,
  selectedItemName,
  onItemSelect,
}: {
  stats: TradeOverviewStats;
  selectedItemName?: string;
  onItemSelect: (item: TradeOverviewItem) => void;
}) {
  if (stats.topItems.length === 0) {
    return null;
  }

  const selected = selectedItemName?.trim().toLowerCase() ?? "";

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Listed items
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 1,
        }}
      >
        {stats.topItems.map((item) => (
          <TopItemTile
            key={item.key}
            item={item}
            selected={selected === item.listing.name.toLowerCase()}
            onSelect={onItemSelect}
          />
        ))}
      </Box>
    </Box>
  );
}

export function TradesOverview({
  stats,
  selectedItemName,
  onItemSelect,
}: {
  stats: TradeOverviewStats;
  selectedItemName?: string;
  onItemSelect?: (item: TradeOverviewItem) => void;
}) {
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
        <TopItemsGrid
          stats={stats}
          selectedItemName={selectedItemName}
          onItemSelect={onItemSelect ?? (() => undefined)}
        />
      </CardContent>
    </Card>
  );
}
