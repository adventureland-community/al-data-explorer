import {
  Box,
  Button,
  ButtonGroup,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { ClassKey } from "typed-adventureland";

import { SavedLoadout } from "../../GearPlanner/types";
import { ZONE_PRESETS } from "./zonePresets";
import { PlanStampKind, PlanTool, ZonePresetId } from "./types";

const DRAW_TOOLS: Array<{ id: PlanTool; label: string }> = [
  { id: "select", label: "Select" },
  { id: "line", label: "Line" },
  { id: "arrow", label: "Arrow" },
  { id: "freehand", label: "Ink" },
  { id: "rect", label: "Rect" },
  { id: "ellipse", label: "Ellipse" },
  { id: "polygon", label: "Polygon" },
  { id: "text", label: "Text" },
  { id: "stamp", label: "Stamp" },
  { id: "ghost", label: "Ghost" },
  { id: "route", label: "Route" },
  { id: "pin", label: "Pin" },
  { id: "packMarker", label: "Pack" },
];

const STAMPS: PlanStampKind[] = ["x", "checkpoint", "star"];
const CLASSES: ClassKey[] = ["warrior", "mage", "ranger", "priest", "rogue", "paladin", "merchant"];

type PlanToolbarProps = {
  tool: PlanTool;
  onTool: (tool: PlanTool) => void;
  color: string;
  onColor: (color: string) => void;
  stamp: PlanStampKind;
  onStamp: (stamp: PlanStampKind) => void;
  planName: string;
  onRename: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onPreset: (id: ZonePresetId) => void;
  onShare: () => void;
  loadouts: Record<string, SavedLoadout>;
  ghostClass: ClassKey;
  onGhostClass: (classKey: ClassKey) => void;
  ghostLoadoutName: string;
  onGhostLoadoutName: (name: string) => void;
  playback: {
    playing: boolean;
    speedMul: number;
    trail: boolean;
    loop: boolean;
    hasRoute: boolean;
  };
  onPlayback: (patch: {
    playing?: boolean;
    speedMul?: number;
    trail?: boolean;
    loop?: boolean;
  }) => void;
};

export function PlanToolbar({
  tool,
  onTool,
  color,
  onColor,
  stamp,
  onStamp,
  planName,
  onRename,
  onUndo,
  onRedo,
  onDelete,
  onPreset,
  onShare,
  loadouts,
  ghostClass,
  onGhostClass,
  ghostLoadoutName,
  onGhostLoadoutName,
  playback,
  onPlayback,
}: PlanToolbarProps) {
  const loadoutNames = Object.keys(loadouts).sort((a, b) => a.localeCompare(b));
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        width: "100%",
        paddingTop: 0.5,
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        <TextField
          size="small"
          label="Plan name"
          value={planName}
          onChange={(event) => onRename(event.target.value)}
          sx={{ minWidth: 180 }}
        />
        <TextField
          size="small"
          type="color"
          label="Color"
          value={color}
          onChange={(event) => onColor(event.target.value)}
          sx={{ width: 88 }}
          InputLabelProps={{ shrink: true }}
        />
        <ButtonGroup size="small" variant="outlined">
          <Button onClick={onUndo}>Undo</Button>
          <Button onClick={onRedo}>Redo</Button>
          <Button color="error" onClick={onDelete}>
            Delete
          </Button>
          <Button onClick={onShare}>Copy share link</Button>
        </ButtonGroup>
      </Box>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={tool}
        onChange={(_event, value: PlanTool | null) => {
          if (value) {
            onTool(value);
          }
        }}
        sx={{ flexWrap: "wrap" }}
      >
        {DRAW_TOOLS.map((entry) => (
          <ToggleButton key={entry.id} value={entry.id}>
            {entry.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Zone presets
        </Typography>
        {ZONE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            size="small"
            variant="outlined"
            onClick={() => onPreset(preset.id)}
            sx={{ borderColor: preset.color, color: preset.color }}
          >
            {preset.label}
          </Button>
        ))}
        {tool === "stamp" && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={stamp}
            onChange={(_event, value: PlanStampKind | null) => {
              if (value) {
                onStamp(value);
              }
            }}
          >
            {STAMPS.map((entry) => (
              <ToggleButton key={entry} value={entry}>
                {entry}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
        {(tool === "ghost" || tool === "select") && (
          <>
            <TextField
              select
              size="small"
              label="Ghost class"
              value={ghostClass}
              onChange={(event) => onGhostClass(event.target.value as ClassKey)}
              sx={{ minWidth: 120 }}
            >
              {CLASSES.map((classKey) => (
                <MenuItem key={classKey} value={classKey}>
                  {classKey}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Loadout"
              value={ghostLoadoutName}
              onChange={(event) => onGhostLoadoutName(event.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Blank token</MenuItem>
              {loadoutNames.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </>
        )}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Route playback
        </Typography>
        <Button
          size="small"
          variant="contained"
          disabled={!playback.hasRoute}
          onClick={() => onPlayback({ playing: !playback.playing })}
        >
          {playback.playing ? "Pause" : "Play"}
        </Button>
        <Tooltip title="Loop">
          <ToggleButton
            size="small"
            value="loop"
            selected={playback.loop}
            onChange={() => onPlayback({ loop: !playback.loop })}
          >
            Loop
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Trail">
          <ToggleButton
            size="small"
            value="trail"
            selected={playback.trail}
            onChange={() => onPlayback({ trail: !playback.trail })}
          >
            Trail
          </ToggleButton>
        </Tooltip>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={playback.speedMul}
          onChange={(_event, value: number | null) => {
            if (value) {
              onPlayback({ speedMul: value });
            }
          }}
        >
          <ToggleButton value={0.5}>0.5×</ToggleButton>
          <ToggleButton value={1}>1×</ToggleButton>
          <ToggleButton value={2}>2×</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}
