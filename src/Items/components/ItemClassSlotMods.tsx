import { Box, Paper, Stack, Typography } from "@mui/material";

import { CLASS_COLOR } from "../../constants";
import { CLASS_SLOT_LABELS, titleCaseKey, type ItemClassSlotRow } from "../../gameData/classSkills";
import {
  ModifierKindBadge,
  ModifierScopeLink,
  ModifierSectionHeader,
  ModifierStatInline,
  modifierRowSx,
} from "./ItemModifierVisuals";

function SlotModRow({ row }: { row: ItemClassSlotRow }) {
  const color = CLASS_COLOR[row.classKey];
  const slotLabel = CLASS_SLOT_LABELS[row.slot];
  const empty = row.bonuses.length === 0;

  return (
    <Box
      sx={{
        ...modifierRowSx(color, { empty }),
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        columnGap: 0.75,
        rowGap: 0.15,
      }}
    >
      <Typography
        variant="body2"
        component="span"
        sx={{
          fontWeight: 600,
          lineHeight: 1.35,
          display: "inline-flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 0.45,
          flexShrink: 0,
        }}
      >
        <ModifierScopeLink
          label={titleCaseKey(row.classKey)}
          href={`/classes/${row.classKey}`}
          color={color}
        />
        <ModifierKindBadge label={slotLabel} />
      </Typography>
      <ModifierStatInline rows={row.bonuses} />
    </Box>
  );
}

export function ItemClassSlotMods({ rows }: { rows: ItemClassSlotRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Paper sx={{ p: 1.5 }}>
      <ModifierSectionHeader title="Class slot modifiers" />
      <Stack spacing={0.4}>
        {rows.map((row) => (
          <SlotModRow key={`${row.classKey}-${row.slot}`} row={row} />
        ))}
      </Stack>
    </Paper>
  );
}
