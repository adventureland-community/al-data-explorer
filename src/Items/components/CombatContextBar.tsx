import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { MonsterKey, ItemInfo, SlotType } from "typed-adventureland";
import { useContext, useMemo } from "react";

import { GDataContext } from "../../GDataContext";
import { CombatSimPanel } from "../../Shared/CombatSimPanel";
import { SelectedCharacterClass } from "../../GearPlanner/types";

export type CombatContextValue = {
  classKey: string | null;
  level: number;
  targetMonster: MonsterKey;
};

export function CombatContextBar({
  classes,
  value,
  onChange,
  compact,
}: {
  classes: SelectedCharacterClass[];
  value: CombatContextValue;
  onChange: (next: CombatContextValue) => void;
  compact?: boolean;
}) {
  const G = useContext(GDataContext);

  const handleClass = (event: SelectChangeEvent) => {
    onChange({ ...value, classKey: event.target.value || null });
  };

  const handleTarget = (event: SelectChangeEvent) => {
    onChange({ ...value, targetMonster: event.target.value as MonsterKey });
  };

  if (!G) return null;

  return (
    <Paper variant="outlined" sx={{ p: compact ? 1.5 : 2, mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Combat context
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        DPS estimates swap each matrix row&apos;s mainhand into this class/level vs the target.
      </Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="matrix-class-label">Class</InputLabel>
            <Select
              labelId="matrix-class-label"
              value={value.classKey ?? ""}
              label="Class"
              onChange={handleClass}
            >
              {classes.map((c) => (
                <MenuItem key={c.className} value={c.className}>
                  {c.className}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="matrix-target-label">Target</InputLabel>
            <Select
              labelId="matrix-target-label"
              value={value.targetMonster}
              label="Target"
              onChange={handleTarget}
            >
              {Object.keys(G.monsters).map((key) => (
                <MenuItem key={key} value={key}>
                  {G.monsters[key as MonsterKey].name ?? key}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Level {value.level}
          </Typography>
          <Slider
            size="small"
            value={value.level}
            min={1}
            max={200}
            onChange={(_, v) => onChange({ ...value, level: v as number })}
            valueLabelDisplay="auto"
          />
        </Grid>
      </Grid>
    </Paper>
  );
}

export function useCombatContextClasses(): SelectedCharacterClass[] {
  const G = useContext(GDataContext);
  return useMemo(() => {
    if (!G?.classes) return [];
    return Object.entries(G.classes).map(
      ([className, item]) => ({ className, ...item } as SelectedCharacterClass),
    );
  }, [G]);
}

export function MatrixCombatSidebar({
  characterClass,
  level,
  gear,
}: {
  characterClass?: SelectedCharacterClass;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
}) {
  const G = useContext(GDataContext);
  if (!G) return null;

  return (
    <Stack spacing={1}>
      <CombatSimPanel G={G} characterClass={characterClass} level={level} gear={gear} compact />
    </Stack>
  );
}
