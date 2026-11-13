import { Box, Chip, LinearProgress, Typography } from "@mui/material";

import { abbreviateGold } from "../Shared/utils";
import type { GoldOfferRow } from "./marketOfferRows";
import { isParkingGoldPrice, leadAskPrice } from "./marketPriceCompare";

type PriceSpreadGlanceProps = {
  buyGold: GoldOfferRow[];
  sellGold: GoldOfferRow[];
  standTradeCount: number;
  earthCount: number;
};

/**
 * At-a-glance bid/ask share + price ticks for an expanded market row.
 * Parking asks (≈100B+) are kept out of the tick scale so they don't crush the graph.
 */
export function PriceSpreadGlance({
  buyGold,
  sellGold,
  standTradeCount,
  earthCount,
}: PriceSpreadGlanceProps) {
  const bestBid = buyGold[0]?.price;
  const bestAsk = leadAskPrice(sellGold);
  const parkAsks = sellGold.filter((r) => isParkingGoldPrice(r.price));
  const liveAsks = sellGold.filter((r) => !isParkingGoldPrice(r.price));
  const bidCount = buyGold.length;
  const askCount = sellGold.length;
  const total = Math.max(1, bidCount + askCount + standTradeCount + earthCount);
  const bidShare = (bidCount / total) * 100;

  // One tick per distinct side+price (parking asks omitted from scale).
  const tickMap = new Map<string, { price: number; side: "bid" | "ask" }>();
  for (const r of buyGold) tickMap.set(`bid-${r.price}`, { price: r.price, side: "bid" });
  for (const r of liveAsks) tickMap.set(`ask-${r.price}`, { price: r.price, side: "ask" });
  const ticks = Array.from(tickMap.values());
  const min = ticks.length ? Math.min(...ticks.map((t) => t.price)) : 0;
  const max = ticks.length ? Math.max(...ticks.map((t) => t.price)) : 1;
  const span = Math.max(1, max - min);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1.25,
        bgcolor: "background.paper",
        maxWidth: 420,
        flex: "1 1 280px",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
        <Typography variant="body2" sx={{ color: "success.light" }}>
          Bid {abbreviateGold(bestBid, { empty: "—", positiveOnly: true })}
        </Typography>
        <Typography variant="body2" sx={{ color: "error.light" }}>
          Ask {abbreviateGold(bestAsk, { empty: "—", positiveOnly: true })}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={bidShare}
        sx={{
          height: 6,
          borderRadius: 1,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(198,40,40,0.35)" : "rgba(198,40,40,0.2)",
          "& .MuiLinearProgress-bar": { bgcolor: "success.main" },
        }}
      />
      {ticks.length > 0 ? (
        <Box
          sx={{
            position: "relative",
            height: 14,
            mt: 1,
            mx: 0.25,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
          aria-hidden
        >
          {ticks.map((tick) => {
            const left = ((tick.price - min) / span) * 100;
            return (
              <Box
                key={`${tick.side}-${tick.price}`}
                title={`${tick.side} ${tick.price.toLocaleString()}`}
                sx={{
                  position: "absolute",
                  left: `${left}%`,
                  bottom: 2,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  bgcolor: tick.side === "bid" ? "success.main" : "error.main",
                  transform: "translateX(-50%)",
                }}
              />
            );
          })}
        </Box>
      ) : null}
      <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
        <Chip size="small" label={`${bidCount} bid`} color={bidCount ? "success" : "default"} />
        <Chip size="small" label={`${askCount} ask`} color={askCount ? "error" : "default"} />
        {parkAsks.length > 0 ? (
          <Chip
            size="small"
            label={`${parkAsks.length} park`}
            title="Asks ≈100B+ are usually stand parking, not real sells"
            variant="outlined"
          />
        ) : null}
        <Chip size="small" label={`${standTradeCount} stand`} />
        <Chip
          size="small"
          label={`${earthCount} earth`}
          color={earthCount ? "info" : "default"}
          variant="outlined"
        />
      </Box>
    </Box>
  );
}
