import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box, Button, Chip, IconButton, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

import { CalcMode } from "./useUpgradeCalcParams";

export function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", letterSpacing: 0.6, lineHeight: 1.5, mb: 0.75 }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export function LevelStepper({
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
    <Box sx={{ textAlign: "center", minWidth: 88 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.25}>
        <IconButton
          size="small"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ minWidth: 40, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
        >
          +{value}
        </Typography>
        <IconButton
          size="small"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

/** Compact from→to steppers + common target presets (replaces dual chip grids). */
export function LevelRangeControl({
  mode,
  from,
  target,
  maxTarget,
  onFrom,
  onTarget,
}: {
  mode: CalcMode;
  from: number;
  target: number;
  maxTarget: number;
  onFrom: (n: number) => void;
  onTarget: (n: number) => void;
}) {
  const presets = mode === "compound" ? [3, 4, 5] : [7, 8, 9, 10, 12];
  const minTarget = mode === "compound" ? 1 : Math.max(1, from + 1);
  const maxFrom = Math.max(0, target - 1);

  return (
    <SidebarSection title="Level range">
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={0.5}
          sx={{
            py: 0.75,
            px: 0.5,
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          }}
        >
          {mode === "upgrade" ? (
            <>
              <LevelStepper label="From" value={from} min={0} max={maxFrom} onChange={onFrom} />
              <Typography variant="h6" color="text.secondary" aria-hidden sx={{ px: 0.25 }}>
                →
              </Typography>
              <LevelStepper
                label="To"
                value={target}
                min={minTarget}
                max={maxTarget}
                onChange={onTarget}
              />
            </>
          ) : (
            <LevelStepper
              label="Target"
              value={target}
              min={1}
              max={maxTarget}
              onChange={onTarget}
            />
          )}
        </Stack>

        <Box
          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: "center" }}
          role="group"
          aria-label="Target presets"
        >
          {presets.map((t) => {
            const disabled = mode === "upgrade" && t <= from;
            const selected = target === t;
            return (
              <Chip
                key={t}
                size="small"
                label={`+${t}`}
                disabled={disabled}
                color={selected ? "primary" : "default"}
                variant={selected ? "filled" : "outlined"}
                onClick={() => onTarget(t)}
                sx={{ height: 26, fontWeight: selected ? 700 : 500 }}
              />
            );
          })}
        </Box>

        {mode === "upgrade" && from > 0 ? (
          <Button size="small" onClick={() => onFrom(0)} sx={{ alignSelf: "center" }}>
            Start from +0
          </Button>
        ) : null}
      </Stack>
    </SidebarSection>
  );
}
