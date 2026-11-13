import { Box, CircularProgress, Typography } from "@mui/material";

import { abbreviateGold } from "../Shared/utils";
import type { ItemCalcRange } from "./marketPriceCompare";
import { formatCalcGoldRange } from "./marketPriceCompare";

function goldLine(label: string, value: number | null | undefined, hint?: string) {
  const body = abbreviateGold(value, { empty: "—", positiveOnly: true });
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }} title={hint}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
        {body}
      </Typography>
    </Box>
  );
}

/**
 * Compact Cheapest / Fewest expected-cost card for an expanded market row.
 * Flat items (no upgrade/compound path) show an empty state — never NPC sell value.
 */
export function CalcCostGlance({
  calcRange,
  loading,
}: {
  calcRange?: ItemCalcRange;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          p: 1.25,
          bgcolor: "background.paper",
          minWidth: 200,
          maxWidth: 280,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
        title="Upgrade/compound expected-cost is calculating…"
      >
        <Typography variant="subtitle2">Calc</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={18} thickness={5} />
          <Typography variant="body2" color="text.secondary">
            Calculating…
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!calcRange || calcRange.kind !== "upgrade-path") {
    return (
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          p: 1.25,
          bgcolor: "background.paper",
          minWidth: 200,
          maxWidth: 280,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Calc
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No upgrade/compound path
        </Typography>
      </Box>
    );
  }

  const modeLabel = calcRange.mode === "compound" ? "Compound" : "Upgrade";
  const rangeLabel = formatCalcGoldRange(calcRange.low, calcRange.high);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1.25,
        bgcolor: "background.paper",
        minWidth: 220,
        maxWidth: 300,
      }}
      title={`Expected gold to +${calcRange.targetLevel} (${rangeLabel})`}
    >
      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
        {modeLabel} to +{calcRange.targetLevel}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {goldLine("Cheapest", calcRange.cheapest, "Cost-optimal path (Pareto / costOptimal)")}
        {goldLine("Fewest copies", calcRange.fewest, "Max-chance / best-odds path")}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
        Range {rangeLabel}
      </Typography>
    </Box>
  );
}
