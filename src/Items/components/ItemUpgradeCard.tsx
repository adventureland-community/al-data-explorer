import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { GItem, ItemKey } from "typed-adventureland";

import {
  buildItemUpgradeSnapshot,
  formatChancePct,
  formatGold,
  itemUpgradeMode,
} from "../../gameData/itemUpgradeSnapshot";
import { breakEvenListPrice, DEFAULT_MERCHANT_TAX } from "../../gameData/merchantTax";
import { CustomGData } from "../../GDataContext";
import { ItemInstance } from "../../Shared/ItemInstance";
import { useMerchants } from "../../Market/useMerchants";

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box sx={{ minWidth: 72 }} title={hint}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", lineHeight: 1.2 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/**
 * When the detail page is showing a higher upgrade/compound level, surface a
 * compact cheapest-path summary plus a deep link into the Upgrade Calculator.
 */
export function ItemUpgradeCard({
  itemKey,
  gItem,
  level,
  G,
}: {
  itemKey: ItemKey;
  gItem: GItem;
  level: number;
  G: CustomGData;
}) {
  const { items: marketItems } = useMerchants();

  const tables = useMemo(() => {
    const gAny = G as typeof G & {
      upgrades?: Record<number, Record<number, number>>;
      compounds?: Record<number, Record<number, number>>;
    };
    return { upgrades: gAny.upgrades, compounds: gAny.compounds };
  }, [G]);

  const snapshot = useMemo(() => {
    if (!itemUpgradeMode(gItem) || level < 1) return null;
    return buildItemUpgradeSnapshot({
      itemKey,
      gItem,
      level,
      items: G.items,
      tables,
      market: marketItems,
    });
  }, [gItem, itemKey, level, G.items, tables, marketItems]);

  if (!snapshot) return null;

  const last = snapshot.lastStep;
  const rangeLabel =
    snapshot.mode === "compound"
      ? `Compound to +${snapshot.targetLevel}`
      : `Upgrade to +${snapshot.targetLevel}`;
  const breakEvenAsk =
    snapshot.planEv != null ? breakEvenListPrice(snapshot.planEv, DEFAULT_MERCHANT_TAX) : null;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 1.25 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <ItemInstance
            itemInfo={{ name: itemKey, level: snapshot.targetLevel }}
            size={40}
            tooltip
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
              {rangeLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {snapshot.strategyLabel} path · vendor / market prices
            </Typography>
          </Box>
        </Stack>
        <Button
          component={RouterLink}
          to={snapshot.calcHref}
          size="small"
          variant="outlined"
          sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}
        >
          Open calculator
        </Button>
      </Stack>

      <Stack
        direction="row"
        spacing={{ xs: 2, sm: 3 }}
        flexWrap="wrap"
        sx={{ gap: 2, mb: last || snapshot.bottleneck ? 1.25 : 0 }}
      >
        <Metric
          label="Plan EV"
          value={snapshot.planEv != null ? formatGold(snapshot.planEv) : "—"}
        />
        <Metric
          label="Break-even ask"
          value={breakEvenAsk == null ? "—" : formatGold(breakEvenAsk)}
          hint={`List price so ${
            DEFAULT_MERCHANT_TAX * 100
          }% merchant tax still leaves Plan EV. Open the calculator to change tax.`}
        />
        <Metric
          label="Exp. attempts"
          value={
            snapshot.totalAttempts != null
              ? snapshot.totalAttempts.toFixed(snapshot.totalAttempts >= 10 ? 1 : 2)
              : "—"
          }
        />
        <Metric
          label="One-shot"
          value={snapshot.oneshotPct == null ? "—" : `${snapshot.oneshotPct.toFixed(2)}%`}
          hint="Chance of clearing every step on the first try (no retries)."
        />
        {snapshot.shrineTime ? (
          <Metric
            label="Shrine time"
            value={snapshot.shrineTime}
            hint="Expected shrine wait assuming Mass Production++ (indicative)."
          />
        ) : null}
      </Stack>

      {last ? (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
          Final step{" "}
          <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
            +{last.fromLevel}→+{last.toLevel}
          </Box>
          : {last.scrollKey}
          {last.offeringKey ? ` + ${last.offeringKey}` : ""} · {formatChancePct(last.chance)}
          {Number.isFinite(last.stepSpend) ? ` · ${formatGold(last.stepSpend)}` : ""}
          {snapshot.inboundBaseChance != null &&
          Math.abs(snapshot.inboundBaseChance - last.chance) > 0.0005
            ? ` (table ${formatChancePct(snapshot.inboundBaseChance)} without offering)`
            : null}
        </Typography>
      ) : null}

      {snapshot.bottleneck ? (
        <Typography
          variant="body2"
          color="warning.main"
          sx={{ mt: last ? 0.75 : 0, lineHeight: 1.45 }}
        >
          Bottleneck +{snapshot.bottleneck.fromLevel}→+{snapshot.bottleneck.toLevel}:{" "}
          {formatChancePct(snapshot.bottleneck.chance)}, {formatGold(snapshot.bottleneck.stepSpend)}{" "}
          ({Math.round(snapshot.bottleneck.share * 100)}% of plan EV)
        </Typography>
      ) : null}
    </Paper>
  );
}
