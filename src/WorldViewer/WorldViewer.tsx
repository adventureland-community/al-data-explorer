import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Link,
  MenuItem,
  Slider,
  TextField,
  Typography,
} from "@mui/material";
import {
  GDimension,
  GGeometry,
  GImage,
  GMap,
  GMonster,
  GNpc,
  GSprite,
  GTileset,
} from "typed-adventureland";
import { GDataContext } from "../GDataContext";
import { MapSpriteContext } from "./createWorldScene";
import { analyzeWorldLayout } from "./layoutAnalysis";
import { DEFAULT_LAYER_HEIGHT, layoutWorld } from "./layoutWorld";
import { overlayHex } from "./overlayColors";
import {
  DEFAULT_OVERLAYS,
  DoorTravel,
  MapFocus,
  MonsterSelection,
  NpcSelection,
  OVERLAY_KINDS,
  OverlayKind,
  OverlayVisibility,
} from "./types";
import { collectMonsterTypes } from "./spriteLookup";
import { useMapCanvases } from "./useMapTextures";
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

function monsterDisplayName(type: string, monsters: Record<string, GMonster>): string {
  const def = monsters[type as keyof typeof monsters];
  return def?.name || type;
}

export function WorldViewer() {
  const G = useContext(GDataContext);
  const [overlays, setOverlays] = useState<OverlayVisibility>(DEFAULT_OVERLAYS);
  const [layerHeight, setLayerHeight] = useState(DEFAULT_LAYER_HEIGHT);
  const [includeIgnored, setIncludeIgnored] = useState(false);
  const [selectedMap, setSelectedMap] = useState<string | null>("main");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const focusSeqRef = useRef(0);
  const [pixelArt, setPixelArt] = useState(true);
  const [seeThroughOverlays, setSeeThroughOverlays] = useState(false);
  const [hiddenMonsterTypes, setHiddenMonsterTypes] = useState<Set<string>>(new Set());
  const [monsterFilterOpen, setMonsterFilterOpen] = useState(true);
  const [cursor, setCursor] = useState<{ mapId: string; x: number; y: number } | null>(null);
  const [npcDialog, setNpcDialog] = useState<NpcSelection | null>(null);
  const [monsterDialog, setMonsterDialog] = useState<MonsterSelection | null>(null);
  const [doorDialog, setDoorDialog] = useState<DoorTravel | null>(null);
  const [layoutAnalysisOpen, setLayoutAnalysisOpen] = useState(false);

  const spriteContext = useMemo((): MapSpriteContext | null => {
    if (!G) {
      return null;
    }
    return {
      sprites: G.sprites as unknown as Record<string, GSprite>,
      images: G.images as unknown as Record<string, GImage>,
      dimensions: G.dimensions as unknown as Record<string, GDimension>,
      monsters: G.monsters as unknown as Record<string, GMonster>,
    };
  }, [G]);

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
      G.npcs as unknown as Record<string, GNpc>,
    );
  }, [G, layerHeight, includeIgnored]);

  const layoutReport = useMemo(() => (layout ? analyzeWorldLayout(layout) : null), [layout]);

  const mapIds = layout
    ? Object.keys(layout.maps).sort((a, b) => {
        const nameA = layout.maps[a].name;
        const nameB = layout.maps[b].name;
        return nameA.localeCompare(nameB);
      })
    : [];

  const monsterTypes = useMemo(() => (layout ? collectMonsterTypes(layout.maps) : []), [layout]);

  const { art, progress } = useMapCanvases(
    (G?.geometry as unknown as Record<string, GGeometry | undefined>) || {},
    (G?.tilesets as unknown as Record<string, GTileset>) || {},
    mapIds,
    Boolean(pixelArt && G),
  );

  const requestMapFocus = (mapId: string, x: number, y: number) => {
    focusSeqRef.current += 1;
    setFocus({ mapId, x, y, seq: focusSeqRef.current });
  };

  useEffect(() => {
    if (!layout || !selectedMap || focusSeqRef.current > 0) {
      return;
    }
    const map = layout.maps[selectedMap];
    if (!map) {
      return;
    }
    requestMapFocus(selectedMap, (map.artMinX + map.artMaxX) / 2, (map.artMinY + map.artMaxY) / 2);
  }, [layout, selectedMap]);

  const handleDoorTravel = (travel: DoorTravel) => {
    if (travel.lock) {
      setDoorDialog(travel);
      return;
    }
    setSelectedMap(travel.toMap);
    requestMapFocus(travel.toMap, travel.toX, travel.toY);
  };

  const confirmDoorTravel = () => {
    if (!doorDialog) {
      return;
    }
    setSelectedMap(doorDialog.toMap);
    requestMapFocus(doorDialog.toMap, doorDialog.toX, doorDialog.toY);
    setDoorDialog(null);
  };

  const toggleMonsterType = (type: string, visible: boolean) => {
    setHiddenMonsterTypes((current) => {
      const next = new Set(current);
      if (visible) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (!G || !layout) {
    return <>WAITING!</>;
  }

  const selected = selectedMap ? layout.maps[selectedMap] : undefined;
  const selectedPose = selectedMap ? layout.poses[selectedMap] : undefined;
  const selectedConnections = selectedMap
    ? layout.connections.filter(
        (connection) => connection.fromMap === selectedMap || connection.toMap === selectedMap,
      )
    : [];
  const twoWayCount = layout.connections.filter((connection) => connection.twoWay).length;
  const oneWayCount = layout.connections.length - twoWayCount;
  const cursorMap = cursor ? layout.maps[cursor.mapId] : undefined;

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
          width: 300,
          flexShrink: 0,
          overflow: "auto",
          paddingRight: 1,
        }}
      >
        <Typography variant="h6" gutterBottom>
          World viewer
        </Typography>
        <Typography variant="body2" sx={{ marginBottom: 2, opacity: 0.8 }}>
          Click doors to travel between maps. NPC and monster sprites load from adventure.land.
          Green links are two-way, orange are one-way.
        </Typography>
        <TextField
          select
          fullWidth
          size="small"
          label="Focus map"
          value={selectedMap && layout.maps[selectedMap] ? selectedMap : ""}
          onChange={(event) => {
            const mapId = event.target.value || null;
            setSelectedMap(mapId);
            if (mapId) {
              const map = layout.maps[mapId];
              requestMapFocus(
                mapId,
                (map.artMinX + map.artMaxX) / 2,
                (map.artMinY + map.artMaxY) / 2,
              );
            }
          }}
          sx={{ marginBottom: 2 }}
        >
          {mapIds.map((id) => (
            <MenuItem key={id} value={id}>
              {layout.maps[id].name} ({id})
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
                checked={pixelArt}
                onChange={(event) => setPixelArt(event.target.checked)}
              />
            }
            label="Pixel art tiles"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={seeThroughOverlays}
                onChange={(event) => setSeeThroughOverlays(event.target.checked)}
              />
            }
            label="See-through overlays"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeIgnored}
                onChange={(event) => setIncludeIgnored(event.target.checked)}
              />
            }
            label="Include hidden maps (unlist / ignore flags in map data)"
          />
        </FormGroup>
        <Box sx={{ marginBottom: 2 }}>
          <Button size="small" onClick={() => setMonsterFilterOpen((open) => !open)}>
            {monsterFilterOpen ? "▼" : "▶"} Monsters ({monsterTypes.length})
          </Button>
          {monsterFilterOpen && (
            <FormGroup sx={{ maxHeight: 220, overflow: "auto", marginTop: 1 }}>
              <Box sx={{ display: "flex", gap: 1, marginBottom: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setHiddenMonsterTypes(new Set(monsterTypes))}
                >
                  Hide all
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setHiddenMonsterTypes(new Set())}
                >
                  Show all
                </Button>
              </Box>
              {monsterTypes.map((type) => (
                <FormControlLabel
                  key={type}
                  control={
                    <Checkbox
                      size="small"
                      checked={!hiddenMonsterTypes.has(type)}
                      onChange={(event) => toggleMonsterType(type, event.target.checked)}
                    />
                  }
                  label={monsterDisplayName(
                    type,
                    G.monsters as unknown as Record<string, GMonster>,
                  )}
                />
              ))}
            </FormGroup>
          )}
        </Box>
        <Typography variant="body2">
          {mapIds.length} maps · data v{G.version} · {twoWayCount} two-way · {oneWayCount} one-way
        </Typography>
        <Box sx={{ marginTop: 2 }}>
          <Button size="small" onClick={() => setLayoutAnalysisOpen((open) => !open)}>
            {layoutAnalysisOpen ? "▼" : "▶"} Layout analysis
          </Button>
          {layoutAnalysisOpen && layoutReport && (
            <Box sx={{ marginTop: 1 }}>
              <Typography variant="body2">
                {layoutReport.components.length} components · {layoutReport.connectionCount} door
                edges
              </Typography>
              <Typography variant="body2">
                Same-layer overlaps: {layoutReport.artOverlapsSameZ} · cross-layer footprints:{" "}
                {layoutReport.artOverlapsAnyZ}
              </Typography>
              <Typography variant="body2">
                Near hub (±2500): {layoutReport.nearOriginMaps.length} maps
              </Typography>
              {layoutReport.components.map((component) => (
                <Typography
                  key={component.id}
                  variant="caption"
                  display="block"
                  sx={{ opacity: 0.85 }}
                >
                  {component.rootId}: {component.mapIds.length} maps, depth {component.maxDepth}
                </Typography>
              ))}
              <Typography variant="caption" display="block" sx={{ marginTop: 1, opacity: 0.75 }}>
                Z from band + dungeon depth. Door ports lock XY; slab separation on every Z layer;
                port-locked overlap uses small Z steps.
              </Typography>
            </Box>
          )}
        </Box>
        {cursor && cursorMap && (
          <Typography variant="body2" sx={{ marginTop: 1 }}>
            Cursor: {cursorMap.name} ({cursor.x}, {cursor.y})
          </Typography>
        )}
        {pixelArt && progress.total > 0 && progress.done < progress.total && (
          <Typography variant="caption" display="block">
            Loading maps ({progress.done}/{progress.total})… {progress.current}
          </Typography>
        )}
        {selected && (
          <Box sx={{ marginTop: 2 }}>
            <Typography variant="subtitle2">
              {selected.name} ({selected.id})
            </Typography>
            <Typography variant="body2">Band: {selected.band}</Typography>
            {selectedPose && (
              <Typography variant="body2">
                World pose: ({Math.round(selectedPose.x)}, {Math.round(selectedPose.y)}, z{" "}
                {Math.round(selectedPose.z)})
              </Typography>
            )}
            <Typography variant="body2">Doors: {selected.doors.length}</Typography>
            {selectedConnections.length > 0 && (
              <Box sx={{ marginTop: 1 }}>
                <Typography variant="caption">Door graph links</Typography>
                {selectedConnections.map((connection) => {
                  const outbound = connection.fromMap === selected.id;
                  const otherId = outbound ? connection.toMap : connection.fromMap;
                  const other = layout.maps[otherId];
                  const otherPose = layout.poses[otherId];
                  return (
                    <Typography
                      key={`${connection.fromMap}-${connection.toMap}`}
                      variant="caption"
                      display="block"
                    >
                      {outbound ? "→" : "←"} {other?.name || otherId}
                      {otherPose
                        ? ` (${Math.round(otherPose.x)}, ${Math.round(otherPose.y)}, z ${Math.round(
                            otherPose.z,
                          )})`
                        : ""}
                      {connection.twoWay ? " · two-way" : " · one-way"}
                    </Typography>
                  );
                })}
              </Box>
            )}
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
          focus={focus}
          onSelectMap={setSelectedMap}
          onDoorTravel={handleDoorTravel}
          onNpcSelect={setNpcDialog}
          onMonsterSelect={setMonsterDialog}
          onCursorMove={setCursor}
          mapArt={art}
          pixelArt={pixelArt}
          spriteContext={spriteContext}
          hiddenMonsterTypes={hiddenMonsterTypes}
          seeThroughOverlays={seeThroughOverlays}
        />
      </Box>

      <Dialog open={Boolean(npcDialog)} onClose={() => setNpcDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{npcDialog?.name || npcDialog?.id}</DialogTitle>
        <DialogContent>
          {npcDialog && (
            <>
              <Typography variant="body2">NPC id: {npcDialog.id}</Typography>
              <Typography variant="body2">Skin: {npcDialog.skin}</Typography>
              <Typography variant="body2">
                Map: {layout.maps[npcDialog.mapId]?.name} ({npcDialog.mapId})
              </Typography>
              <Typography variant="body2">
                Position: ({npcDialog.x}, {npcDialog.y})
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNpcDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(monsterDialog)}
        onClose={() => setMonsterDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {monsterDialog
            ? monsterDisplayName(
                monsterDialog.type,
                G.monsters as unknown as Record<string, GMonster>,
              )
            : "Monster"}
        </DialogTitle>
        <DialogContent>
          {monsterDialog && (
            <>
              <Typography variant="body2">Type: {monsterDialog.type}</Typography>
              <Typography variant="body2">
                Map: {layout.maps[monsterDialog.mapId]?.name} ({monsterDialog.mapId})
              </Typography>
              <Typography variant="body2">
                Pack center: ({monsterDialog.x}, {monsterDialog.y})
              </Typography>
              <Link
                href={`https://adventure.land/docs/guide/monsters#${monsterDialog.type}`}
                target="_blank"
                rel="noreferrer"
              >
                Open monster docs
              </Link>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMonsterDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(doorDialog)}
        onClose={() => setDoorDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Locked door</DialogTitle>
        <DialogContent>
          {doorDialog && (
            <Typography variant="body2">
              Enter {doorDialog.toName}? This door requires a key ({doorDialog.lock}).
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDoorDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmDoorTravel}>
            Enter anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
