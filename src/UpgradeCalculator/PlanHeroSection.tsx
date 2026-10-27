import { Box, Button, Chip, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import {
  breakEvenListPrice,
  DEFAULT_MERCHANT_TAX,
  formatChancePct,
  formatGold,
  PlanSummaryStep,
} from "../calculators";
import { ItemInstance } from "../Shared/ItemInstance";
import { Metric } from "./planResultsShared";
import { CalcMode, CalcStrategy } from "./useUpgradeCalcParams";

function TaxPercentField({
  taxRate,
  onTaxRateChange,
}: {
  taxRate: number;
  onTaxRateChange: (rate: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => String(Number((taxRate * 100).toFixed(4))));

  useEffect(() => {
    if (!focused) setDraft(String(Number((taxRate * 100).toFixed(4))));
  }, [taxRate, focused]);

  return (
    <TextField
      size="small"
      value={draft}
      onFocus={() => {
        setFocused(true);
        setDraft(String(Number((taxRate * 100).toFixed(4))));
      }}
      onBlur={() => {
        setFocused(false);
        const n = Number(draft.replace(/,/g, ""));
        if (Number.isFinite(n) && n >= 0 && n < 100) onTaxRateChange(n / 100);
        else setDraft(String(Number((taxRate * 100).toFixed(4))));
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" || /^\d*\.?\d*$/.test(raw)) setDraft(raw);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      inputProps={{
        inputMode: "decimal",
        "aria-label": "Merchant tax percent",
        sx: { fontVariantNumeric: "tabular-nums", textAlign: "right", width: 44, py: 0.5 },
      }}
      sx={{ width: 64, flexShrink: 0, "& .MuiOutlinedInput-root": { height: 28 } }}
    />
  );
}

export function PlanHero({
  itemKey,
  itemName,
  mode,
  from = 0,
  target,
  strategy,
  planEv,
  materialsSum,
  destroyGap,
  totalAttempts,
  oneshotPct,
  shrineTime = null,
  taxRate = DEFAULT_MERCHANT_TAX,
  onTaxRateChange,
  bottleneck,
  showMetrics = true,
  onBottleneckClick,
  alternateStrategy,
}: {
  itemKey: string;
  itemName: string;
  mode: Exclude<CalcMode, "greed">;
  from?: number;
  target: number;
  strategy: CalcStrategy;
  planEv: number;
  materialsSum: number;
  destroyGap: number;
  totalAttempts: number;
  oneshotPct: number | null;
  /** Expected shrine wait with Mass Production++ (indicative). */
  shrineTime?: string | null;
  /** Merchant-stand tax fraction (`character.tax`). */
  taxRate?: number;
  onTaxRateChange?: (rate: number) => void;
  bottleneck: PlanSummaryStep | null;
  /** When false, skip EV/attempts/oneshot (already on strategy cards). */
  showMetrics?: boolean;
  onBottleneckClick?: () => void;
  /** When risk dominates Cheapest, offer a one-click jump to Fewest. */
  alternateStrategy?: {
    strategy: CalcStrategy;
    label: string;
    detail: string;
    onSelect: () => void;
  } | null;
}) {
  const strategyLabel = strategy === "fewest" ? "Fewest copies" : "Cheapest";
  const rangeLabel =
    mode === "compound"
      ? `Compound to +${target}`
      : from > 0
      ? `Upgrade +${from} → +${target}`
      : `Upgrade to +${target}`;
  const matShare = planEv > 0 && Number.isFinite(materialsSum) ? materialsSum / planEv : 0;
  const riskShare = planEv > 0 && destroyGap > 0 ? destroyGap / planEv : 0;
  const bottleneckShare =
    bottleneck && planEv > 0 && Number.isFinite(bottleneck.stepSpend)
      ? bottleneck.stepSpend / planEv
      : 0;
  const riskDominates = riskShare >= 0.5;
  const askPrice = breakEvenListPrice(planEv, taxRate);
  const taxPctLabel = `${Number((taxRate * 100).toFixed(4))}%`;

  const compact = !showMetrics;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.5 : 2,
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
      }}
    >
      <Stack spacing={compact ? 1.25 : 2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={compact ? 1.25 : 2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flexShrink: 0 }}>
              {mode === "upgrade" && from > 0 ? (
                <>
                  <ItemInstance
                    itemInfo={{ name: itemKey as ItemKey, level: from }}
                    size={compact ? 32 : 40}
                    tooltip
                    linkToDetail
                  />
                  <Typography variant="body2" color="text.secondary" aria-hidden>
                    →
                  </Typography>
                </>
              ) : null}
              <ItemInstance
                itemInfo={{ name: itemKey as ItemKey, level: target }}
                size={compact ? 40 : 48}
                tooltip
                linkToDetail
              />
            </Stack>
            <Box sx={{ minWidth: 0 }}>
              <Link
                component={RouterLink}
                to={`/items/${encodeURIComponent(itemKey)}?level=${target}`}
                variant={compact ? "subtitle1" : "h6"}
                underline="hover"
                fontWeight={600}
                sx={{ display: "block", lineHeight: 1.25 }}
              >
                {itemName}
              </Link>
              <Typography variant="body2" color="text.secondary">
                {rangeLabel} · {strategyLabel}
                {compact ? (
                  <>
                    {" "}
                    ·{" "}
                    <Box
                      component="span"
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatGold(planEv)}
                    </Box>
                    {shrineTime ? ` · ${shrineTime}` : null}
                  </>
                ) : null}
              </Typography>
            </Box>
          </Stack>

          {showMetrics ? (
            <Stack
              direction="row"
              spacing={{ xs: 2, sm: 3 }}
              flexWrap="wrap"
              sx={{ gap: { xs: 2, sm: 3 }, "& > *": { minWidth: 88 } }}
            >
              <Metric label="Plan EV" value={formatGold(planEv)} />
              <Metric
                label="Break-even ask"
                value={askPrice == null ? "—" : formatGold(askPrice)}
                hint={`List price so merchant tax (${taxPctLabel}) still leaves you with Plan EV. Match character.tax on Stats.`}
              />
              <Metric
                label="Exp. attempts"
                value={
                  Number.isFinite(totalAttempts)
                    ? totalAttempts.toFixed(totalAttempts >= 10 ? 1 : 2)
                    : "—"
                }
              />
              <Metric
                label="One-shot"
                value={oneshotPct == null ? "—" : `${oneshotPct.toFixed(2)}%`}
                hint="Chance of clearing every step on the first try (no retries). Real runs retry each step."
              />
              {shrineTime ? (
                <Metric
                  label="Shrine time"
                  value={shrineTime}
                  hint="Expected shrine wait assuming Mass Production++ on every click (indicative)."
                />
              ) : null}
            </Stack>
          ) : null}
        </Stack>

        {compact && askPrice != null ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            Break-even ask {formatGold(askPrice)}
            <Box component="span" sx={{ color: "text.disabled" }}>
              {" "}
              · after {taxPctLabel} tax
            </Box>
          </Typography>
        ) : null}

        {onTaxRateChange ? (
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ gap: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              Merchant tax
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <TaxPercentField taxRate={taxRate} onTaxRateChange={onTaxRateChange} />
              <Typography variant="caption" color="text.secondary">
                %
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.disabled">
              from Stats · ask = ceil(EV ÷ (1 − tax))
            </Typography>
          </Stack>
        ) : null}

        <Box>
          <Box
            sx={{
              display: "flex",
              height: compact ? 6 : 10,
              borderRadius: 1,
              overflow: "hidden",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            }}
          >
            {matShare > 0 ? (
              <Box
                sx={{ width: `${matShare * 100}%`, bgcolor: "primary.main" }}
                title="Materials"
              />
            ) : null}
            {riskShare > 0 ? (
              <Box
                sx={{ width: `${riskShare * 100}%`, bgcolor: "warning.main" }}
                title="Destroy / base risk"
              />
            ) : null}
          </Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            spacing={1}
            sx={{ mt: 0.75 }}
          >
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <Box component="span" sx={{ color: "primary.main", fontWeight: 700 }}>
                  ■
                </Box>{" "}
                Materials {formatGold(materialsSum)}
                {planEv > 0 ? ` (${Math.round(matShare * 100)}%)` : ""}
              </Typography>
              {destroyGap > 0 ? (
                <Typography
                  variant="caption"
                  color={riskDominates ? "warning.main" : "text.secondary"}
                >
                  <Box component="span" sx={{ color: "warning.main", fontWeight: 700 }}>
                    ■
                  </Box>{" "}
                  Destroy / base risk {formatGold(destroyGap)}
                  {planEv > 0 ? ` (${Math.round(riskShare * 100)}%)` : ""}
                </Typography>
              ) : null}
            </Stack>
            {alternateStrategy ? (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={alternateStrategy.onSelect}
                sx={{ alignSelf: { xs: "stretch", sm: "center" }, flexShrink: 0 }}
              >
                {alternateStrategy.label}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.75 }}
                >
                  {alternateStrategy.detail}
                </Typography>
              </Button>
            ) : null}
          </Stack>
        </Box>

        {bottleneck && bottleneckShare >= 0.4 ? (
          <Box
            {...(onBottleneckClick
              ? {
                  component: "button" as const,
                  type: "button" as const,
                  onClick: onBottleneckClick,
                }
              : {})}
            sx={{
              px: 1.25,
              py: compact ? 0.75 : 1,
              borderRadius: 1,
              border: 1,
              borderColor: "warning.main",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 167, 38, 0.08)"
                  : "rgba(255, 167, 38, 0.1)",
              font: "inherit",
              color: "inherit",
              textAlign: "left",
              width: "100%",
              cursor: onBottleneckClick ? "pointer" : "default",
              "&:hover": onBottleneckClick ? { borderColor: "warning.dark" } : undefined,
              "&:focus-visible": onBottleneckClick
                ? {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2,
                  }
                : undefined,
            }}
          >
            <Typography variant="body2">
              Bottleneck{" "}
              <strong>
                +{bottleneck.fromLevel}→+{bottleneck.toLevel}
              </strong>
              : {formatChancePct(bottleneck.chance)} chance, {formatGold(bottleneck.stepSpend)} (
              {Math.round(bottleneckShare * 100)}% of plan EV)
              {onBottleneckClick ? (
                <Typography component="span" variant="caption" color="text.secondary">
                  {" "}
                  · jump to step
                </Typography>
              ) : null}
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}

/** Active toolkit / chance knobs — click to toggle. */
export function PlanModifiersChips({
  luckySlot,
  serverUgrace,
  statScrollGrace,
  wantShiny = false,
  shinyLabel = "Polish Shiny",
  shinyAvailable = true,
  statScrollAvailable = true,
  primstacking,
  scroll4,
  offeringp,
  offering,
  offeringx,
  mode,
  onToggle,
}: {
  luckySlot: boolean;
  serverUgrace: boolean;
  statScrollGrace: boolean;
  wantShiny?: boolean;
  shinyLabel?: string;
  shinyAvailable?: boolean;
  /** False when the selected item has no `stat` pool. */
  statScrollAvailable?: boolean;
  primstacking: boolean;
  scroll4: boolean;
  offeringp: boolean;
  offering: boolean;
  offeringx: boolean;
  mode: Exclude<CalcMode, "greed">;
  onToggle: (
    key:
      | "luckySlot"
      | "serverUgrace"
      | "statScrollGrace"
      | "wantShiny"
      | "primstacking"
      | "scroll4"
      | "offeringp"
      | "offering"
      | "offeringx",
  ) => void;
}) {
  const chips: {
    key:
      | "luckySlot"
      | "serverUgrace"
      | "statScrollGrace"
      | "wantShiny"
      | "primstacking"
      | "scroll4"
      | "offeringp"
      | "offering"
      | "offeringx";
    label: string;
    on: boolean;
    show: boolean;
    disabled?: boolean;
  }[] = [
    { key: "luckySlot", label: "Lucky Slot", on: luckySlot, show: mode === "upgrade" },
    { key: "serverUgrace", label: "Server ugrace", on: serverUgrace, show: mode === "upgrade" },
    {
      key: "statScrollGrace",
      label: "Stat scroll grace",
      on: statScrollGrace,
      show: mode === "upgrade",
      disabled: !statScrollAvailable,
    },
    {
      key: "wantShiny",
      label: shinyLabel,
      on: wantShiny,
      show: mode === "upgrade",
      disabled: !shinyAvailable,
    },
    { key: "offeringp", label: "Primling", on: offeringp, show: true },
    {
      key: "primstacking",
      label: "Primstacking",
      on: primstacking,
      show: mode === "upgrade" && offeringp,
    },
    { key: "offering", label: "Offering", on: offering, show: true },
    { key: "offeringx", label: "Offering X", on: offeringx, show: true },
    { key: "scroll4", label: "Scroll 4", on: scroll4, show: true },
  ];

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {chips
        .filter((c) => c.show)
        .map((c) => (
          <Chip
            key={c.key}
            size="small"
            label={c.label}
            color={c.on ? "primary" : "default"}
            variant={c.on ? "filled" : "outlined"}
            disabled={c.disabled}
            onClick={c.disabled ? undefined : () => onToggle(c.key)}
            sx={{ height: 24, fontSize: "0.75rem" }}
          />
        ))}
    </Box>
  );
}
