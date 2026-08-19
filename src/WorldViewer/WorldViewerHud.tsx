import { ReactNode, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Popover,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { GMonster } from "typed-adventureland";
import { overlayHex } from "./overlayColors";
import { MapBand, OverlayKind, OverlayVisibility, ViewerMode } from "./types";
import { cameraMode, controlsHelpForMode } from "./cameraMode";

export function overlayLabel(kind: OverlayKind): string {
  switch (kind) {
    case "bounds":
      return "Bounds";
    case "spawns":
      return "Spawns";
    case "quirks":
      return "Quirks";
    case "doors":
      return "Doors";
    case "npcs":
      return "NPCs";
    case "zones":
      return "Zones";
    case "monsters":
      return "Monsters";
    case "rage":
      return "Rage";
    case "machines":
      return "Machines";
    case "animatables":
      return "Animatables";
    case "traps":
      return "Traps";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function monsterDisplayName(type: string, monsters: Record<string, GMonster>): string {
  const def = monsters[type as keyof typeof monsters];
  return def?.name || type;
}

const panelSx = {
  backgroundColor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
} as const;

interface MapChoice {
  id: string;
  name: string;
}

interface WorldTopBarProps {
  mapChoices: MapChoice[];
  selectedMap: string | null;
  onSelectMap: (mapId: string | null) => void;
  viewMode: ViewerMode;
  onViewMode: (mode: ViewerMode) => void;
  layerHeight: number;
  onLayerHeight: (value: number) => void;
  mapCount: number;
  dataVersion: number;
  twoWayCount: number;
  oneWayCount: number;
  loadingLabel: string | null;
  loadProgress: number;
  errorLabel: string | null;
  children?: ReactNode;
}

export function WorldTopBar({
  mapChoices,
  selectedMap,
  onSelectMap,
  viewMode,
  onViewMode,
  layerHeight,
  onLayerHeight,
  mapCount,
  dataVersion,
  twoWayCount,
  oneWayCount,
  loadingLabel,
  loadProgress,
  errorLabel,
  children,
}: WorldTopBarProps) {
  const selected = mapChoices.find((choice) => choice.id === selectedMap) || null;
  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 2,
        paddingX: 1.5,
        paddingY: 1,
      }}
    >
      <ToggleButtonGroup
        exclusive
        size="small"
        value={viewMode}
        onChange={(_event, value: ViewerMode | null) => {
          if (value) {
            onViewMode(value);
          }
        }}
      >
        <ToggleButton value="map">Single map</ToggleButton>
        <ToggleButton value="world">World</ToggleButton>
      </ToggleButtonGroup>
      <Autocomplete
        size="small"
        sx={{ minWidth: 280, flex: "1 1 240px", maxWidth: 420 }}
        options={mapChoices}
        value={selected}
        disableClearable={!cameraMode(viewMode).allowClearSelection}
        onChange={(_event, choice) => onSelectMap(choice?.id ?? null)}
        getOptionLabel={(choice) => `${choice.name} (${choice.id})`}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => <TextField {...params} label="Go to map" />}
      />
      {children}
      {cameraMode(viewMode).showLayerSlider && (
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 220, flex: "1 1 200px" }}
        >
          <Typography variant="caption" sx={{ whiteSpace: "nowrap" }}>
            Layer {layerHeight}px
          </Typography>
          <Slider
            size="small"
            min={120}
            max={1400}
            step={20}
            value={layerHeight}
            onChange={(_event, value) => onLayerHeight(Array.isArray(value) ? value[0] : value)}
          />
        </Box>
      )}
      <Typography variant="caption" sx={{ opacity: 0.8, marginLeft: "auto" }}>
        {cameraMode(viewMode).showConnectionLegend
          ? `${mapCount} maps · v${dataVersion} · ${twoWayCount} two-way · ${oneWayCount} one-way`
          : `${mapCount} maps · v${dataVersion}`}
      </Typography>
      {errorLabel && (
        <Typography variant="caption" color="error" sx={{ width: "100%" }}>
          {errorLabel}
        </Typography>
      )}
      {loadingLabel && (
        <Box sx={{ width: "100%" }}>
          <LinearProgress variant="determinate" value={loadProgress} />
          <Typography variant="caption">{loadingLabel}</Typography>
        </Box>
      )}
    </Paper>
  );
}

interface MonsterFilterPopoverProps {
  anchor: HTMLElement | null;
  onClose: () => void;
  monsterTypes: string[];
  hiddenMonsterTypes: Set<string>;
  monsters: Record<string, GMonster>;
  onToggleMonster: (type: string, visible: boolean) => void;
  onHideAll: () => void;
  onShowAll: () => void;
}

function MonsterFilterPopover({
  anchor,
  onClose,
  monsterTypes,
  hiddenMonsterTypes,
  monsters,
  onToggleMonster,
  onHideAll,
  onShowAll,
}: MonsterFilterPopoverProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return monsterTypes;
    }
    return monsterTypes.filter((type) => {
      const name = monsterDisplayName(type, monsters).toLowerCase();
      return name.includes(needle) || type.toLowerCase().includes(needle);
    });
  }, [monsterTypes, monsters, query]);

  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      <Box
        sx={{
          width: 360,
          maxHeight: 420,
          padding: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Typography variant="subtitle2">Monster visibility</Typography>
        <TextField
          size="small"
          label="Filter"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" variant="outlined" onClick={onHideAll}>
            Hide all
          </Button>
          <Button size="small" variant="outlined" onClick={onShowAll}>
            Show all
          </Button>
        </Box>
        <Box
          sx={{ overflow: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 0.5 }}
        >
          {filtered.map((type) => (
            <FormControlLabel
              key={type}
              sx={{ marginRight: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={!hiddenMonsterTypes.has(type)}
                  onChange={(event) => onToggleMonster(type, event.target.checked)}
                />
              }
              label={
                <Tooltip title={type}>
                  <Typography variant="caption">{monsterDisplayName(type, monsters)}</Typography>
                </Tooltip>
              }
            />
          ))}
        </Box>
      </Box>
    </Popover>
  );
}

interface WorldOverlayPanelProps {
  viewMode: ViewerMode;
  overlays: OverlayVisibility;
  overlayKinds: OverlayKind[];
  onToggleOverlay: (kind: OverlayKind, visible: boolean) => void;
  pixelArt: boolean;
  onPixelArt: (value: boolean) => void;
  seeThroughOverlays: boolean;
  onSeeThrough: (value: boolean) => void;
  includeIgnored: boolean;
  onIncludeIgnored: (value: boolean) => void;
  monsterTypes: string[];
  hiddenMonsterTypes: Set<string>;
  monsters: Record<string, GMonster>;
  onToggleMonster: (type: string, visible: boolean) => void;
  onHideAllMonsters: () => void;
  onShowAllMonsters: () => void;
  fogDensity: number;
  onFogDensity: (value: number) => void;
  soloBand: MapBand | null;
  onSoloBand: (band: MapBand | null) => void;
}

export function WorldOverlayPanel({
  viewMode,
  overlays,
  overlayKinds,
  onToggleOverlay,
  pixelArt,
  onPixelArt,
  seeThroughOverlays,
  onSeeThrough,
  includeIgnored,
  onIncludeIgnored,
  monsterTypes,
  hiddenMonsterTypes,
  monsters,
  onToggleMonster,
  onHideAllMonsters,
  onShowAllMonsters,
  fogDensity,
  onFogDensity,
  soloBand,
  onSoloBand,
}: WorldOverlayPanelProps) {
  const [monsterAnchor, setMonsterAnchor] = useState<HTMLElement | null>(null);
  const hiddenCount = hiddenMonsterTypes.size;

  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        width: 220,
        flexShrink: 0,
        padding: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        overflow: "auto",
      }}
    >
      <Typography variant="overline" sx={{ lineHeight: 1, opacity: 0.7 }}>
        Overlays
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {overlayKinds.map((kind) => {
          const on = overlays[kind];
          const color = overlayHex(kind);
          return (
            <Chip
              key={kind}
              size="small"
              label={overlayLabel(kind)}
              onClick={() => onToggleOverlay(kind, !on)}
              variant={on ? "filled" : "outlined"}
              sx={{
                borderColor: color,
                color: on ? "#111" : color,
                backgroundColor: on ? color : "transparent",
              }}
            />
          );
        })}
      </Box>
      <Typography variant="overline" sx={{ lineHeight: 1, opacity: 0.7 }}>
        View
      </Typography>
      <FormControlLabel
        sx={{ marginLeft: 0 }}
        control={
          <Checkbox
            size="small"
            checked={pixelArt}
            onChange={(event) => onPixelArt(event.target.checked)}
          />
        }
        label={<Typography variant="body2">Pixel art</Typography>}
      />
      <FormControlLabel
        sx={{ marginLeft: 0 }}
        control={
          <Checkbox
            size="small"
            checked={seeThroughOverlays}
            onChange={(event) => onSeeThrough(event.target.checked)}
          />
        }
        label={<Typography variant="body2">See-through overlays</Typography>}
      />
      <Tooltip title="Include maps marked unlist / ignore in game data">
        <Box>
          <FormControlLabel
            sx={{ marginLeft: 0 }}
            control={
              <Checkbox
                size="small"
                checked={includeIgnored}
                onChange={(event) => onIncludeIgnored(event.target.checked)}
              />
            }
            label={<Typography variant="body2">Hidden maps</Typography>}
          />
        </Box>
      </Tooltip>
      {cameraMode(viewMode).useFog && (
        <>
          <Typography variant="overline" sx={{ lineHeight: 1, opacity: 0.7 }}>
            Fog
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Slider
              size="small"
              min={0}
              max={0.00005}
              step={0.000001}
              value={fogDensity}
              onChange={(_event, value) => onFogDensity(Array.isArray(value) ? value[0] : value)}
            />
            <Typography variant="caption" sx={{ whiteSpace: "nowrap", minWidth: 50 }}>
              {fogDensity === 0 ? "Off" : fogDensity.toFixed(6)}
            </Typography>
          </Box>
        </>
      )}
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => setMonsterAnchor(event.currentTarget)}
      >
        Monsters{hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ""}
      </Button>
      <MonsterFilterPopover
        anchor={monsterAnchor}
        onClose={() => setMonsterAnchor(null)}
        monsterTypes={monsterTypes}
        hiddenMonsterTypes={hiddenMonsterTypes}
        monsters={monsters}
        onToggleMonster={onToggleMonster}
        onHideAll={onHideAllMonsters}
        onShowAll={onShowAllMonsters}
      />
      {viewMode === "world" && (
        <>
          <Typography variant="overline" sx={{ lineHeight: 1, opacity: 0.7 }}>
            Band
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={soloBand}
            exclusive
            onChange={(_event, value: MapBand | null) => onSoloBand(value)}
            sx={{ display: "flex" }}
          >
            <ToggleButton value="overworld" sx={{ flex: 1, fontSize: 11, padding: "4px 6px" }}>
              Over
            </ToggleButton>
            <ToggleButton value="indoor" sx={{ flex: 1, fontSize: 11, padding: "4px 6px" }}>
              Indoor
            </ToggleButton>
            <ToggleButton value="underground" sx={{ flex: 1, fontSize: 11, padding: "4px 6px" }}>
              Under
            </ToggleButton>
          </ToggleButtonGroup>
        </>
      )}
    </Paper>
  );
}

interface WorldStatusBarProps {
  viewMode: ViewerMode;
  cursor: { mapId: string; x: number; y: number } | null;
  cursorMapName: string | undefined;
  dataVersion: number;
  dataTimestamp: string;
}

export function WorldStatusBar({
  viewMode,
  cursor,
  cursorMapName,
  dataVersion,
  dataTimestamp,
}: WorldStatusBarProps) {
  const [helpAnchor, setHelpAnchor] = useState<HTMLElement | null>(null);
  const captionSx = { lineHeight: 1.4, whiteSpace: "nowrap" } as const;
  const helpLines = controlsHelpForMode(viewMode);
  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        display: "flex",
        alignItems: "center",
        gap: 2,
        paddingX: 1.5,
        paddingY: 1,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {cameraMode(viewMode).showConnectionLegend && (
        <>
          <Typography variant="caption" sx={{ ...captionSx, color: "#33ff66" }}>
            Two-way links
          </Typography>
          <Typography variant="caption" sx={{ ...captionSx, color: "#ffaa33" }}>
            One-way links
          </Typography>
        </>
      )}
      <Typography variant="caption" sx={{ ...captionSx, opacity: 0.75 }}>
        Click a door to travel · click overlays to inspect
      </Typography>
      <Button size="small" onClick={(event) => setHelpAnchor(event.currentTarget)}>
        Camera help
      </Button>
      <Popover
        open={Boolean(helpAnchor)}
        anchorEl={helpAnchor}
        onClose={() => setHelpAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ padding: 1.5, maxWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ marginBottom: 0.5 }}>
            Move the camera
          </Typography>
          {helpLines.map((line) => (
            <Typography key={line} variant="caption" display="block" sx={{ lineHeight: 1.7 }}>
              {line}
            </Typography>
          ))}
        </Box>
      </Popover>
      <Typography variant="caption" sx={{ ...captionSx, marginLeft: "auto", opacity: 0.8 }}>
        {cursor && cursorMapName ? `${cursorMapName} (${cursor.x}, ${cursor.y}) · ` : ""}
        data v{dataVersion} | {new Date(dataTimestamp).toLocaleString()}
      </Typography>
    </Paper>
  );
}
