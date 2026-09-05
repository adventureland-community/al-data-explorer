import { Chip, SxProps, Theme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { CLASS_COLOR } from "../constants";
import { isClassKey, SKILL_KIND_LABELS, SkillKind, titleCaseKey } from "../gameData/classSkills";

export const KIND_CHIP_SX: Record<SkillKind, { borderColor: string; color: string }> = {
  class: { borderColor: "#90caf9", color: "#90caf9" },
  item: { borderColor: "#ce93d8", color: "#ce93d8" },
  shared: { borderColor: "#a5d6a7", color: "#a5d6a7" },
  monster: { borderColor: "#ef9a9a", color: "#ef9a9a" },
  utility: { borderColor: "#bdbdbd", color: "#bdbdbd" },
};

function hexLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return 0;
  const n = parseInt(raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function classTextOn(color: string): string {
  return hexLuminance(color) > 0.62 ? "rgba(0,0,0,0.84)" : "#fff";
}

export function classAccent(color: string): SxProps<Theme> {
  return {
    borderLeft: `3px solid ${color}`,
    backgroundImage: `linear-gradient(90deg, ${color}2e 0%, transparent 64%)`,
  };
}

export function classChipSx(classKey: string, selected = false): SxProps<Theme> | undefined {
  if (!isClassKey(classKey)) return undefined;
  const color = CLASS_COLOR[classKey];
  if (selected) {
    return {
      backgroundColor: color,
      borderColor: color,
      color: classTextOn(color),
      "& .MuiChip-label": { color: classTextOn(color) },
    };
  }
  return { borderColor: color, color };
}

export function ClassChip({
  classKey,
  link = true,
  selected = false,
  onClick,
}: {
  classKey: string;
  link?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const sx = classChipSx(classKey, selected);
  const label = titleCaseKey(classKey);
  if (onClick) {
    return (
      <Chip
        size="small"
        label={label}
        variant={selected ? "filled" : "outlined"}
        onClick={onClick}
        clickable
        sx={sx}
      />
    );
  }
  if (!link) {
    return <Chip size="small" label={label} variant="outlined" sx={sx} />;
  }
  return (
    <Chip
      component={RouterLink}
      to={`/classes/${classKey}`}
      size="small"
      label={label}
      variant={selected ? "filled" : "outlined"}
      clickable
      sx={sx}
    />
  );
}

export function classColor(classKey: string): string | undefined {
  return isClassKey(classKey) ? CLASS_COLOR[classKey] : undefined;
}

export function KindChip({
  kind,
  selected,
  onClick,
}: {
  kind: SkillKind;
  selected?: boolean;
  onClick?: () => void;
}) {
  const colorSx = KIND_CHIP_SX[kind];
  return (
    <Chip
      size="small"
      label={SKILL_KIND_LABELS[kind]}
      variant={selected ? "filled" : "outlined"}
      onClick={onClick}
      clickable={Boolean(onClick)}
      sx={selected ? { backgroundColor: colorSx.borderColor, color: "rgba(0,0,0,0.84)" } : colorSx}
    />
  );
}
