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
  IconButton,
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
import { ItemKey } from "typed-adventureland";

import {
  allowedUpgradeScrollGrades,
  formatAttempts,
  formatChancePct,
  formatGold,
  OfferingChoice,
  offeringGradeFromKey,
  PlanSummaryStep,
  UpgradeStepOverride,
  upgradeStepOverrideKey,
} from "../calculators";
import { GDataContext } from "../GDataContext";
import {
  chanceTone,
  ColumnHead,
  CostShareBar,
  ICON,
  MatSlot,
  stackCell,
} from "./planResultsShared";

function stackBitsFor(s: PlanSummaryStep): string[] {
  const bits: string[] = [];
  if (s.primstacking) {
    const n = s.primstacking;
    bits.push(
      s.primstackingStatClicks
        ? `primstack ${n} (${s.primstackingStatClicks}×dex)`
        : `primstack ${n}`,
    );
  }
  if (s.statScrollGrace) bits.push(`stat ${s.statScrollGrace}`);
  if (s.failstack) bits.push(`failstack ${s.failstack}`);
  if (s.ograce) bits.push(`ograce ${s.ograce}`);
  return bits;
}

export function pathStepKey(s: PlanSummaryStep): string {
  if (s.kind === "acquire") return `acquire-${s.fromLevel}-${s.scrollKey}`;
  if (s.kind === "shiny") return `shiny-${s.toLevel}-${s.offeringKey ?? ""}`;
  return `${s.fromLevel}-${s.toLevel}`;
}

function stepRangeLabel(s: PlanSummaryStep): string {
  if (s.kind === "acquire") {
    return s.acquireMode === "craft" ? `Craft +${s.fromLevel}` : `Buy +${s.fromLevel}`;
  }
  if (s.kind === "shiny") return "Shiny";
  return `+${s.fromLevel}→+${s.toLevel}`;
}

function AcquireLeafStrip({ keys }: { keys: string[] }) {
  const shown = keys.slice(0, 4);
  const extra = keys.length - shown.length;
  return (
    <Stack direction="row" spacing={0.25} alignItems="center" justifyContent="center">
      {shown.map((k) => (
        <MatSlot key={k} itemKey={k} size={22} />
      ))}
      {extra > 0 ? (
        <Typography variant="caption" color="text.secondary">
          +{extra}
        </Typography>
      ) : null}
    </Stack>
  );
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
  allowPrimstacking: boolean;
  allowStatScrollGrace: boolean;
  overrides: Record<string, UpgradeStepOverride>;
  onPatch: (fromLevel: number, toLevel: number, patch: UpgradeStepOverride) => void;
  onReset: (fromLevel: number, toLevel: number) => void;
  onResetAll: () => void;
  /** Cycle Shiny polish material (nugget/ingot); updates chance + EV. */
  onCyclePolish?: () => void;
};

const UPGRADE_SCROLL_KEYS_SAFE = ["scroll0", "scroll1", "scroll2", "scroll3", "scroll4"];

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
                  s.acquireMode === "craft" ? (
                    `Craft × ${formatExpectedCopies(s.attempts)} expected`
                  ) : (
                    `Buy × ${formatExpectedCopies(s.attempts)} expected`
                  )
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
                s.acquireMode === "craft" && s.acquireLeafKeys?.length ? (
                  <AcquireLeafStrip keys={s.acquireLeafKeys} />
                ) : (
                  <MatSlot itemKey={s.scrollKey} />
                )
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
                  : `${
                      Number.isFinite(s.attempts)
                        ? formatExpectedCopies(s.attempts)
                        : formatAttempts(s.chance)
                    } tries`}
              </Typography>
            </Stack>
            {stepEdit && isRecipeStep(s) ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1, gap: 1 }}>
                {stepEdit.allowPrimstacking ? (
                  <TinyNum
                    label="Primstacking"
                    value={s.primstacking}
                    min={0}
                    max={26}
                    onChange={(primstacking) =>
                      stepEdit.onPatch(s.fromLevel, s.toLevel, { primstacking })
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
                      label="Ograce"
                      value={s.ograce}
                      min={0}
                      max={30}
                      onChange={(ograce) => stepEdit.onPatch(s.fromLevel, s.toLevel, { ograce })}
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
    ? Boolean(stepEdit?.allowPrimstacking)
    : steps.some((s) => s.primstacking);
  const showStatScroll = editable
    ? Boolean(stepEdit?.allowStatScrollGrace)
    : steps.some((s) => s.statScrollGrace);
  const showFail = editable ? stepEdit?.costModel === "cheapest" : steps.some((s) => s.failstack);
  const showPrimeStk = editable ? stepEdit?.costModel === "cheapest" : steps.some((s) => s.ograce);
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
                    label="Primstacking"
                    icons={["offeringp"]}
                    tip="Primlings on this item (+0.5 item grace each)"
                  />
                </TableCell>
              ) : null}
              {showStatScroll ? (
                <TableCell sx={headSx} align="center">
                  <ColumnHead
                    label="Stat"
                    icons={["strscroll"]}
                    tip="Property scroll + offering (+1 item grace each)"
                  />
                </TableCell>
              ) : null}
              {showFail ? (
                <TableCell sx={headSx} align="center">
                  <ColumnHead
                    label="Failstack"
                    icons={["helmet"]}
                    tip="Fail vendor helmets to bank ugrace (variants costed via helmet proxy)"
                  />
                </TableCell>
              ) : null}
              {showPrimeStk ? (
                <TableCell sx={headSx} align="center">
                  <ColumnHead
                    label="Ograce"
                    icons={["helmet", "offeringp"]}
                    tip="Banked player.p.ograce from offering fails (no common community name; costed via helmet+offering fails)"
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
                      s.acquireMode === "craft" && s.acquireLeafKeys?.length ? (
                        <AcquireLeafStrip keys={s.acquireLeafKeys} />
                      ) : (
                        <MatSlot itemKey={s.scrollKey} />
                      )
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
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {s.acquireMode === "craft" ? "recipe" : "market"}
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
                          label="Primstacking"
                          value={s.primstacking}
                          min={0}
                          max={26}
                          onChange={(primstacking) =>
                            stepEdit.onPatch(s.fromLevel, s.toLevel, { primstacking })
                          }
                        />
                      ) : (
                        stackCell(s.primstacking)
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
                          label="Ograce"
                          value={s.ograce}
                          min={0}
                          max={30}
                          onChange={(ograce) =>
                            stepEdit.onPatch(s.fromLevel, s.toLevel, { ograce })
                          }
                        />
                      ) : (
                        stackCell(s.ograce)
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell sx={numSx} align="right">
                    {s.kind === "acquire" || s.kind === "shiny"
                      ? formatExpectedCopies(s.attempts)
                      : Number.isFinite(s.attempts)
                      ? formatExpectedCopies(s.attempts)
                      : formatAttempts(s.chance)}
                  </TableCell>
                  <TableCell sx={{ ...numSx, minWidth: 96 }} align="right">
                    <Stack spacing={0.4} alignItems="flex-end" sx={{ minWidth: 88 }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {formatGold(s.stepSpend)}
                      </Box>
                      {s.kind === "acquire" && s.acquireMode === "craft" ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.65rem", lineHeight: 1 }}
                        >
                          craft mats
                        </Typography>
                      ) : null}
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
