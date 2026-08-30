import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { ItemInfo, SlotType } from "typed-adventureland";
import { useContext, useMemo, useState } from "react";

import { GDataContext } from "../../GDataContext";
import { MatrixSimScope } from "../../gameData/combat/itemSimContext";
import { decodeLoadoutParam } from "../../gameData/loadoutUrl";
import { CombatSimPanel } from "../../Shared/CombatSimPanel";
import { CopyPageLinkButton } from "../../Shared/CopyPageLinkButton";
import { MonsterTargetPicker } from "../../Shared/MonsterTargetPicker";
import { SelectedCharacterClass } from "../../GearPlanner/types";
import { MatrixCombatParams } from "../useItemsUrlParams";

export type CombatContextValue = {
  classKey: string | null;
  level: number;
  targetMonster: MatrixCombatParams["simTarget"];
  simScope: MatrixSimScope;
  simGear: { [slot in SlotType]?: ItemInfo };
};

export function CombatContextBar({
  classes,
  value,
  onChange,
  compact,
  shareSearch,
}: {
  classes: SelectedCharacterClass[];
  value: CombatContextValue;
  onChange: (next: CombatContextValue) => void;
  compact?: boolean;
  /** Override search string for copy-link (defaults to current page). */
  shareSearch?: string;
}) {
  const G = useContext(GDataContext);
  const [loadoutPaste, setLoadoutPaste] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handleClass = (event: SelectChangeEvent) => {
    onChange({ ...value, classKey: event.target.value || null });
  };

  const gearCount = Object.keys(value.simGear).length;

  const onImportLoadout = () => {
    setPasteError(null);
    const raw = loadoutPaste.trim();
    if (!raw) return;

    let encoded = raw;
    const gearMatch = raw.match(/[?&](?:simGear|gear)=([^&]+)/);
    if (gearMatch) encoded = gearMatch[1];

    const decoded = decodeLoadoutParam(encoded);
    if (!decoded || Object.keys(decoded.gear).length === 0) {
      setPasteError("Could not parse loadout — paste a Gear Planner share link or ?gear=… param.");
      return;
    }

    onChange({
      ...value,
      simScope: "loadout",
      simGear: decoded.gear,
      classKey: decoded.classKey ?? value.classKey,
      level: decoded.level ?? value.level,
    });
    setLoadoutPaste("");
  };

  if (!G) return null;

  return (
    <Paper variant="outlined" sx={{ p: compact ? 1.5 : 2, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Combat context
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            DPS swaps each row&apos;s mainhand into this class/level vs the target.
            {value.simScope === "loadout" && gearCount > 0
              ? ` Full loadout (${gearCount} slots).`
              : " Mainhand-only."}
          </Typography>
        </Box>
        <CopyPageLinkButton label="Copy link" search={shareSearch} />
      </Stack>

      <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
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
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={value.simScope === "loadout"}
                onChange={(_, checked) =>
                  onChange({
                    ...value,
                    simScope: checked ? "loadout" : "mainhand",
                  })
                }
              />
            }
            label={
              <Typography variant="body2">
                Full loadout sim (include offhand, rings, sets — swap mainhand only)
              </Typography>
            }
          />
        </Grid>
        {value.simScope === "loadout" && (
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
              <TextField
                size="small"
                fullWidth
                label="Import loadout from Gear Planner link"
                placeholder="Paste ?gear=… or full /gear URL"
                value={loadoutPaste}
                onChange={(e) => setLoadoutPaste(e.target.value)}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={onImportLoadout}
                sx={{ flexShrink: 0 }}
              >
                Import
              </Button>
              {gearCount > 0 && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => onChange({ ...value, simGear: {} })}
                  sx={{ flexShrink: 0 }}
                >
                  Clear loadout
                </Button>
              )}
            </Stack>
            {pasteError && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {pasteError}
              </Alert>
            )}
            {gearCount > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mt: 0.75 }}
              >
                {gearCount} equipped slots loaded.
              </Typography>
            )}
          </Grid>
        )}
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
