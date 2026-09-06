import { Chip, MenuItem, Stack, TextField } from "@mui/material";

import { AcquireFilter, CosmeticSort, sheetTypeLabel } from "../gameData/cosmeticsCatalog";

/** Acquire chips, sort select, and optional sheet-type chips. */
export function WardrobeToolbar({
  acquireFilter,
  sortMode,
  sheetType,
  typeOptions,
  onAcquire,
  onSort,
  onSheetType,
}: {
  acquireFilter: AcquireFilter;
  sortMode: CosmeticSort;
  sheetType: string;
  typeOptions: string[];
  onAcquire: (value: AcquireFilter) => void;
  onSort: (value: CosmeticSort) => void;
  onSheetType: (value: string | null) => void;
}) {
  return (
    <>
      <Stack
        direction="row"
        spacing={0.5}
        flexWrap="wrap"
        alignItems="center"
        sx={{ gap: 0.5, flex: "0 0 auto" }}
      >
        {(
          [
            ["all", "All"],
            ["free", "Free"],
            ["pack", "Unlockable"],
            ["unpublished", "Not in game"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            size="small"
            label={label}
            color={acquireFilter === value ? "warning" : "default"}
            variant={acquireFilter === value ? "filled" : "outlined"}
            onClick={() => onAcquire(value)}
          />
        ))}
        <TextField
          select
          size="small"
          label="Sort"
          value={sortMode}
          onChange={(e) => onSort(e.target.value as CosmeticSort)}
          sx={{ minWidth: 110, ml: 0.5 }}
        >
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="shells">Shells</MenuItem>
          <MenuItem value="odds">Rarity</MenuItem>
        </TextField>
      </Stack>

      {typeOptions.length > 1 ? (
        <Stack
          direction="row"
          spacing={0.5}
          flexWrap="wrap"
          alignItems="center"
          sx={{ gap: 0.5, flex: "0 0 auto" }}
        >
          <Chip
            size="small"
            label="All types"
            color={!sheetType ? "warning" : "default"}
            variant={!sheetType ? "filled" : "outlined"}
            onClick={() => onSheetType(null)}
          />
          {typeOptions.map((t) => (
            <Chip
              key={t}
              size="small"
              label={sheetTypeLabel(t)}
              color={sheetType === t ? "warning" : "default"}
              variant={sheetType === t ? "filled" : "outlined"}
              onClick={() => onSheetType(t)}
            />
          ))}
        </Stack>
      ) : null}
    </>
  );
}
