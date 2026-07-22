import { Box, Typography } from "@mui/material";

import { formatPriceShort } from "./TradesOverview";

/** Compact green/blue WTS vs WTB share bar. */
export function SideMixBar({
  wtsCount,
  wtbCount,
  showLabels = true,
}: {
  wtsCount: number;
  wtbCount: number;
  showLabels?: boolean;
}) {
  const total = wtsCount + wtbCount;
  if (total === 0) {
    return null;
  }

  const wtsPct = (wtsCount / total) * 100;
  const wtbPct = (wtbCount / total) * 100;

  return (
    <Box sx={{ width: "100%" }} title={`${wtsCount} WTS · ${wtbCount} WTB`}>
      <Box
        sx={{
          display: "flex",
          height: showLabels ? 8 : 5,
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "action.hover",
        }}
      >
        {wtsCount > 0 ? (
          <Box
            sx={{ width: `${wtsPct}%`, bgcolor: "success.main", minWidth: wtsCount > 0 ? 3 : 0 }}
          />
        ) : null}
        {wtbCount > 0 ? (
          <Box sx={{ width: `${wtbPct}%`, bgcolor: "info.main", minWidth: wtbCount > 0 ? 3 : 0 }} />
        ) : null}
      </Box>
      {showLabels ? (
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
          <Typography variant="caption" color="success.main" sx={{ fontSize: "0.7rem" }}>
            {wtsCount > 0 ? `sell ${Math.round(wtsPct)}%` : ""}
          </Typography>
          <Typography variant="caption" color="info.main" sx={{ fontSize: "0.7rem" }}>
            {wtbCount > 0 ? `buy ${Math.round(wtbPct)}%` : ""}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

export function GoldPriceRange({
  cheapestWts,
  highestWtb,
}: {
  cheapestWts?: number;
  highestWtb?: number;
}) {
  if (cheapestWts === undefined && highestWtb === undefined) {
    return null;
  }

  const low = cheapestWts ?? highestWtb!;
  const high = highestWtb ?? cheapestWts!;
  const span = Math.max(high - low, 1);
  const lowPos = cheapestWts !== undefined ? ((cheapestWts - low) / span) * 100 : 0;
  const highPos = highestWtb !== undefined ? ((highestWtb - low) / span) * 100 : 100;

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
          {cheapestWts !== undefined ? `Low ${formatPriceShort(cheapestWts)}` : "Low —"}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
          {highestWtb !== undefined ? `High ${formatPriceShort(highestWtb)}` : "High —"}
        </Typography>
      </Box>
      <Box sx={{ position: "relative", height: 6, borderRadius: 1, bgcolor: "action.hover" }}>
        {cheapestWts !== undefined ? (
          <Box
            sx={{
              position: "absolute",
              left: `calc(${lowPos}% - 4px)`,
              top: -2,
              width: 8,
              height: 10,
              borderRadius: 0.5,
              bgcolor: "success.main",
            }}
            title={`Cheapest WTS ${cheapestWts.toLocaleString()}`}
          />
        ) : null}
        {highestWtb !== undefined ? (
          <Box
            sx={{
              position: "absolute",
              left: `calc(${Math.min(highPos, 100)}% - 4px)`,
              top: -2,
              width: 8,
              height: 10,
              borderRadius: 0.5,
              bgcolor: "info.main",
            }}
            title={`Highest WTB ${highestWtb.toLocaleString()}`}
          />
        ) : null}
      </Box>
    </Box>
  );
}
