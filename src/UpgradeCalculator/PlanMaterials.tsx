import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
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
import { useState } from "react";

import { formatGold, MaterialLine, SideEffectSummary } from "../calculators";
import { CostShareBar, MatIcon } from "./planResultsShared";
import { CalcMode } from "./useUpgradeCalcParams";

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
    if (m.itemKey === "_stacks" || m.itemKey === "_craft_fee") {
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
  acquireMode = "buy",
}: {
  materials: MaterialLine[];
  materialLabel: (key: string) => string;
  planEv: number;
  acquireMode?: "buy" | "craft";
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
            {acquireMode === "craft"
              ? "Craft leaves × expected copies · ceil to buy"
              : "Buy = ceil(expected) · gold is EV spend"}
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
          const isCraftFee = m.itemKey === "_craft_fee";
          const buy = isStacks || isCraftFee ? null : buyQty(m.expectedQty);
          const secondary =
            isStacks || isCraftFee
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
                    {isStacks || isCraftFee
                      ? materialLabel(m.itemKey)
                      : `${materialLabel(m.itemKey)} × ${buy}`}
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
