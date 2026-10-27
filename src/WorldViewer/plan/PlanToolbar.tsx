import {
  Box,
  Button,
  Divider,
  MenuItem,
  Paper,
  Slider,
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

/** Primary farm-planning actions — these lead the board. */
const STRATEGY_TOOLS: Array<{ id: PlanTool | "zone"; label: string; hint: string }> = [
  { id: "select", label: "Select", hint: "Move and edit board objects" },
  { id: "zone", label: "Zone", hint: "Pull box, camp, safe, no-go" },
  { id: "ghost", label: "Party", hint: "Place a character ghost with range" },
  { id: "route", label: "Route", hint: "Click waypoints, then switch tools to finish" },
  { id: "packMarker", label: "Pack", hint: "Click a monster pack for pull order" },
  { id: "pin", label: "Note", hint: "Pin a callout on the map" },
];

const DRAW_TOOLS: Array<{ id: PlanTool; label: string }> = [
  { id: "line", label: "Line" },
  { id: "arrow", label: "Arrow" },
  { id: "freehand", label: "Ink" },
  { id: "ellipse", label: "Ellipse" },
  { id: "polygon", label: "Poly" },
  { id: "text", label: "Text" },
  { id: "stamp", label: "Stamp" },
];

const STAMPS: PlanStampKind[] = ["x", "checkpoint", "star"];
const CLASSES: ClassKey[] = ["warrior", "mage", "ranger", "priest", "rogue", "paladin", "merchant"];

const railSx = {
  display: "flex",
  flexWrap: "wrap",
  gap: 0.75,
  alignItems: "center",
} as const;

const sectionLabelSx = {
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  opacity: 0.55,
  fontWeight: 600,
  marginRight: 0.5,
} as const;

type PlanToolbarProps = {
  tool: PlanTool;
  onTool: (tool: PlanTool) => void;
  zoneMode: boolean;
  onZoneMode: (on: boolean) => void;
  color: string;
  onColor: (color: string) => void;
  selectedRadius: number | null;
  onSelectedRadius: (radius: number) => void;
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
    t: number;
    speedMul: number;
    trail: boolean;
    loop: boolean;
    hasRoute: boolean;
  };
  onPlayback: (patch: {
    playing?: boolean;
    t?: number;
    speedMul?: number;
    trail?: boolean;
    loop?: boolean;
  }) => void;
  routeDraftCount: number;
};

function strategyValue(tool: PlanTool, zoneMode: boolean): string {
  if (zoneMode && (tool === "rect" || tool === "ellipse" || tool === "polygon")) {
    return "zone";
  }
  if (STRATEGY_TOOLS.some((entry) => entry.id === tool)) {
    return tool;
  }
  return "";
}

export function PlanToolbar({
  tool,
  onTool,
  zoneMode,
  onZoneMode,
  color,
  onColor,
  selectedRadius,
  onSelectedRadius,
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
  routeDraftCount,
}: PlanToolbarProps) {
  const loadoutNames = Object.keys(loadouts).sort((a, b) => a.localeCompare(b));
  const strategy = strategyValue(tool, zoneMode);
  const showGhostContext = tool === "ghost" || (tool === "select" && Boolean(ghostLoadoutName));
  const showZoneContext = zoneMode || tool === "rect";
  const showRouteContext = tool === "route" || playback.hasRoute || routeDraftCount > 0;
  const showDrawExtras = tool === "stamp";

  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        padding: 1.25,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Box sx={{ ...railSx, justifyContent: "space-between" }}>
        <Box sx={{ ...railSx, flex: "1 1 220px" }}>
          <Typography sx={sectionLabelSx}>Strategy board</Typography>
          <TextField
            size="small"
            variant="standard"
            value={planName}
            onChange={(event) => onRename(event.target.value)}
            sx={{ minWidth: 160, maxWidth: 280 }}
            inputProps={{ "aria-label": "Plan name" }}
          />
        </Box>
        <Box sx={railSx}>
          <Tooltip title="Undo">
            <Button size="small" onClick={onUndo}>
              Undo
            </Button>
          </Tooltip>
          <Tooltip title="Redo">
            <Button size="small" onClick={onRedo}>
              Redo
            </Button>
          </Tooltip>
          <Button size="small" color="error" onClick={onDelete}>
            Delete
          </Button>
          <Button size="small" variant="outlined" onClick={onShare}>
            Share
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-start" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography sx={sectionLabelSx}>Place</Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={strategy || null}
            onChange={(_event, value: string | null) => {
              if (!value) {
                return;
              }
              if (value === "zone") {
                onZoneMode(true);
                onTool("rect");
                return;
              }
              onZoneMode(false);
              onTool(value as PlanTool);
            }}
          >
            {STRATEGY_TOOLS.map((entry) => (
              <ToggleButton key={entry.id} value={entry.id} sx={{ px: 1.25 }}>
                <Tooltip title={entry.hint}>
                  <span>{entry.label}</span>
                </Tooltip>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography sx={sectionLabelSx}>Draw</Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={!strategy && DRAW_TOOLS.some((entry) => entry.id === tool) ? tool : null}
            onChange={(_event, value: PlanTool | null) => {
              if (!value) {
                return;
              }
              onZoneMode(false);
              onTool(value);
            }}
          >
            {DRAW_TOOLS.map((entry) => (
              <ToggleButton key={entry.id} value={entry.id} sx={{ px: 1 }}>
                {entry.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ ...railSx, marginLeft: "auto" }}>
          <TextField
            size="small"
            type="color"
            value={color}
            onChange={(event) => onColor(event.target.value)}
            sx={{ width: 56 }}
            inputProps={{ "aria-label": "Stroke color", style: { padding: 4 } }}
          />
          {selectedRadius != null && (
            <TextField
              size="small"
              type="number"
              label="Range"
              value={Math.round(selectedRadius)}
              onChange={(event) => onSelectedRadius(Number(event.target.value))}
              sx={{ width: 96 }}
              inputProps={{ min: 1, step: 1 }}
            />
          )}
        </Box>
      </Box>

      {showZoneContext && (
        <Box
          sx={{
            ...railSx,
            padding: 1,
            borderRadius: 1,
            backgroundColor: "action.hover",
          }}
        >
          <Typography sx={sectionLabelSx}>Zones</Typography>
          {ZONE_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              size="small"
              variant={color === preset.color ? "contained" : "outlined"}
              onClick={() => onPreset(preset.id)}
              sx={{
                borderColor: preset.color,
                color: color === preset.color ? "#111" : preset.color,
                backgroundColor: color === preset.color ? preset.color : "transparent",
                minWidth: 0,
              }}
            >
              {preset.label}
            </Button>
          ))}
          <Typography variant="caption" sx={{ opacity: 0.7, marginLeft: 0.5 }}>
            Drag on the map to place · preset paints selection or next zone
          </Typography>
        </Box>
      )}

      {showGhostContext && (
        <Box
          sx={{
            ...railSx,
            padding: 1,
            borderRadius: 1,
            backgroundColor: "action.hover",
          }}
        >
          <Typography sx={sectionLabelSx}>Party ghost</Typography>
          <TextField
            select
            size="small"
            label="Class"
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
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Click the map to drop · attack range comes from class/gear
          </Typography>
        </Box>
      )}

      {tool === "packMarker" && (
        <Box sx={{ ...railSx, padding: 1, borderRadius: 1, backgroundColor: "action.hover" }}>
          <Typography sx={sectionLabelSx}>Pull order</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Click a monster pack on the map to mark Pack A, B, C…
          </Typography>
        </Box>
      )}

      {tool === "route" && (
        <Box sx={{ ...railSx, padding: 1, borderRadius: 1, backgroundColor: "action.hover" }}>
          <Typography sx={sectionLabelSx}>Route</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Click waypoints
            {routeDraftCount > 0 ? ` (${routeDraftCount} so far)` : ""}. Switch tool to finish the
            path.
          </Typography>
        </Box>
      )}

      {showDrawExtras && (
        <Box sx={{ ...railSx, padding: 1, borderRadius: 1, backgroundColor: "action.hover" }}>
          <Typography sx={sectionLabelSx}>Stamp</Typography>
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
        </Box>
      )}

      {showRouteContext && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            alignItems: "center",
            paddingTop: 0.5,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography sx={sectionLabelSx}>Playback</Typography>
          <Button
            size="small"
            variant="contained"
            disabled={!playback.hasRoute}
            onClick={() => onPlayback({ playing: !playback.playing })}
          >
            {playback.playing ? "Pause" : "Play"}
          </Button>
          <ToggleButton
            size="small"
            value="loop"
            selected={playback.loop}
            onChange={() => onPlayback({ loop: !playback.loop })}
          >
            Loop
          </ToggleButton>
          <ToggleButton
            size="small"
            value="trail"
            selected={playback.trail}
            onChange={() => onPlayback({ trail: !playback.trail })}
          >
            Trail
          </ToggleButton>
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
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 200, flex: "1 1 180px" }}
          >
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Scrub
            </Typography>
            <Slider
              size="small"
              min={0}
              max={1}
              step={0.01}
              value={playback.t}
              disabled={!playback.hasRoute}
              onChange={(_event, value) =>
                onPlayback({ t: Array.isArray(value) ? value[0] : value, playing: false })
              }
            />
          </Box>
        </Box>
      )}
    </Paper>
  );
}
