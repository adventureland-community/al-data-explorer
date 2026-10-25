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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
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
import { offeringGradeFromKey, scrollKeyForUpgrade } from "../gameData/upgradePrices";
import { SideEffectSummary } from "../gameData/upgradeSideEffects";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { CalcMode, CalcStrategy } from "./useUpgradeCalcParams";

const ICON = 28;

function chanceTone(chance: number): "success.main" | "warning.main" | "error.main" {
  const pct = chance * 100;
  if (pct >= 70) return "success.main";
  if (pct >= 35) return "warning.main";
  return "error.main";
}

function ChanceBar({ chance }: { chance: number }) {
  const pct = Math.max(0, Math.min(100, chance * 100));
  return (
    <Box sx={{ minWidth: 72 }}>
      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {formatChancePct(chance)}
      </Typography>
      <Box
        sx={{
          mt: 0.35,
          height: 5,
          borderRadius: 0.5,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: chanceTone(chance) }} />
      </Box>
    </Box>
  );
}

function CostShareBar({ share, color = "primary.main" }: { share: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(share * 100)));
  return (
    <Box
      sx={{
        height: 8,
        minWidth: 64,
        borderRadius: 1,
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
      title={`${pct}%`}
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

function scrollOrOfferingCell(key: string | null) {
  if (!key) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  return <ItemInstance itemInfo={{ name: key as ItemKey }} size={24} tooltip />;
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

  return (
    <Paper
      component="button"
      type="button"
      onClick={onSelect}
      variant="outlined"
      sx={{
        flex: 1,
        p: 2,
        textAlign: "left",
        cursor: "pointer",
        borderColor: selected ? "primary.main" : "divider",
        borderWidth: selected ? 2 : 1,
        bgcolor: selected ? "action.selected" : "background.paper",
        font: "inherit",
        color: "inherit",
        display: "block",
        width: "100%",
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      <Typography variant="subtitle1" fontWeight={600}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: badge ? 0.5 : 1.25 }}>
        {subtitle}
      </Typography>
      {badge ? (
        <Chip
          size="small"
          label={badge}
          color={selected ? "primary" : "default"}
          variant={selected ? "filled" : "outlined"}
          sx={{ height: 22, fontSize: "0.7rem", mb: 1.25, maxWidth: "100%" }}
        />
      ) : null}
      <Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums", mb: 1 }}>
        {total == null ? "—" : formatGold(total)}
      </Typography>
      {planEv > 0 && (mats > 0 || risk > 0) ? (
        <Box sx={{ mb: 1.25 }}>
          <Box
            sx={{
              display: "flex",
              height: 6,
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
            sx={{ mt: 0.5, display: "block", fontVariantNumeric: "tabular-nums" }}
          >
            {riskDominates
              ? `${Math.round(riskShare * 100)}% destroy / base risk (${formatGold(risk)})`
              : `${Math.round(matShare * 100)}% materials (${formatGold(mats)})`}
          </Typography>
        </Box>
      ) : null}
      <Stack direction="row" spacing={2.5}>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Exp. attempts
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
            {attempts == null || !Number.isFinite(attempts)
              ? "—"
              : attempts.toFixed(attempts >= 10 ? 1 : 2)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            One-shot
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
            {oneshotPct == null ? "—" : `${oneshotPct.toFixed(2)}%`}
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
  if (s.kind === "shiny") return `shiny-${s.toLevel}-${s.offeringKey ?? ""}`;
  return `${s.fromLevel}-${s.toLevel}`;
}

function stepRangeLabel(s: PlanSummaryStep): string {
  if (s.kind === "shiny") return "Shiny";
  return `+${s.fromLevel}→+${s.toLevel}`;
}

function materialName(
  items: Record<string, { name?: string } | undefined> | undefined,
  key: string | null,
) {
  if (!key) return null;
  return items?.[key]?.name ?? key;
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
      s.kind === "shiny"
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

export type PathLadderStepEdit = {
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
};

const UPGRADE_SCROLL_KEYS_SAFE = ["scroll0", "scroll1", "scroll2", "scroll3", "scroll4"];

function CompactStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 64 }}>
        {label}
      </Typography>
      <IconButton
        size="small"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography
        variant="body2"
        fontWeight={600}
        sx={{ minWidth: 28, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Typography>
      <IconButton
        size="small"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

function StepRecipeEditor({
  step,
  edit,
  overridden,
}: {
  step: PlanSummaryStep;
  edit: PathLadderStepEdit;
  overridden: boolean;
}) {
  const itemGrade = edit.itemGradeAt(step.fromLevel);
  const scrollGrades = allowedUpgradeScrollGrades(itemGrade, edit.costModel, edit.allowScroll4);
  const currentScroll =
    UPGRADE_SCROLL_KEYS_SAFE.indexOf(step.scrollKey) >= 0
      ? UPGRADE_SCROLL_KEYS_SAFE.indexOf(step.scrollKey)
      : itemGrade;
  const currentOffering = offeringGradeFromKey(step.offeringKey);

  return (
    <Stack spacing={1.25} sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="caption" color="text.secondary">
          Edit this step — later steps recompute from grace / destroy EV
        </Typography>
        {overridden ? (
          <Button
            size="small"
            onClick={() => edit.onReset(step.fromLevel, step.toLevel)}
            sx={{ flexShrink: 0 }}
          >
            Reset step
          </Button>
        ) : null}
      </Stack>

      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          Scroll
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={currentScroll}
          onChange={(_, v: number | null) => {
            if (v == null) return;
            edit.onPatch(step.fromLevel, step.toLevel, { scrollGrade: v });
          }}
        >
          {scrollGrades.map((g) => (
            <ToggleButton key={g} value={g} sx={{ px: 1.25, fontSize: 12 }}>
              {scrollKeyForUpgrade(g)?.replace("scroll", "s") ?? `s${g}`}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          Offering
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={currentOffering == null ? "none" : String(currentOffering)}
          onChange={(_, v: string | null) => {
            if (v == null) return;
            const offering: OfferingChoice = v === "none" ? null : (Number(v) as 0 | 1 | 2);
            if (offering !== null && !edit.offerings.includes(offering)) return;
            edit.onPatch(step.fromLevel, step.toLevel, { offering });
          }}
        >
          {edit.offerings.map((o) => (
            <ToggleButton
              key={o == null ? "none" : String(o)}
              value={o == null ? "none" : String(o)}
              sx={{ px: 1, fontSize: 11 }}
            >
              {o == null ? "None" : o === 0 ? "Primling" : o === 1 ? "Primordial" : "Prim X"}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
        {edit.allowPrimlings ? (
          <CompactStepper
            label="Primling"
            value={step.primstacks}
            min={0}
            max={26}
            onChange={(primstacks) => edit.onPatch(step.fromLevel, step.toLevel, { primstacks })}
          />
        ) : null}
        {edit.allowStatScrollGrace ? (
          <CompactStepper
            label="Stat grace"
            value={step.statScrollGrace}
            min={0}
            max={13}
            onChange={(statScrollGrace) =>
              edit.onPatch(step.fromLevel, step.toLevel, { statScrollGrace })
            }
          />
        ) : null}
        {edit.costModel === "cheapest" ? (
          <>
            <CompactStepper
              label="Failstack"
              value={step.failstack}
              min={0}
              max={18}
              onChange={(failstack) => edit.onPatch(step.fromLevel, step.toLevel, { failstack })}
            />
            <CompactStepper
              label="Primestack"
              value={step.primestack}
              min={0}
              max={30}
              onChange={(primestack) => edit.onPatch(step.fromLevel, step.toLevel, { primestack })}
            />
          </>
        ) : null}
      </Stack>
    </Stack>
  );
}

/** Interactive recipe trail — click a step for scroll/stack detail. */
export function PathLadder({
  steps,
  focusStep,
  recipeClipboard,
  stepEdit,
}: {
  steps: PlanSummaryStep[];
  /** Bump `token` to select + scroll that step (bottleneck jump). */
  focusStep?: { key: string; token: number } | null;
  /** When set, shows Copy recipe using this text. */
  recipeClipboard?: string | null;
  /** Upgrade-mode per-step recipe editors (ignored for shiny/compound). */
  stepEdit?: PathLadderStepEdit | null;
}) {
  const G = useContext(GDataContext);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** Level structure only — recipe edits must not reset the selected step. */
  const structureSig = steps.map((s) => `${s.fromLevel}:${s.toLevel}:${s.kind ?? ""}`).join("|");

  useEffect(() => {
    if (!steps.length) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey((prev) => {
      if (prev && steps.some((s) => pathStepKey(s) === prev)) return prev;
      const maxSpend = Math.max(
        0,
        ...steps.map((s) => (Number.isFinite(s.stepSpend) ? s.stepSpend : 0)),
      );
      const bottleneck = steps.find(
        (s) => maxSpend > 0 && Number.isFinite(s.stepSpend) && s.stepSpend / maxSpend >= 0.85,
      );
      return pathStepKey(bottleneck ?? steps[steps.length - 1]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- structureSig captures level layout
  }, [structureSig]);

  useEffect(() => {
    if (!focusStep?.key || !focusStep.token) return;
    setSelectedKey(focusStep.key);
    const el = document.getElementById(`upgrade-step-${focusStep.key}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    // Intentionally ignore `steps` identity; token bumps are the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStep?.key, focusStep?.token]);

  if (!steps.length) return null;

  const maxSpend = Math.max(
    0,
    ...steps.map((s) => (Number.isFinite(s.stepSpend) ? s.stepSpend : 0)),
  );
  const planEv =
    steps.length && Number.isFinite(steps[steps.length - 1].runningTotal)
      ? steps[steps.length - 1].runningTotal
      : 0;
  const selected = steps.find((s) => pathStepKey(s) === selectedKey) ?? null;
  const scrollName = materialName(G?.items, selected?.scrollKey ?? null);
  const offeringName = materialName(G?.items, selected?.offeringKey ?? null);
  const selectedStacks = selected ? stackBitsFor(selected) : [];
  const selectedShare =
    selected && maxSpend > 0 && Number.isFinite(selected.stepSpend)
      ? selected.stepSpend / maxSpend
      : 0;

  return (
    <Paper id="upgrade-recipe-path" variant="outlined" sx={{ p: 1.5, scrollMarginTop: 16 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.25 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2">Recipe path</Typography>
          <Typography variant="caption" color="text.secondary">
            {stepEdit
              ? "Click a step to edit scroll / offering / stacks · EV updates live"
              : "Click a step · green ≥70% / amber ≥35%"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          {stepEdit && Object.keys(stepEdit.overrides).length > 0 ? (
            <Button size="small" variant="text" onClick={() => stepEdit.onResetAll()}>
              Reset edits
            </Button>
          ) : null}
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
        </Stack>
      </Stack>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          overflowX: "auto",
          pb: 0.5,
          mx: -0.5,
          px: 0.5,
        }}
        role="listbox"
        aria-label="Upgrade recipe steps"
      >
        {steps.map((s) => {
          const pct = Math.max(0, Math.min(100, s.chance * 100));
          const share = maxSpend > 0 && Number.isFinite(s.stepSpend) ? s.stepSpend / maxSpend : 0;
          const heavy = share >= 0.85 && steps.length > 1;
          const isSelected = pathStepKey(s) === selectedKey;
          const tipScroll =
            s.kind === "shiny"
              ? "Shiny polish"
              : s.scrollKey
              ? G?.items?.[s.scrollKey as ItemKey]?.name ?? s.scrollKey
              : "—";
          const tipOffering = s.offeringKey
            ? G?.items?.[s.offeringKey as ItemKey]?.name ?? s.offeringKey
            : "No offering";
          const bits = stackBitsFor(s);
          const stepKey = pathStepKey(s);
          const isOverridden = Boolean(stepEdit?.overrides[stepKey]);

          return (
            <Tooltip
              key={stepKey}
              title={`${
                s.kind === "shiny"
                  ? tipOffering
                  : `${tipScroll}${s.offeringKey ? ` + ${tipOffering}` : ""}`
              } · ${formatChancePct(s.chance)} · ${formatAttempts(s.chance)} tries · ${formatGold(
                s.stepSpend,
              )}${bits.length ? ` · ${bits.join(", ")}` : ""}${isOverridden ? " · edited" : ""}`}
            >
              <Box
                component="button"
                type="button"
                id={`upgrade-step-${stepKey}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => setSelectedKey(stepKey)}
                sx={{
                  flex: "0 0 auto",
                  width: 92,
                  outline: isOverridden ? "1px dashed" : undefined,
                  outlineColor: isOverridden ? "secondary.main" : undefined,
                  outlineOffset: isOverridden ? 2 : undefined,
                  p: 1,
                  borderRadius: 1,
                  border: 1,
                  borderColor: isSelected ? "primary.main" : heavy ? "warning.main" : "divider",
                  borderWidth: isSelected ? 2 : 1,
                  bgcolor: heavy
                    ? (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255, 167, 38, 0.08)"
                          : "rgba(255, 167, 38, 0.1)"
                    : isSelected
                    ? "action.selected"
                    : "transparent",
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
                  textAlign: "left",
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2,
                  },
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  display="block"
                  sx={{ mb: 0.75, fontVariantNumeric: "tabular-nums" }}
                >
                  {stepRangeLabel(s)}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ mb: 0.75, minHeight: 24 }}
                >
                  {s.kind === "shiny" ? (
                    s.offeringKey ? (
                      scrollOrOfferingCell(s.offeringKey)
                    ) : null
                  ) : (
                    <>
                      {scrollOrOfferingCell(s.scrollKey)}
                      {s.offeringKey ? scrollOrOfferingCell(s.offeringKey) : null}
                    </>
                  )}
                </Stack>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{ color: chanceTone(s.chance), fontVariantNumeric: "tabular-nums" }}
                >
                  {formatChancePct(s.chance)}
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    height: 4,
                    borderRadius: 0.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: chanceTone(s.chance) }} />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums" }}
                >
                  {formatGold(s.stepSpend)}
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    height: 3,
                    borderRadius: 0.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}
                  title={`${Math.round(share * 100)}% of heaviest step`}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${Math.round(share * 100)}%`,
                      bgcolor: heavy ? "warning.main" : "primary.main",
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {planEv > 0 ? (
        <Box sx={{ mt: 1.25 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.35 }}>
            <Typography variant="caption" color="text.secondary">
              Cumulative EV
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatGold(planEv)}
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "flex",
              height: 6,
              borderRadius: 1,
              overflow: "hidden",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            }}
            aria-hidden
          >
            {steps.map((s, i) => {
              const share = Number.isFinite(s.stepSpend) ? s.stepSpend / planEv : 0;
              if (share <= 0) return null;
              const heavy = maxSpend > 0 && s.stepSpend / maxSpend >= 0.85 && steps.length > 1;
              const isSelected = pathStepKey(s) === selectedKey;
              return (
                <Box
                  key={pathStepKey(s)}
                  sx={{
                    width: `${Math.max(share * 100, 0.4)}%`,
                    bgcolor: heavy ? "warning.main" : isSelected ? "primary.main" : "primary.light",
                    opacity: isSelected ? 1 : 0.55 + (i / Math.max(steps.length - 1, 1)) * 0.35,
                    cursor: "pointer",
                  }}
                  title={`${stepRangeLabel(s)}: ${formatGold(s.stepSpend)}`}
                  onClick={() => setSelectedKey(pathStepKey(s))}
                />
              );
            })}
          </Box>
        </Box>
      ) : null}

      {selected ? (
        <Box
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {stepRangeLabel(selected)}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                {selected.kind === "shiny" ? (
                  <>
                    {selected.offeringKey ? scrollOrOfferingCell(selected.offeringKey) : null}
                    <Typography variant="body2" noWrap>
                      {offeringName ?? "polish"} · fail keeps item
                    </Typography>
                  </>
                ) : (
                  <>
                    {scrollOrOfferingCell(selected.scrollKey)}
                    <Typography variant="body2" noWrap>
                      {scrollName ?? "—"}
                    </Typography>
                    {selected.offeringKey ? (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          +
                        </Typography>
                        {scrollOrOfferingCell(selected.offeringKey)}
                        <Typography variant="body2" noWrap>
                          {offeringName}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        · no offering
                      </Typography>
                    )}
                  </>
                )}
              </Stack>
            </Stack>
            <Stack
              direction="row"
              spacing={2.5}
              flexWrap="wrap"
              sx={{ gap: 1, fontVariantNumeric: "tabular-nums" }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Chance
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ color: chanceTone(selected.chance) }}
                >
                  {formatChancePct(selected.chance)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Exp. tries
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatAttempts(selected.chance)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Step EV
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatGold(selected.stepSpend)}
                  {selectedShare >= 0.01 ? (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {" "}
                      ({Math.round(selectedShare * 100)}% of peak)
                    </Typography>
                  ) : null}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Running total
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatGold(selected.runningTotal)}
                </Typography>
              </Box>
              {selectedStacks.length ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Stacks
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedStacks.join(" · ")}
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </Stack>

          {stepEdit && selected.kind !== "shiny" ? (
            <StepRecipeEditor
              step={selected}
              edit={stepEdit}
              overridden={Boolean(
                stepEdit.overrides[upgradeStepOverrideKey(selected.fromLevel, selected.toLevel)],
              )}
            />
          ) : null}
        </Box>
      ) : null}
    </Paper>
  );
}

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
    "Outside plan EV — enable Polish Shiny to add a polish step to the path",
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

/** Card list for narrow viewports; keeps scroll/offering icons readable. */
export function StepPlanCards({ steps }: { steps: PlanSummaryStep[] }) {
  const G = useContext(GDataContext);
  const maxStepSpend = Math.max(
    0,
    ...steps.map((s) => (Number.isFinite(s.stepSpend) ? s.stepSpend : 0)),
  );

  return (
    <Stack spacing={1} sx={{ display: { xs: "flex", md: "none" } }}>
      {steps.map((s) => {
        const share =
          maxStepSpend > 0 && Number.isFinite(s.stepSpend) ? s.stepSpend / maxStepSpend : 0;
        const heavy = share >= 0.85 && steps.length > 1;
        return (
          <Paper
            key={pathStepKey(s)}
            variant="outlined"
            sx={{
              p: 1.5,
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
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <ChanceBar chance={s.chance} />
              <Tooltip title={G?.items?.[s.scrollKey as ItemKey]?.name ?? s.scrollKey}>
                <Box component="span" sx={{ display: "inline-flex" }}>
                  {scrollOrOfferingCell(s.scrollKey)}
                </Box>
              </Tooltip>
              {s.offeringKey ? (
                <Tooltip title={G?.items?.[s.offeringKey as ItemKey]?.name ?? s.offeringKey}>
                  <Box component="span" sx={{ display: "inline-flex" }}>
                    {scrollOrOfferingCell(s.offeringKey)}
                  </Box>
                </Tooltip>
              ) : null}
              <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                {formatAttempts(s.chance)} tries · total {formatGold(s.runningTotal)}
              </Typography>
            </Stack>
            <CostShareBar share={share} color={heavy ? "warning.main" : "primary.main"} />
          </Paper>
        );
      })}
    </Stack>
  );
}

export function StepPlanTable({ steps }: { steps: PlanSummaryStep[] }) {
  const G = useContext(GDataContext);
  const maxStepSpend = Math.max(
    0,
    ...steps.map((s) => (Number.isFinite(s.stepSpend) ? s.stepSpend : 0)),
  );
  const showPrim = steps.some((s) => s.priming || s.primstacks);
  const showStatScroll = steps.some((s) => s.statScrollGrace);
  const showFail = steps.some((s) => s.failstack);
  const showPrimeStk = steps.some((s) => s.primestack);
  const usesStacks = showPrim || showStatScroll || showFail || showPrimeStk;

  const headSx = {
    fontWeight: 600,
    fontSize: "0.75rem",
    color: "text.secondary",
    whiteSpace: "nowrap",
    py: 1,
    px: 1,
  } as const;
  const cellSx = {
    py: 0.85,
    px: 1,
    verticalAlign: "middle",
    fontSize: "0.8125rem",
  } as const;
  const numSx = { ...cellSx, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

  return (
    <Accordion
      disableGutters
      elevation={0}
      defaultExpanded={usesStacks}
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
            {usesStacks ? ", and stack columns" : ""}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
        <StepPlanCards steps={steps} />

        <TableContainer sx={{ overflowX: "auto", display: { xs: "none", md: "block" } }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>Level</TableCell>
                <TableCell sx={headSx}>Chance</TableCell>
                <TableCell sx={headSx}>Scroll</TableCell>
                <TableCell sx={headSx}>Offering</TableCell>
                {showPrim ? (
                  <TableCell sx={headSx}>
                    <Tooltip title="Primling priming count">
                      <span>Prim</span>
                    </Tooltip>
                  </TableCell>
                ) : null}
                {showStatScroll ? (
                  <TableCell sx={headSx}>
                    <Tooltip title="Property scroll + offering (+1 grace each)">
                      <span>Stat</span>
                    </Tooltip>
                  </TableCell>
                ) : null}
                {showFail ? (
                  <TableCell sx={headSx}>
                    <Tooltip title="Failstack (helmet-proxy ugrace farm)">
                      <span>Fail</span>
                    </Tooltip>
                  </TableCell>
                ) : null}
                {showPrimeStk ? (
                  <TableCell sx={headSx}>
                    <Tooltip title="Primestack (helmet-proxy ograce farm)">
                      <span>PrimeStk</span>
                    </Tooltip>
                  </TableCell>
                ) : null}
                <TableCell sx={headSx} align="right">
                  Attempts
                </TableCell>
                <TableCell sx={headSx} align="right">
                  Step
                </TableCell>
                <TableCell sx={headSx} align="right">
                  Total
                </TableCell>
                <TableCell sx={{ ...headSx, minWidth: 72 }}>Share</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {steps.map((s) => {
                const share =
                  maxStepSpend > 0 && Number.isFinite(s.stepSpend) ? s.stepSpend / maxStepSpend : 0;
                const heavy = share >= 0.85 && steps.length > 1;
                const scrollName = s.scrollKey
                  ? G?.items?.[s.scrollKey as ItemKey]?.name ?? s.scrollKey
                  : null;
                const offeringName = s.offeringKey
                  ? G?.items?.[s.offeringKey as ItemKey]?.name ?? s.offeringKey
                  : null;
                return (
                  <TableRow
                    key={pathStepKey(s)}
                    sx={
                      heavy
                        ? {
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(255, 167, 38, 0.08)"
                                : "rgba(255, 167, 38, 0.1)",
                          }
                        : undefined
                    }
                  >
                    <TableCell sx={{ ...cellSx, fontWeight: 500, whiteSpace: "nowrap" }}>
                      {stepRangeLabel(s)}
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <ChanceBar chance={s.chance} />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      {s.kind === "shiny" ? (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      ) : (
                        <Tooltip title={scrollName ?? ""}>
                          <Box component="span" sx={{ display: "inline-flex" }}>
                            {scrollOrOfferingCell(s.scrollKey)}
                          </Box>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Tooltip
                        title={
                          s.kind === "shiny"
                            ? `${offeringName ?? "polish"} (fail keeps item)`
                            : offeringName ?? "No offering"
                        }
                      >
                        <Box component="span" sx={{ display: "inline-flex" }}>
                          {scrollOrOfferingCell(s.offeringKey)}
                        </Box>
                      </Tooltip>
                    </TableCell>
                    {showPrim ? (
                      <TableCell sx={numSx}>{stackCell(s.priming || s.primstacks)}</TableCell>
                    ) : null}
                    {showStatScroll ? (
                      <TableCell sx={numSx}>{stackCell(s.statScrollGrace)}</TableCell>
                    ) : null}
                    {showFail ? <TableCell sx={numSx}>{stackCell(s.failstack)}</TableCell> : null}
                    {showPrimeStk ? (
                      <TableCell sx={numSx}>{stackCell(s.primestack)}</TableCell>
                    ) : null}
                    <TableCell sx={numSx} align="right">
                      {formatAttempts(s.chance)}
                    </TableCell>
                    <TableCell sx={numSx} align="right">
                      {formatGold(s.stepSpend)}
                    </TableCell>
                    <TableCell sx={numSx} align="right">
                      {formatGold(s.runningTotal)}
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <CostShareBar share={share} color={heavy ? "warning.main" : "primary.main"} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
}
