import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BrushIcon from "@mui/icons-material/Brush";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HexagonOutlinedIcon from "@mui/icons-material/HexagonOutlined";
import IosShareIcon from "@mui/icons-material/IosShare";
import NearMeIcon from "@mui/icons-material/NearMe";
import PauseIcon from "@mui/icons-material/Pause";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RedoIcon from "@mui/icons-material/Redo";
import RouteIcon from "@mui/icons-material/Route";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import TimelineIcon from "@mui/icons-material/Timeline";
import UndoIcon from "@mui/icons-material/Undo";
import WhatshotOutlinedIcon from "@mui/icons-material/WhatshotOutlined";
import {
  Box,
  Button,
  Divider,
  IconButton,
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
import type { ChangeEvent, ComponentType, ReactNode } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";

import { SavedLoadout } from "../../GearPlanner/types";
import { ZONE_PRESETS } from "./zonePresets";
import { PlanStampKind, PlanTool, ZonePresetId } from "./types";

type ToolIcon = ComponentType<SvgIconProps>;

type ToolDef = {
  id: PlanTool | "zone";
  label: string;
  hint: string;
  Icon: ToolIcon;
};

/** Farm-planning actions lead the dock. */
const STRATEGY_TOOLS: ToolDef[] = [
  { id: "select", label: "Select", hint: "Move and edit board objects", Icon: NearMeIcon },
  { id: "zone", label: "Zone", hint: "Pull box, camp, safe, no-go", Icon: CropSquareIcon },
  {
    id: "ghost",
    label: "Party",
    hint: "Place a character ghost with range",
    Icon: PeopleAltOutlinedIcon,
  },
  {
    id: "route",
    label: "Route",
    hint: "Click waypoints, then switch tools to finish",
    Icon: TimelineIcon,
  },
  {
    id: "packMarker",
    label: "Pack",
    hint: "Click a monster pack for pull order",
    Icon: WhatshotOutlinedIcon,
  },
  { id: "pin", label: "Note", hint: "Pin a callout on the map", Icon: PushPinOutlinedIcon },
];

const DRAW_TOOLS: ToolDef[] = [
  { id: "line", label: "Line", hint: "Straight line", Icon: ShowChartIcon },
  { id: "arrow", label: "Arrow", hint: "Directional callout", Icon: ArrowForwardIcon },
  { id: "freehand", label: "Ink", hint: "Freehand stroke", Icon: BrushIcon },
  { id: "ellipse", label: "Ellipse", hint: "Ellipse / circle", Icon: RadioButtonUncheckedIcon },
  { id: "polygon", label: "Poly", hint: "Polygon", Icon: HexagonOutlinedIcon },
  { id: "text", label: "Text", hint: "Text label", Icon: TextFieldsIcon },
  { id: "stamp", label: "Stamp", hint: "Stamp marker", Icon: StarBorderIcon },
];

const STAMPS: PlanStampKind[] = ["x", "checkpoint", "star"];
const CLASSES: ClassKey[] = ["warrior", "mage", "ranger", "priest", "rogue", "paladin", "merchant"];

const dockSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0.25,
  padding: "4px 6px",
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  backgroundColor: "background.paper",
  boxShadow: 2,
} as const;

const toolBtnSx = {
  width: 36,
  height: 36,
  border: "none",
  borderRadius: 1.25,
  color: "text.secondary",
  "&.Mui-selected": {
    color: "primary.main",
    backgroundColor: "action.selected",
  },
  "&.Mui-selected:hover": {
    backgroundColor: "action.selected",
  },
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
  /** Strategy plans + map layers live in the dock so sidebars can stay gone. */
  libraryMenu?: ReactNode;
  layersMenu?: ReactNode;
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
  libraryMenu,
  layersMenu,
}: PlanToolbarProps) {
  const loadoutNames = Object.keys(loadouts).sort((a, b) => a.localeCompare(b));
  const strategy = strategyValue(tool, zoneMode);
  const drawValue = !strategy && DRAW_TOOLS.some((entry) => entry.id === tool) ? tool : null;
  const showGhostContext = tool === "ghost";
  const showZoneContext = zoneMode || tool === "rect";
  const showRouteContext = tool === "route" || playback.hasRoute || routeDraftCount > 0;
  const showDrawExtras = tool === "stamp";
  const hasContext =
    showZoneContext ||
    showGhostContext ||
    tool === "packMarker" ||
    tool === "route" ||
    showDrawExtras ||
    showRouteContext ||
    selectedRadius != null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 10,
        left: 0,
        right: 0,
        zIndex: 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        pointerEvents: "none",
        px: 1,
      }}
    >
      <Box
        sx={{
          pointerEvents: "auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
          maxWidth: "100%",
        }}
      >
        <Paper elevation={0} sx={{ ...dockSx, gap: 0.5, paddingLeft: 0.75, paddingRight: 0.75 }}>
          {libraryMenu}
          {layersMenu}
          {(libraryMenu || layersMenu) && (
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          )}
          <TextField
            size="small"
            variant="standard"
            value={planName}
            onChange={(event) => onRename(event.target.value)}
            sx={{
              minWidth: 100,
              maxWidth: 160,
              "& .MuiInput-root": { fontSize: 13, fontWeight: 600 },
              "& .MuiInput-underline:before": { borderBottomColor: "transparent" },
            }}
            inputProps={{ "aria-label": "Plan name" }}
          />
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          <Tooltip title="Undo">
            <IconButton size="small" onClick={onUndo} aria-label="Undo">
              <UndoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo">
            <IconButton size="small" onClick={onRedo} aria-label="Redo">
              <RedoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete selected">
            <IconButton size="small" color="error" onClick={onDelete} aria-label="Delete selected">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>

        <Paper elevation={0} sx={dockSx}>
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
            sx={{
              gap: 0.15,
              "& .MuiToggleButtonGroup-grouped": {
                border: 0,
                marginLeft: 0,
                borderRadius: "10px !important",
              },
            }}
          >
            {STRATEGY_TOOLS.map((entry) => {
              const { Icon } = entry;
              return (
                <ToggleButton
                  key={entry.id}
                  value={entry.id}
                  aria-label={entry.label}
                  title={`${entry.label} — ${entry.hint}`}
                  sx={toolBtnSx}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

          <ToggleButtonGroup
            exclusive
            size="small"
            value={drawValue}
            onChange={(_event, value: PlanTool | null) => {
              if (!value) {
                return;
              }
              onZoneMode(false);
              onTool(value);
            }}
            sx={{
              gap: 0.15,
              "& .MuiToggleButtonGroup-grouped": {
                border: 0,
                marginLeft: 0,
                borderRadius: "10px !important",
              },
            }}
          >
            {DRAW_TOOLS.map((entry) => {
              const { Icon } = entry;
              return (
                <ToggleButton
                  key={entry.id}
                  value={entry.id}
                  aria-label={entry.label}
                  title={`${entry.label} — ${entry.hint}`}
                  sx={toolBtnSx}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

          <Tooltip title="Stroke / fill color">
            <Box
              component="label"
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                cursor: "pointer",
                display: "inline-flex",
                mx: 0.25,
              }}
            >
              <Box
                component="input"
                type="color"
                value={color}
                onChange={(event: ChangeEvent<HTMLInputElement>) => onColor(event.target.value)}
                aria-label="Stroke color"
                sx={{
                  width: 40,
                  height: 40,
                  border: 0,
                  padding: 0,
                  margin: "-6px",
                  cursor: "pointer",
                  background: "none",
                }}
              />
            </Box>
          </Tooltip>
        </Paper>

        <Paper elevation={0} sx={{ ...dockSx, paddingX: 0.75 }}>
          <Tooltip title="Copy share link">
            <IconButton size="small" color="primary" onClick={onShare} aria-label="Share plan">
              <IosShareIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
      </Box>

      {hasContext && (
        <Paper
          elevation={0}
          sx={{
            pointerEvents: "auto",
            ...dockSx,
            flexWrap: "wrap",
            gap: 0.75,
            paddingY: 0.75,
            paddingX: 1.25,
            maxWidth: "min(920px, 96%)",
            justifyContent: "center",
          }}
        >
          {showZoneContext && (
            <>
              <Typography
                variant="caption"
                sx={{ opacity: 0.55, fontWeight: 600, letterSpacing: "0.04em" }}
              >
                Zones
              </Typography>
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
                    py: 0.25,
                    px: 1,
                    fontSize: 12,
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </>
          )}

          {showGhostContext && (
            <>
              <Typography
                variant="caption"
                sx={{ opacity: 0.55, fontWeight: 600, letterSpacing: "0.04em" }}
              >
                Party
              </Typography>
              <TextField
                select
                size="small"
                label="Class"
                value={ghostClass}
                onChange={(event) => onGhostClass(event.target.value as ClassKey)}
                sx={{ minWidth: 110 }}
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
                sx={{ minWidth: 140 }}
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

          {tool === "packMarker" && (
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Click a monster pack to mark Pack A, B, C…
            </Typography>
          )}

          {tool === "route" && (
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Click waypoints
              {routeDraftCount > 0 ? ` (${routeDraftCount} so far)` : ""}. Switch tool to finish.
            </Typography>
          )}

          {showDrawExtras && (
            <>
              <Typography
                variant="caption"
                sx={{ opacity: 0.55, fontWeight: 600, letterSpacing: "0.04em" }}
              >
                Stamp
              </Typography>
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
                  <ToggleButton key={entry} value={entry} sx={{ px: 1, py: 0.25 }}>
                    {entry}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </>
          )}

          {selectedRadius != null && (
            <TextField
              size="small"
              type="number"
              label="Range"
              value={Math.round(selectedRadius)}
              onChange={(event) => onSelectedRadius(Number(event.target.value))}
              sx={{ width: 88 }}
              inputProps={{ min: 1, step: 1 }}
            />
          )}

          {showRouteContext && (
            <>
              {(showZoneContext ||
                showGhostContext ||
                tool === "packMarker" ||
                tool === "route" ||
                showDrawExtras ||
                selectedRadius != null) && (
                <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
              )}
              <Tooltip title={playback.playing ? "Pause" : "Play route"}>
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    disabled={!playback.hasRoute}
                    onClick={() => onPlayback({ playing: !playback.playing })}
                    aria-label={playback.playing ? "Pause" : "Play"}
                  >
                    {playback.playing ? (
                      <PauseIcon fontSize="small" />
                    ) : (
                      <PlayArrowIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <ToggleButton
                size="small"
                value="loop"
                selected={playback.loop}
                onChange={() => onPlayback({ loop: !playback.loop })}
                sx={{ px: 1, py: 0.25 }}
              >
                Loop
              </ToggleButton>
              <ToggleButton
                size="small"
                value="trail"
                selected={playback.trail}
                onChange={() => onPlayback({ trail: !playback.trail })}
                sx={{ px: 1, py: 0.25 }}
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
                <ToggleButton value={0.5} sx={{ px: 0.75, py: 0.25 }}>
                  0.5×
                </ToggleButton>
                <ToggleButton value={1} sx={{ px: 0.75, py: 0.25 }}>
                  1×
                </ToggleButton>
                <ToggleButton value={2} sx={{ px: 0.75, py: 0.25 }}>
                  2×
                </ToggleButton>
              </ToggleButtonGroup>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  minWidth: 140,
                  flex: "1 1 140px",
                  maxWidth: 220,
                }}
              >
                <RouteIcon sx={{ fontSize: 16, opacity: 0.55 }} />
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
                  aria-label="Scrub route"
                />
              </Box>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}
