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
import { ItemInfo, SlotType } from "typed-adventureland";
import { useContext, useMemo } from "react";

import { GDataContext } from "../../GDataContext";
import { CombatSimPanel } from "../../Shared/CombatSimPanel";
import { MonsterTargetPicker } from "../../Shared/MonsterTargetPicker";
import { SelectedCharacterClass } from "../../GearPlanner/types";
import { MatrixCombatParams } from "../useItemsUrlParams";

export type CombatContextValue = {
  classKey: string | null;
  level: number;
  targetMonster: MatrixCombatParams["simTarget"];
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
          <MonsterTargetPicker
            G={G}
            value={value.targetMonster}
            onChange={(key) => onChange({ ...value, targetMonster: key })}
            label="Target"
          />
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
  targetMonster,
}: {
  characterClass?: SelectedCharacterClass;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  targetMonster: MatrixCombatParams["simTarget"];
}) {
  const G = useContext(GDataContext);
  if (!G) return null;

  return (
    <Stack spacing={1}>
      <CombatSimPanel
        G={G}
        characterClass={characterClass}
        level={level}
        gear={gear}
        compact
        targetMonster={targetMonster}
      />
    </Stack>
  );
}
