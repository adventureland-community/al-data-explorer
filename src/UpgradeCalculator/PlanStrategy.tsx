import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useState } from "react";

import { formatGold } from "../calculators";

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
