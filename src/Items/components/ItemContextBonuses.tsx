import { Box, Paper, Stack, Typography } from "@mui/material";

import type { ItemContextBonusRow } from "../../gameData/itemContextBonuses";
import {
  MAP_ACCENT,
  ModifierKindBadge,
  ModifierMapChips,
  ModifierNestedInline,
  ModifierScopeLink,
  ModifierSectionHeader,
  ModifierStatInline,
  modifierRowSx,
} from "./ItemModifierVisuals";

function ContextBonusRow({ row }: { row: ItemContextBonusRow }) {
  const empty = row.bonuses.length === 0 && row.upgrade.length === 0 && row.compound.length === 0;
  const accent = row.scope.kind === "class" ? row.scope.color : MAP_ACCENT;

  return (
    <Box
      sx={modifierRowSx(accent, {
        empty,
        wash: row.scope.kind === "map" ? `${MAP_ACCENT}12` : undefined,
      })}
    >
      {row.scope.kind === "class" ? (
        <Box
          sx={{
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
              alignItems: "center",
              gap: 0.45,
              flexShrink: 0,
            }}
          >
            <ModifierScopeLink
              label={row.scope.label}
              href={row.scope.href}
              color={row.scope.color}
            />
            <ModifierKindBadge label="Only" />
          </Typography>
          <ModifierStatInline rows={row.bonuses} />
        </Box>
      ) : (
        <>
          <Box
            sx={{
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
                fontWeight: 700,
                lineHeight: 1.35,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.45,
                flexShrink: 0,
              }}
            >
              Map
              <ModifierKindBadge label="Only" />
            </Typography>
            <ModifierStatInline rows={row.bonuses} />
          </Box>
          <ModifierMapChips maps={row.scope.maps} />
        </>
      )}
      <ModifierNestedInline title="Per upgrade" rows={row.upgrade} />
      <ModifierNestedInline title="Per compound" rows={row.compound} />
    </Box>
  );
}

export function ItemContextBonuses({ rows }: { rows: ItemContextBonusRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Paper sx={{ p: 1.5 }}>
      <ModifierSectionHeader title="Context bonuses" subtitle="Class- or map-only extras" />
      <Stack spacing={0.4}>
        {rows.map((row) => (
          <ContextBonusRow key={row.id} row={row} />
        ))}
      </Stack>
    </Paper>
  );
}
