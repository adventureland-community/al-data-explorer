import { Box, Chip, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { ReactNode } from "react";

import { CONTEXT_BONUS_LABEL_COLOR } from "../../gameData/itemContextBonuses";

export const MAP_ACCENT = "#38bdf8";

export type ModifierStat = {
  key?: string;
  label: string;
  value: string;
  labelColor?: string;
};

/** Compact row shell — left rail only, minimal padding. */
export function modifierRowSx(
  accent: string,
  opts?: { empty?: boolean; wash?: string },
): Record<string, string | number> {
  const empty = Boolean(opts?.empty);
  const wash = opts?.wash ?? `${accent}18`;
  return {
    borderLeft: `2px solid ${empty ? `${accent}66` : accent}`,
    backgroundImage: empty ? "none" : `linear-gradient(90deg, ${wash} 0%, transparent 70%)`,
    borderRadius: 0.75,
    px: 1,
    py: 0.45,
    opacity: empty ? 0.72 : 1,
  };
}

export function ModifierSectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: subtitle ? 0.85 : 0.65 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25, mb: 0 }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.35, mt: 0.15 }}
        >
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}

export function ModifierKindBadge({ label }: { label: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 0.55,
        py: 0,
        borderRadius: 0.5,
        bgcolor: "action.hover",
        color: "text.secondary",
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        lineHeight: 1.6,
        verticalAlign: "middle",
      }}
    >
      {label}
    </Box>
  );
}

export function ModifierScopeLink({
  label,
  href,
  color,
}: {
  label: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      component={RouterLink}
      to={href}
      underline="hover"
      sx={{ color, fontWeight: 700, fontSize: "0.875rem" }}
    >
      [{label}]
    </Link>
  );
}

export function ModifierMapChips({
  maps,
}: {
  maps: { key: string; label: string; href: string }[];
}) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4, mt: 0.35 }}>
      {maps.map((map) => (
        <Chip
          key={map.key}
          component={RouterLink}
          to={map.href}
          clickable
          size="small"
          label={map.label}
          variant="outlined"
          sx={{
            height: 20,
            borderColor: `${MAP_ACCENT}88`,
            color: MAP_ACCENT,
            fontWeight: 600,
            "& .MuiChip-label": { px: 0.7, fontSize: "0.68rem" },
            "&:hover": {
              borderColor: MAP_ACCENT,
              bgcolor: `${MAP_ACCENT}14`,
            },
          }}
        />
      ))}
    </Box>
  );
}

/** Inline “Stat +n · Stat +m” — one line when possible. */
export function formatModifierStatsInline(rows: ModifierStat[]): ReactNode {
  if (rows.length === 0) return null;
  return rows.map((row, index) => {
    const color =
      row.labelColor ??
      (row.key ? CONTEXT_BONUS_LABEL_COLOR[row.key] : undefined) ??
      "text.secondary";
    return (
      <Box component="span" key={`${row.label}:${row.value}`}>
        {index > 0 ? (
          <Box component="span" sx={{ color: "text.disabled", mx: 0.5 }}>
            ·
          </Box>
        ) : null}
        <Box component="span" sx={{ color, fontWeight: 600 }}>
          {row.label}
        </Box>{" "}
        <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>
          {row.value}
        </Box>
      </Box>
    );
  });
}

export function ModifierStatInline({
  rows,
  emptyLabel = "No Modifier",
}: {
  rows: ModifierStat[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <Typography
        component="span"
        variant="caption"
        sx={{ color: "text.secondary", fontStyle: "italic", lineHeight: 1.35 }}
      >
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Typography
      component="span"
      variant="body2"
      sx={{ lineHeight: 1.35, fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem" }}
    >
      {formatModifierStatsInline(rows)}
    </Typography>
  );
}

export function ModifierNestedInline({ title, rows }: { title: string; rows: ModifierStat[] }) {
  if (rows.length === 0) return null;
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: "block", mt: 0.25, lineHeight: 1.35, fontVariantNumeric: "tabular-nums" }}
    >
      <Box component="span" sx={{ fontWeight: 600 }}>
        {title}:
      </Box>{" "}
      {formatModifierStatsInline(rows)}
    </Typography>
  );
}
