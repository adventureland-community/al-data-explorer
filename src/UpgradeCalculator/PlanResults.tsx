import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useContext, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { OfferingChoice } from "../gameData/upgradeChance";
import {
  allowedUpgradeScrollGrades,
  formatAttempts,
  formatChancePct,
  formatGold,
  MaterialLine,
  PlanSummaryStep,
  UpgradeStepOverride,
  upgradeStepOverrideKey,
} from "../gameData/upgradePath";
import { offeringGradeFromKey } from "../gameData/upgradePrices";
import { SideEffectSummary } from "../gameData/upgradeSideEffects";
import { ItemImage } from "../ItemImage";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { CalcMode, CalcStrategy } from "./useUpgradeCalcParams";

/** Inventory-slot size — dark tile so pale scroll sprites stay readable. */
const ICON = 40;
const SLOT_BG = "#2a2d36";
const SLOT_BORDER = "#4a4e5a";

function chanceTone(chance: number): "success.main" | "warning.main" | "error.main" {
  const pct = chance * 100;
  if (pct >= 70) return "success.main";
  if (pct >= 35) return "warning.main";
  return "error.main";
}

function CostShareBar({
  share,
  color = "primary.main",
  height = 8,
  minWidth = 64,
}: {
  share: number;
  color?: string;
  height?: number;
  minWidth?: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(share * 100)));
  return (
    <Box
      sx={{
        height,
        width: "100%",
        minWidth,
        borderRadius: 1,
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
      title={`${pct}% of plan EV`}
    >
      <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: color }} />
    </Box>
  );
}

function MatIcon({ itemKey }: { itemKey: string }) {
  if (itemKey === "_stacks") {
    return (
      <Box
        sx={{
          width: ICON,
          height: ICON,
          flexShrink: 0,
          borderRadius: 0.5,
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          typography: "caption",
          color: "text.secondary",
        }}
      >
        stk
      </Box>
    );
  }
  return <ItemInstance itemInfo={{ name: itemKey as ItemKey }} size={ICON} tooltip linkToDetail />;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const body = (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
    </Box>
  );
  if (!hint) return body;
  return (
    <Tooltip title={hint}>
      <Box sx={{ cursor: "help" }}>{body}</Box>
    </Tooltip>
  );
}

function MatSlot({
  itemKey,
  size = ICON,
  emptyLabel = "None",
}: {
  itemKey: string | null;
  size?: number;
  emptyLabel?: string;
}) {
  if (!itemKey) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: 0.5,
          border: `1px solid ${SLOT_BORDER}`,
          bgcolor: SLOT_BG,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.6rem", lineHeight: 1 }}
        >
          {emptyLabel}
        </Typography>
      </Box>
    );
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 0.5,
        border: `1px solid ${SLOT_BORDER}`,
        bgcolor: SLOT_BG,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        lineHeight: 0,
      }}
    >
      <ItemImage itemName={itemKey} size={size - 4} />
    </Box>
  );
}

function ColumnHead({ label, icons, tip }: { label: string; icons?: string[]; tip?: string }) {
  const inner = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      spacing={0.5}
      component="span"
      sx={{ display: "inline-flex" }}
    >
      {icons?.map((key) => (
        <Box
          key={key}
          component="span"
          sx={{
            display: "inline-flex",
            width: 18,
            height: 18,
            borderRadius: 0.25,
            border: `1px solid ${SLOT_BORDER}`,
            bgcolor: SLOT_BG,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 0,
          }}
        >
          <ItemImage itemName={key} size={16} />
        </Box>
      ))}
      <Box component="span">{label}</Box>
    </Stack>
  );
  if (!tip) return inner;
  return <Tooltip title={tip}>{inner}</Tooltip>;
}

function stackCell(value: number) {
  if (!value) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
      {value}
    </Typography>
  );
}

export function CopyPlanLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<ContentCopyIcon fontSize="small" />}
      onClick={() => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

export function StrategyCard({
  title,
  subtitle,
  total,
  attempts,
  oneshotPct,
  selected,
  badge,
  materialsSum,
  destroyGap,
  onSelect,
}: {
  title: string;
  subtitle: string;
  total: number | null;
  attempts?: number | null;
  oneshotPct?: number | null;
  selected: boolean;
  badge?: string | null;
  materialsSum?: number | null;
  destroyGap?: number | null;
  onSelect: () => void;
}) {
  const planEv = total != null && Number.isFinite(total) ? total : 0;
  const mats = materialsSum != null && Number.isFinite(materialsSum) ? materialsSum : 0;
  const risk = destroyGap != null && Number.isFinite(destroyGap) ? destroyGap : 0;
  const matShare = planEv > 0 ? mats / planEv : 0;
  const riskShare = planEv > 0 ? risk / planEv : 0;
  const riskDominates = riskShare >= 0.5;
  const attemptsLabel =
    attempts == null || !Number.isFinite(attempts) ? "—" : attempts.toFixed(attempts >= 10 ? 1 : 2);

  return (
    <Paper
      component="button"
      type="button"
      onClick={onSelect}
      variant="outlined"
      sx={{
        flex: "1 1 280px",
        minWidth: 0,
        px: 1.5,
        py: 1.1,
        textAlign: "left",
        cursor: "pointer",
        borderColor: selected ? "primary.main" : "divider",
        borderWidth: selected ? 2 : 1,
        bgcolor: selected ? "action.selected" : "background.paper",
        font: "inherit",
        color: "inherit",
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: "100%", minWidth: 0 }}>
        <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ flexWrap: "wrap", gap: 0.5 }}
          >
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {title}
            </Typography>
            {badge ? (
              <Chip
                size="small"
                label={badge}
                color={selected ? "primary" : "default"}
                variant={selected ? "filled" : "outlined"}
                sx={{ height: 20, fontSize: "0.65rem", maxWidth: "100%" }}
              />
            ) : null}
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {subtitle}
          </Typography>
          {planEv > 0 && (mats > 0 || risk > 0) ? (
            <Box sx={{ mt: 0.65, maxWidth: 220 }}>
              <Box
                sx={{
                  display: "flex",
                  height: 4,
                  borderRadius: 1,
                  overflow: "hidden",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                }}
              >
                {matShare > 0 ? (
                  <Box sx={{ width: `${matShare * 100}%`, bgcolor: "primary.main" }} />
                ) : null}
                {riskShare > 0 ? (
                  <Box sx={{ width: `${riskShare * 100}%`, bgcolor: "warning.main" }} />
                ) : null}
              </Box>
              <Typography
                variant="caption"
                color={riskDominates ? "warning.main" : "text.secondary"}
                sx={{
                  mt: 0.25,
                  display: "block",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: "0.65rem",
                  lineHeight: 1.2,
                }}
                noWrap
              >
                {riskDominates
                  ? `${Math.round(riskShare * 100)}% risk · ${formatGold(risk)}`
                  : `${Math.round(matShare * 100)}% mats · ${formatGold(mats)}`}
              </Typography>
            </Box>
          ) : null}
        </Box>

        <Box sx={{ flex: "0 0 auto", textAlign: "right" }}>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}
          >
            {total == null ? "—" : formatGold(total)}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums", display: "block", whiteSpace: "nowrap" }}
          >
            {attemptsLabel} tries · {oneshotPct == null ? "—" : `${oneshotPct.toFixed(1)}%`}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function stackBitsFor(s: PlanSummaryStep): string[] {
  const bits: string[] = [];
  if (s.priming || s.primstacks) {
    const prim = s.priming || s.primstacks;
    bits.push(s.primingStatClicks ? `prim ${prim} (${s.primingStatClicks}×dex)` : `prim ${prim}`);
  }
  if (s.statScrollGrace) bits.push(`stat ${s.statScrollGrace}`);
  if (s.failstack) bits.push(`fail ${s.failstack}`);
  if (s.primestack) bits.push(`prime ${s.primestack}`);
  return bits;
}

export function pathStepKey(s: PlanSummaryStep): string {
  if (s.kind === "acquire") return `acquire-${s.fromLevel}-${s.scrollKey}`;
  if (s.kind === "shiny") return `shiny-${s.toLevel}-${s.offeringKey ?? ""}`;
  return `${s.fromLevel}-${s.toLevel}`;
}

function stepRangeLabel(s: PlanSummaryStep): string {
  if (s.kind === "acquire") return `Acquire +${s.fromLevel}`;
  if (s.kind === "shiny") return "Shiny";
  return `+${s.fromLevel}→+${s.toLevel}`;
}

function isRecipeStep(s: PlanSummaryStep): boolean {
  return s.kind !== "acquire" && s.kind !== "shiny";
}

/** Plain-text recipe for clipboard (Discord / notes). */
export function formatRecipeClipboard(
  steps: PlanSummaryStep[],
  opts: { itemName: string; rangeLabel: string; strategyLabel: string; planEv: number },
): string {
  const lines = [`${opts.itemName} · ${opts.rangeLabel} · ${opts.strategyLabel}`];
  for (const s of steps) {
    const bits = stackBitsFor(s);
    const mats =
      s.kind === "acquire"
        ? s.scrollKey || "base"
        : s.kind === "shiny"
        ? s.offeringKey ?? "polish"
        : [s.scrollKey, s.offeringKey].filter(Boolean).join(" + ");
    lines.push(
      `${stepRangeLabel(s)}: ${mats || "—"} · ${formatChancePct(s.chance)} · ${formatGold(
        s.stepSpend,
      )}${bits.length ? ` · ${bits.join(", ")}` : ""}`,
    );
  }
  lines.push(`Plan EV: ${formatGold(opts.planEv)}`);
  return lines.join("\n");
}

/** Per-step recipe editors (pastebin-style table / cards). */
export type StepRecipeEdit = {
  costModel: "cheapest" | "fewest";
  itemGradeAt: (level: number) => number;
  allowScroll4: boolean;
  offerings: OfferingChoice[];
  allowPrimlings: boolean;
  allowStatScrollGrace: boolean;
  overrides: Record<string, UpgradeStepOverride>;
  onPatch: (fromLevel: number, toLevel: number, patch: UpgradeStepOverride) => void;
  onReset: (fromLevel: number, toLevel: number) => void;
  onResetAll: () => void;
  /** Cycle Shiny polish material (nugget/ingot); updates chance + EV. */
  onCyclePolish?: () => void;
};

const UPGRADE_SCROLL_KEYS_SAFE = ["scroll0", "scroll1", "scroll2", "scroll3", "scroll4"];

/** Brief flash when plan EV moves after a toolkit / level change. */
export function EvDeltaBanner({ delta, visible }: { delta: number | null; visible: boolean }) {
  if (!visible || delta == null || !Number.isFinite(delta) || Math.abs(delta) < 1) return null;
  const cheaper = delta < 0;
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        alignSelf: "flex-start",
        px: 1.25,
        py: 0.5,
        borderRadius: 1,
        border: 1,
        borderColor: cheaper ? "success.main" : "warning.main",
        bgcolor: (theme) =>
          cheaper
            ? theme.palette.mode === "dark"
              ? "rgba(76, 175, 80, 0.12)"
              : "rgba(76, 175, 80, 0.1)"
            : theme.palette.mode === "dark"
            ? "rgba(255, 167, 38, 0.12)"
            : "rgba(255, 167, 38, 0.1)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Typography
        variant="body2"
        fontWeight={600}
        color={cheaper ? "success.main" : "warning.main"}
      >
        {cheaper ? "−" : "+"}
        {formatGold(Math.abs(delta))} EV
      </Typography>
    </Box>
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
                to={`/items/${encodeURIComponent(itemKey)}`}
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
  primlings,
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
  primlings: boolean;
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
      | "primlings"
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
      | "primlings"
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
      key: "primlings",
      label: "Prim stacks",
      on: primlings,
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

export function materialsTotals(materials: MaterialLine[], planEv: number) {
  let materialsSum = 0;
  for (const m of materials) {
    if (Number.isFinite(m.total)) materialsSum += m.total;
  }
  const destroyGap = Number.isFinite(planEv) && planEv > materialsSum ? planEv - materialsSum : 0;
  return { materialsSum, destroyGap };
}

function buyQty(expected: number): number {
  if (!Number.isFinite(expected) || expected <= 0) return 0;
  return Math.max(1, Math.ceil(expected));
}

function formatMaterialsClipboard(
  ranked: MaterialLine[],
  materialLabel: (key: string) => string,
  materialsSum: number,
  destroyGap: number,
  planEv: number,
): string {
  const lines: string[] = ["Shopping list (ceil of expected):"];
  for (const m of ranked) {
    if (m.itemKey === "_stacks") {
      lines.push(`${materialLabel(m.itemKey)}: ${formatGold(m.total)}`);
    } else {
      lines.push(
        `${materialLabel(m.itemKey)} × ${buyQty(m.expectedQty)} (expect ${m.expectedQty.toFixed(
          2,
        )}) = ${formatGold(m.total)}`,
      );
    }
  }
  lines.push(`Materials subtotal (EV): ${formatGold(materialsSum)}`);
  if (destroyGap > 0) lines.push(`Destroy / base risk: ${formatGold(destroyGap)}`);
  lines.push(`Plan EV: ${formatGold(planEv)}`);
  return lines.join("\n");
}

function formatTinyExpect(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 0.01) return n.toFixed(3).replace(/\.?0+$/, "");
  if (n >= 0.0001) return n.toFixed(5).replace(/\.?0+$/, "");
  return n.toExponential(2);
}

function SideEffectChip({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const chip = (
    <Chip
      size="small"
      variant="outlined"
      label={
        <Box component="span" sx={{ display: "inline-flex", gap: 0.75, alignItems: "baseline" }}>
          <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
            {label}
          </Box>
          <Box component="span" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {value}
          </Box>
        </Box>
      }
      sx={{ height: 28, "& .MuiChip-label": { px: 1 } }}
    />
  );
  return hint ? <Tooltip title={hint}>{chip}</Tooltip> : chip;
}

/** Expected Lucky / Greed / Shiny / Dark Tri-Stone / booster extras for the plan. */
export function SideEffectsPanel({
  summary,
  mode,
  luckySlot,
}: {
  summary: SideEffectSummary;
  mode: Exclude<CalcMode, "greed">;
  luckySlot: boolean;
}) {
  const eligibleSteps = summary.steps.filter(
    (s) => s.eligibleLucky || s.eligibleGreed || s.expectedBoosterExtras > 0,
  );
  const chips: { label: string; value: string; hint?: string }[] = [
    { label: "Lucky", value: formatTinyExpect(summary.expectedLucky) },
  ];
  if (mode === "upgrade") {
    chips.push({ label: "Greed", value: formatTinyExpect(summary.expectedGreed) });
    chips.push({
      label: "Bonus grace",
      value: formatTinyExpect(summary.expectedBonusGrace),
      hint: "2.5% per upgrade click",
    });
  }
  if (summary.darkTristone) {
    chips.push({
      label: "Dark Tri-Stone",
      value: formatTinyExpect(summary.darkTristone.expected),
      hint: `${(summary.darkTristone.chance * 100).toFixed(1)}% on +0→+1 compound success`,
    });
  }
  if (summary.isBooster) {
    chips.push({
      label: "Booster extras",
      value: formatTinyExpect(summary.expectedBoosterExtras),
      hint: "Cascading 12%/6%/… extra levels with an offering (~100% compound success)",
    });
  }

  const tipParts = [
    "Outside plan EV — enable Polish Shiny to polish the +0 copy before upgrading",
    luckySlot ? "Lucky Slot remaps rolls — edge odds approximate" : null,
    !summary.anyEligible && mode === "upgrade" ? "Lucky/Greed need High grade+" : null,
    summary.inactiveTitles.length
      ? `${summary.inactiveTitles.map((t) => t.label).join("/")} inactive on live`
      : null,
  ].filter(Boolean);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1 }}
      >
        <Typography variant="subtitle2">Side effects</Typography>
        <Tooltip title={tipParts.join(" · ")}>
          <Typography variant="caption" color="text.secondary" sx={{ cursor: "help" }}>
            not in EV
          </Typography>
        </Tooltip>
      </Stack>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 0.5 }}>
        {chips.map((c) => (
          <SideEffectChip key={c.label} label={c.label} value={c.value} hint={c.hint} />
        ))}
      </Box>

      {eligibleSteps.length > 0 ? (
        <Accordion
          disableGutters
          elevation={0}
          sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 32 }}>
            <Typography variant="caption" color="text.secondary">
              Per-step odds ({eligibleSteps.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ py: 0.5 }}>Step</TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      Lucky
                    </TableCell>
                    {mode === "upgrade" ? (
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        Greed
                      </TableCell>
                    ) : null}
                    {summary.isBooster ? (
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        Extras
                      </TableCell>
                    ) : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eligibleSteps.map((s) => (
                    <TableRow key={`${s.fromLevel}-${s.toLevel}`}>
                      <TableCell sx={{ py: 0.5 }}>
                        +{s.fromLevel}→+{s.toLevel}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontVariantNumeric: "tabular-nums" }}>
                        {s.eligibleLucky ? formatTinyExpect(s.expectedLucky) : "—"}
                      </TableCell>
                      {mode === "upgrade" ? (
                        <TableCell
                          align="right"
                          sx={{ py: 0.5, fontVariantNumeric: "tabular-nums" }}
                        >
                          {s.eligibleGreed ? formatTinyExpect(s.expectedGreed) : "—"}
                        </TableCell>
                      ) : null}
                      {summary.isBooster ? (
                        <TableCell
                          align="right"
                          sx={{ py: 0.5, fontVariantNumeric: "tabular-nums" }}
                        >
                          {formatTinyExpect(s.expectedBoosterExtras)}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ) : null}
    </Paper>
  );
}

export function MaterialsPanel({
  materials,
  materialLabel,
  planEv,
}: {
  materials: MaterialLine[];
  materialLabel: (key: string) => string;
  planEv: number;
}) {
  const [copied, setCopied] = useState(false);
  const ranked = [...materials].sort((a, b) => {
    const at = Number.isFinite(a.total) ? a.total : 0;
    const bt = Number.isFinite(b.total) ? b.total : 0;
    return bt - at;
  });
  const maxTotal = Math.max(0, ...ranked.map((m) => (Number.isFinite(m.total) ? m.total : 0)));
  const { materialsSum, destroyGap } = materialsTotals(materials, planEv);
  const riskPct = planEv > 0 && destroyGap > 0 ? Math.round((destroyGap / planEv) * 100) : null;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2">Shopping list</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Buy = ceil(expected) · gold is EV spend
          </Typography>
        </Box>
        <Button
          size="small"
          variant="text"
          startIcon={<ContentCopyIcon fontSize="small" />}
          disabled={!ranked.length}
          sx={{ flexShrink: 0 }}
          onClick={() => {
            const text = formatMaterialsClipboard(
              ranked,
              materialLabel,
              materialsSum,
              destroyGap,
              planEv,
            );
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </Stack>

      <Stack spacing={0.75}>
        {ranked.map((m) => {
          const share = maxTotal > 0 && Number.isFinite(m.total) ? m.total / maxTotal : 0;
          const ofMats =
            materialsSum > 0 && Number.isFinite(m.total)
              ? Math.round((m.total / materialsSum) * 100)
              : null;
          const isStacks = m.itemKey === "_stacks";
          const buy = isStacks ? null : buyQty(m.expectedQty);
          const secondary = isStacks
            ? ofMats != null
              ? `${ofMats}%`
              : null
            : `~${m.expectedQty.toFixed(1)}${ofMats != null ? ` · ${ofMats}%` : ""}`;
          return (
            <Stack
              key={m.itemKey}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ minWidth: 0 }}
            >
              <MatIcon itemKey={m.itemKey} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  spacing={1}
                  alignItems="baseline"
                >
                  <Typography variant="body2" noWrap>
                    {isStacks ? materialLabel(m.itemKey) : `${materialLabel(m.itemKey)} × ${buy}`}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                  >
                    {formatGold(m.total)}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CostShareBar share={share} />
                  </Box>
                  {secondary ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
                    >
                      {secondary}
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
            </Stack>
          );
        })}
      </Stack>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
          mt: 1.25,
          pt: 1,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Materials{" "}
          <Box
            component="span"
            sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}
          >
            {formatGold(materialsSum)}
          </Box>
          {destroyGap > 0 ? (
            <>
              {" · "}
              <Box component="span" sx={{ color: "warning.main" }}>
                risk{" "}
                <Box component="span" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatGold(destroyGap)}
                </Box>
                {riskPct != null ? ` (${riskPct}%)` : ""}
              </Box>
            </>
          ) : null}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          plan {formatGold(planEv)}
        </Typography>
      </Box>
    </Paper>
  );
}

function cycleScrollGrade(step: PlanSummaryStep, edit: StepRecipeEdit): void {
  if (step.kind === "shiny" || step.kind === "acquire") return;
  const itemGrade = edit.itemGradeAt(step.fromLevel);
  const grades = allowedUpgradeScrollGrades(itemGrade, edit.costModel, edit.allowScroll4);
  if (!grades.length) return;
  const cur = UPGRADE_SCROLL_KEYS_SAFE.indexOf(step.scrollKey);
  const idx = grades.indexOf(cur >= 0 ? cur : itemGrade);
  const next = grades[(idx + 1) % grades.length] ?? grades[0];
  edit.onPatch(step.fromLevel, step.toLevel, { scrollGrade: next });
}

function cycleOffering(step: PlanSummaryStep, edit: StepRecipeEdit): void {
  if (step.kind === "shiny" || step.kind === "acquire") return;
  const list = edit.offerings;
  if (!list.length) return;
  const cur = offeringGradeFromKey(step.offeringKey);
  const idx = list.findIndex((o) => o === cur);
  const next = list[(idx + 1) % list.length] ?? null;
  edit.onPatch(step.fromLevel, step.toLevel, { offering: next });
}

function ClickableMat({
  itemKey,
  title,
  onCycle,
  editable,
}: {
  itemKey: string | null;
  title: string;
  onCycle?: () => void;
  editable?: boolean;
}) {
  const tip = editable ? `${title || "None"} — click to cycle` : title || "None";
  const inner = (
    <Box
      component={editable && onCycle ? "button" : "span"}
      type={editable && onCycle ? "button" : undefined}
      onClick={editable ? onCycle : undefined}
      aria-label={tip}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        p: 0.25,
        m: 0,
        border: editable ? 1 : 0,
        borderColor: "divider",
        borderRadius: 0.75,
        bgcolor: "transparent",
        cursor: editable ? "pointer" : "default",
        font: "inherit",
        color: "inherit",
        lineHeight: 0,
        "&:hover": editable ? { borderColor: "primary.main", bgcolor: "action.hover" } : undefined,
      }}
    >
      <MatSlot itemKey={itemKey} size={ICON} />
    </Box>
  );
  return <Tooltip title={tip}>{inner}</Tooltip>;
}

function TinyNum({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={0} sx={{ justifyContent: "center" }}>
      <IconButton
        size="small"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        sx={{ p: 0.25 }}
      >
        <RemoveIcon sx={{ fontSize: 14 }} />
      </IconButton>
      <Typography
        variant="body2"
        sx={{
          minWidth: 22,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
        }}
      >
        {value}
      </Typography>
      <IconButton
        size="small"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        sx={{ p: 0.25 }}
      >
        <AddIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Stack>
  );
}

function formatChancePlain(chance: number | undefined): string {
  if (chance == null || !Number.isFinite(chance)) return "—";
  const pct = chance * 100;
  if (pct >= 99.95) return "100%";
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(3)}%`;
}

/** Expected base copies (Acquire) or polish campaigns × tries. */
function formatExpectedCopies(n: number | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/** Card list for narrow viewports; keeps scroll/offering icons readable. */
export function StepPlanCards({
  steps,
  stepEdit,
}: {
  steps: PlanSummaryStep[];
  stepEdit?: StepRecipeEdit | null;
}) {
  const G = useContext(GDataContext);
  const maxStepSpend = Math.max(
    0,
    ...steps.map((s) => (Number.isFinite(s.stepSpend) ? s.stepSpend : 0)),
  );
  const editable = Boolean(stepEdit);

  return (
    <Stack spacing={1} sx={{ display: { xs: "flex", md: "none" } }}>
      {steps.map((s) => {
        const share =
          maxStepSpend > 0 && Number.isFinite(s.stepSpend) ? s.stepSpend / maxStepSpend : 0;
        const heavy = share >= 0.85 && steps.length > 1;
        const overridden = Boolean(
          stepEdit?.overrides[upgradeStepOverrideKey(s.fromLevel, s.toLevel)],
        );
        return (
          <Paper
            key={pathStepKey(s)}
            variant="outlined"
            sx={{
              p: 1.5,
              outline: overridden ? "1px dashed" : undefined,
              outlineColor: overridden ? "secondary.main" : undefined,
              bgcolor: heavy
                ? (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 167, 38, 0.08)"
                      : "rgba(255, 167, 38, 0.1)"
                : undefined,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography fontWeight={600}>{stepRangeLabel(s)}</Typography>
              <Typography fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
                {formatGold(s.stepSpend)}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 1, flexWrap: "wrap" }}
            >
              <Typography variant="caption" color="text.secondary">
                {s.kind === "acquire" ? (
                  `Expected bases · ${formatExpectedCopies(s.attempts)}×`
                ) : (
                  <>
                    {formatChancePlain(s.baseChance)} / {formatChancePlain(s.chanceCap)} /{" "}
                    <Box component="span" sx={{ color: chanceTone(s.chance), fontWeight: 700 }}>
                      {formatChancePct(s.chance)}
                    </Box>
                  </>
                )}
              </Typography>
              {s.kind === "acquire" ? (
                <MatSlot itemKey={s.scrollKey} />
              ) : s.kind !== "shiny" ? (
                <ClickableMat
                  itemKey={s.scrollKey}
                  title={G?.items?.[s.scrollKey as ItemKey]?.name ?? s.scrollKey}
                  editable={editable}
                  onCycle={stepEdit ? () => cycleScrollGrade(s, stepEdit) : undefined}
                />
              ) : null}
              {s.kind === "acquire" ? null : (
                <ClickableMat
                  itemKey={s.offeringKey}
                  title={
                    s.kind === "shiny"
                      ? `${
                          G?.items?.[s.offeringKey as ItemKey]?.name ?? s.offeringKey ?? "polish"
                        } · fail keeps item`
                      : G?.items?.[s.offeringKey as ItemKey]?.name ?? "No offering"
                  }
                  editable={
                    editable &&
                    (isRecipeStep(s) || (s.kind === "shiny" && Boolean(stepEdit?.onCyclePolish)))
                  }
                  onCycle={
                    s.kind === "shiny"
                      ? stepEdit?.onCyclePolish
                      : stepEdit
                      ? () => cycleOffering(s, stepEdit)
                      : undefined
                  }
                />
              )}
              <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                {s.kind === "acquire"
                  ? `${formatExpectedCopies(s.attempts)} expected`
                  : s.kind === "shiny"
                  ? `${formatChancePct(s.chance)} · ${formatExpectedCopies(s.attempts)} tries`
                  : `${formatAttempts(s.chance)} tries`}
              </Typography>
            </Stack>
            {stepEdit && isRecipeStep(s) ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1, gap: 1 }}>
                {stepEdit.allowPrimlings ? (
                  <TinyNum
                    label="Primling"
                    value={s.primstacks}
                    min={0}
                    max={26}
                    onChange={(primstacks) =>
                      stepEdit.onPatch(s.fromLevel, s.toLevel, { primstacks })
                    }
                  />
                ) : null}
                {stepEdit.costModel === "cheapest" ? (
                  <>
                    <TinyNum
                      label="Failstack"
                      value={s.failstack}
                      min={0}
                      max={18}
                      onChange={(failstack) =>
                        stepEdit.onPatch(s.fromLevel, s.toLevel, { failstack })
                      }
                    />
                    <TinyNum
                      label="Primestack"
                      value={s.primestack}
                      min={0}
                      max={30}
                      onChange={(primestack) =>
                        stepEdit.onPatch(s.fromLevel, s.toLevel, { primestack })
                      }
                    />
                  </>
                ) : null}
                {overridden ? (
                  <Button size="small" onClick={() => stepEdit.onReset(s.fromLevel, s.toLevel)}>
                    Reset
                  </Button>
                ) : null}
              </Stack>
            ) : null}
            <CostShareBar share={share} color={heavy ? "warning.main" : "primary.main"} />
          </Paper>
        );
      })}
    </Stack>
  );
}

/** Pastebin-style step table — primary editable surface for upgrade plans. */
export function StepPlanTable({
  steps,
  stepEdit,
  recipeClipboard,
}: {
  steps: PlanSummaryStep[];
  stepEdit?: StepRecipeEdit | null;
  recipeClipboard?: string | null;
}) {
  const G = useContext(GDataContext);
  const [copied, setCopied] = useState(false);
  const planEv =
    steps.length && Number.isFinite(steps[steps.length - 1].runningTotal)
      ? steps[steps.length - 1].runningTotal
      : 0;
  const editable = Boolean(stepEdit);
  const showPrim = editable
    ? Boolean(stepEdit?.allowPrimlings)
    : steps.some((s) => s.priming || s.primstacks);
  const showStatScroll = editable
    ? Boolean(stepEdit?.allowStatScrollGrace)
    : steps.some((s) => s.statScrollGrace);
  const showFail = editable ? stepEdit?.costModel === "cheapest" : steps.some((s) => s.failstack);
  const showPrimeStk = editable
    ? stepEdit?.costModel === "cheapest"
    : steps.some((s) => s.primestack);
  const hasOverrides = Boolean(stepEdit && Object.keys(stepEdit.overrides).length);

  const headSx = {
    fontWeight: 700,
    fontSize: "0.7rem",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "text.secondary",
    whiteSpace: "nowrap",
    py: 1.25,
    px: 1,
  } as const;
  const cellSx = {
    py: 1,
    px: 1,
    verticalAlign: "middle",
    fontSize: "0.875rem",
  } as const;
  const numSx = { ...cellSx, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

  const body = (
    <>
      {!editable ? <StepPlanCards steps={steps} stepEdit={stepEdit} /> : null}

      <TableContainer
        sx={{
          overflowX: "auto",
          display: editable ? "block" : { xs: "none", md: "block" },
        }}
      >
        <Table size="small" sx={{ minWidth: editable ? 960 : 640 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>Step</TableCell>
              <TableCell sx={headSx} align="right">
                <Tooltip title="Raw table chance for this level (no scroll/offering/grace)">
                  <span>Base</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headSx} align="right">
                <Tooltip title="Soft ceiling for this scroll/offering combo (high scroll/offering raises it)">
                  <span>Cap</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headSx} align="right">
                <Tooltip title="Success chance for this step’s recipe — attempts ≈ 1 / chance">
                  <span>Chance</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headSx} align="center">
                <ColumnHead
                  label="Scroll"
                  icons={["scroll2"]}
                  tip="Upgrade scroll (click cell to cycle)"
                />
              </TableCell>
              <TableCell sx={headSx} align="center">
                <ColumnHead
                  label="Offering"
                  icons={["offeringp"]}
                  tip="Offering / none (click cell to cycle)"
                />
              </TableCell>
              {showPrim ? (
                <TableCell sx={headSx} align="center">
                  <ColumnHead
                    label="Grace stacks"
                    icons={["offeringp"]}
                    tip="Primling priming count (+0.5 grace each)"
                  />
                </TableCell>
              ) : null}
              {showStatScroll ? (
                <TableCell sx={headSx} align="center">
                  <ColumnHead
                    label="Stat"
                    icons={["strscroll"]}
                    tip="Property scroll + offering (+1 grace each)"
                  />
                </TableCell>
              ) : null}
              {showFail ? (
                <TableCell sx={headSx} align="center">
                  <ColumnHead
                    label="Fail"
                    icons={["helmet"]}
                    tip="Failstack (helmet-proxy ugrace farm)"
                  />
                </TableCell>
              ) : null}
              {showPrimeStk ? (
                <TableCell sx={headSx} align="center">
                  <ColumnHead
                    label="Primstacks"
                    icons={["helmet", "offeringp"]}
                    tip="Primestack (helmet-proxy ograce farm)"
                  />
                </TableCell>
              ) : null}
              <TableCell sx={headSx} align="right">
                Attempts
              </TableCell>
              <TableCell sx={headSx} align="right">
                <Tooltip title="Step EV and share of plan total">
                  <span>Step spend</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headSx} align="right">
                Running total
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {steps.map((s) => {
              const share = planEv > 0 && Number.isFinite(s.stepSpend) ? s.stepSpend / planEv : 0;
              const heavy = share >= 0.25 && steps.length > 1;
              const overridden = Boolean(
                stepEdit?.overrides[upgradeStepOverrideKey(s.fromLevel, s.toLevel)],
              );
              const scrollName = s.scrollKey
                ? G?.items?.[s.scrollKey as ItemKey]?.name ?? s.scrollKey
                : null;
              const offeringName = s.offeringKey
                ? G?.items?.[s.offeringKey as ItemKey]?.name ?? s.offeringKey
                : null;
              return (
                <TableRow
                  key={pathStepKey(s)}
                  sx={{
                    bgcolor: heavy
                      ? (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255, 167, 38, 0.08)"
                            : "rgba(255, 167, 38, 0.1)"
                      : undefined,
                    outline: overridden ? "1px dashed" : undefined,
                    outlineColor: overridden ? "secondary.main" : undefined,
                    outlineOffset: overridden ? -1 : undefined,
                  }}
                >
                  <TableCell sx={{ ...cellSx, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {stepRangeLabel(s)}
                    {overridden && stepEdit ? (
                      <Button
                        size="small"
                        onClick={() => stepEdit.onReset(s.fromLevel, s.toLevel)}
                        sx={{ ml: 0.5, minWidth: 0, px: 0.5, fontSize: 10 }}
                      >
                        reset
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell sx={numSx} align="right">
                    {s.kind === "acquire" ? "—" : formatChancePlain(s.baseChance)}
                  </TableCell>
                  <TableCell sx={numSx} align="right">
                    {s.kind === "acquire" ? "—" : formatChancePlain(s.chanceCap)}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...numSx,
                      color: s.kind === "acquire" ? "text.secondary" : chanceTone(s.chance),
                      fontWeight: 700,
                    }}
                    align="right"
                  >
                    {s.kind === "acquire" ? "—" : formatChancePct(s.chance)}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, textAlign: "center" }}>
                    {s.kind === "shiny" ? (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    ) : s.kind === "acquire" ? (
                      <MatSlot itemKey={s.scrollKey} />
                    ) : (
                      <ClickableMat
                        itemKey={s.scrollKey}
                        title={scrollName ?? ""}
                        editable={editable}
                        onCycle={stepEdit ? () => cycleScrollGrade(s, stepEdit) : undefined}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, textAlign: "center" }}>
                    {s.kind === "acquire" ? (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    ) : (
                      <ClickableMat
                        itemKey={s.offeringKey}
                        title={
                          s.kind === "shiny"
                            ? `${offeringName ?? "polish"} · fail keeps item`
                            : offeringName ?? "No offering"
                        }
                        editable={
                          editable &&
                          (isRecipeStep(s) ||
                            (s.kind === "shiny" && Boolean(stepEdit?.onCyclePolish)))
                        }
                        onCycle={
                          s.kind === "shiny"
                            ? stepEdit?.onCyclePolish
                            : stepEdit
                            ? () => cycleOffering(s, stepEdit)
                            : undefined
                        }
                      />
                    )}
                  </TableCell>
                  {showPrim ? (
                    <TableCell sx={numSx} align="center">
                      {editable && stepEdit && isRecipeStep(s) ? (
                        <TinyNum
                          label="Primling"
                          value={s.primstacks}
                          min={0}
                          max={26}
                          onChange={(primstacks) =>
                            stepEdit.onPatch(s.fromLevel, s.toLevel, { primstacks })
                          }
                        />
                      ) : (
                        stackCell(s.priming || s.primstacks)
                      )}
                    </TableCell>
                  ) : null}
                  {showStatScroll ? (
                    <TableCell sx={numSx} align="center">
                      {editable && stepEdit && isRecipeStep(s) ? (
                        <TinyNum
                          label="Stat grace"
                          value={s.statScrollGrace}
                          min={0}
                          max={13}
                          onChange={(statScrollGrace) =>
                            stepEdit.onPatch(s.fromLevel, s.toLevel, { statScrollGrace })
                          }
                        />
                      ) : (
                        stackCell(s.statScrollGrace)
                      )}
                    </TableCell>
                  ) : null}
                  {showFail ? (
                    <TableCell sx={numSx} align="center">
                      {editable && stepEdit && isRecipeStep(s) ? (
                        <TinyNum
                          label="Failstack"
                          value={s.failstack}
                          min={0}
                          max={18}
                          onChange={(failstack) =>
                            stepEdit.onPatch(s.fromLevel, s.toLevel, { failstack })
                          }
                        />
                      ) : (
                        stackCell(s.failstack)
                      )}
                    </TableCell>
                  ) : null}
                  {showPrimeStk ? (
                    <TableCell sx={numSx} align="center">
                      {editable && stepEdit && isRecipeStep(s) ? (
                        <TinyNum
                          label="Primestack"
                          value={s.primestack}
                          min={0}
                          max={30}
                          onChange={(primestack) =>
                            stepEdit.onPatch(s.fromLevel, s.toLevel, { primestack })
                          }
                        />
                      ) : (
                        stackCell(s.primestack)
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell sx={numSx} align="right">
                    {s.kind === "acquire" || s.kind === "shiny"
                      ? formatExpectedCopies(s.attempts)
                      : formatAttempts(s.chance)}
                  </TableCell>
                  <TableCell sx={{ ...numSx, minWidth: 96 }} align="right">
                    <Stack spacing={0.4} alignItems="flex-end" sx={{ minWidth: 88 }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {formatGold(s.stepSpend)}
                      </Box>
                      {share > 0.001 ? (
                        <>
                          <CostShareBar
                            share={Math.min(1, share)}
                            color={heavy ? "warning.main" : "primary.main"}
                            height={5}
                            minWidth={72}
                          />
                          <Typography
                            variant="caption"
                            color={heavy ? "warning.main" : "text.secondary"}
                            sx={{
                              fontVariantNumeric: "tabular-nums",
                              lineHeight: 1,
                              fontSize: "0.65rem",
                            }}
                          >
                            {(share * 100).toFixed(share >= 0.1 ? 0 : 1)}%
                          </Typography>
                        </>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell sx={numSx} align="right">
                    {formatGold(s.runningTotal)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );

  if (editable) {
    return (
      <Paper id="upgrade-step-table" variant="outlined" sx={{ p: 1.5, scrollMarginTop: 16 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.25 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2">Plan steps</Typography>
            <Typography variant="caption" color="text.secondary">
              Click scroll/offering/polish icons to cycle · adjust stacks inline · EV updates live
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
            {recipeClipboard ? (
              <Button
                size="small"
                variant="text"
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={() => {
                  navigator.clipboard.writeText(recipeClipboard).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? "Copied" : "Copy recipe"}
              </Button>
            ) : null}
            {hasOverrides && stepEdit ? (
              <Button size="small" variant="text" onClick={() => stepEdit.onResetAll()}>
                Reset edits
              </Button>
            ) : null}
          </Stack>
        </Stack>
        {body}
      </Paper>
    );
  }

  return (
    <Accordion
      disableGutters
      elevation={0}
      defaultExpanded={showPrim || showStatScroll || showFail || showPrimeStk}
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        "&:before": { display: "none" },
        "&.Mui-expanded": { margin: 0 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ px: 2, minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}
      >
        <Box>
          <Typography variant="subtitle1">Step details</Typography>
          <Typography variant="caption" color="text.secondary">
            Full table with attempts, running totals
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>{body}</AccordionDetails>
    </Accordion>
  );
}
