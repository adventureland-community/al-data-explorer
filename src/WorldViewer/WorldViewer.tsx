import { useContext, useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Slider,
  TextField,
  Typography,
} from "@mui/material";
import { GGeometry, GMap } from "typed-adventureland";
import { GDataContext } from "../GDataContext";
import { DEFAULT_LAYER_HEIGHT, layoutWorld } from "./layoutWorld";
import { overlayHex } from "./overlayColors";
import { DEFAULT_OVERLAYS, OVERLAY_KINDS, OverlayKind, OverlayVisibility } from "./types";
import { WorldCanvas } from "./WorldCanvas";

function overlayLabel(kind: OverlayKind): string {
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
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function WorldViewer() {
  const G = useContext(GDataContext);
  const [overlays, setOverlays] = useState<OverlayVisibility>(DEFAULT_OVERLAYS);
  const [layerHeight, setLayerHeight] = useState(DEFAULT_LAYER_HEIGHT);
  const [includeIgnored, setIncludeIgnored] = useState(false);
  const [selectedMap, setSelectedMap] = useState<string | null>("main");

  const layout = useMemo(() => {
    if (!G) {
      return null;
    }
    return layoutWorld(
      {
        maps: G.maps as unknown as Record<string, GMap>,
        geometry: G.geometry as unknown as Record<string, GGeometry | undefined>,
      },
      layerHeight,
      includeIgnored,
    );
  }, [G, layerHeight, includeIgnored]);

  if (!G || !layout) {
    return <>WAITING!</>;
  }

  const selected = selectedMap ? layout.maps[selectedMap] : undefined;
  const mapIds = Object.keys(layout.maps).sort();
  const twoWayCount = layout.connections.filter((connection) => connection.twoWay).length;
  const oneWayCount = layout.connections.length - twoWayCount;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        height: "calc(100vh - 150px)",
        minHeight: 520,
        textAlign: "left",
      }}
    >
      <Box
        sx={{
          width: 280,
          flexShrink: 0,
          overflow: "auto",
          paddingRight: 1,
        }}
      >
        <Typography variant="h6" gutterBottom>
          World viewer
        </Typography>
        <Typography variant="body2" sx={{ marginBottom: 2, opacity: 0.8 }}>
          Maps stay 2D. Interiors stack above or below their doors so XY lines up. Green links are
          two-way, orange links are one-way.
        </Typography>
        <TextField
          select
          fullWidth
          size="small"
          label="Focus map"
          value={selectedMap && layout.maps[selectedMap] ? selectedMap : ""}
          onChange={(event) => setSelectedMap(event.target.value || null)}
          sx={{ marginBottom: 2 }}
        >
          {mapIds.map((id) => (
            <MenuItem key={id} value={id}>
              {layout.maps[id].name}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="caption">Layer spacing ({layerHeight}px)</Typography>
        <Slider
          min={120}
          max={1400}
          step={20}
          value={layerHeight}
          onChange={(_event, value) => setLayerHeight(Array.isArray(value) ? value[0] : value)}
          sx={{ marginBottom: 2 }}
        />
        <FormGroup sx={{ marginBottom: 2 }}>
          {OVERLAY_KINDS.map((kind) => (
            <FormControlLabel
              key={kind}
              control={
                <Checkbox
                  checked={overlays[kind]}
                  onChange={(event) =>
                    setOverlays((current) => ({ ...current, [kind]: event.target.checked }))
                  }
                  sx={{ color: overlayHex(kind), "&.Mui-checked": { color: overlayHex(kind) } }}
                />
              }
              label={overlayLabel(kind)}
            />
          ))}
          <FormControlLabel
            control={
              <Checkbox
                checked={includeIgnored}
                onChange={(event) => setIncludeIgnored(event.target.checked)}
              />
            }
            label="Ignored / unlist maps"
          />
        </FormGroup>
        <Typography variant="body2">
          {mapIds.length} maps · {twoWayCount} two-way · {oneWayCount} one-way
        </Typography>
        {selected && (
          <Box sx={{ marginTop: 2 }}>
            <Typography variant="subtitle2">
              {selected.name} ({selected.id})
            </Typography>
            <Typography variant="body2">Band: {selected.band}</Typography>
            <Typography variant="body2">Doors: {selected.doors.length}</Typography>
            <Typography variant="body2">NPCs: {selected.npcs.length}</Typography>
            <Typography variant="body2">Monster packs: {selected.monsters.length}</Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <WorldCanvas
          layout={layout}
          overlays={overlays}
          selectedMap={selectedMap}
          onSelectMap={setSelectedMap}
        />
      </Box>
    </Box>
  );
}
