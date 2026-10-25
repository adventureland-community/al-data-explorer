import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { ItemKey } from "typed-adventureland";

import { ItemImage } from "../ItemImage";
import { ItemInstance } from "../Shared/ItemInstance";

/** Inventory-slot size — dark tile so pale scroll sprites stay readable. */
export const ICON = 40;
export const SLOT_BG = "#2a2d36";
export const SLOT_BORDER = "#4a4e5a";

export function chanceTone(chance: number): "success.main" | "warning.main" | "error.main" {
  const pct = chance * 100;
  if (pct >= 70) return "success.main";
  if (pct >= 35) return "warning.main";
  return "error.main";
}

export function CostShareBar({
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

export function MatIcon({ itemKey }: { itemKey: string }) {
  if (itemKey === "_craft_fee") {
    return (
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 0.5,
          bgcolor: "action.hover",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 700,
          color: "text.secondary",
        }}
      >
        g
      </Box>
    );
  }
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

export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
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

export function MatSlot({
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

export function ColumnHead({
  label,
  icons,
  tip,
}: {
  label: string;
  icons?: string[];
  tip?: string;
}) {
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

export function stackCell(value: number) {
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
