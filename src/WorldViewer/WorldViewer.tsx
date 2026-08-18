import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Typography,
} from "@mui/material";
import { GDataContext } from "../GDataContext";
import { analyzeWorldLayout } from "./layoutAnalysis";
import { DEFAULT_LAYER_HEIGHT, layoutWorld } from "./layoutWorld";
import { collectMonsterTypes } from "./spriteLookup";
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
import { useMapCanvases } from "./useMapTextures";
import { WorldCanvas } from "./WorldCanvas";
import { WorldInspector } from "./WorldInspector";
import {
  monsterDisplayName,
  WorldOverlayPanel,
  WorldStatusBar,
  WorldTopBar,
} from "./WorldViewerHud";
import { toWorldSource } from "./worldData";

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
  const [cursor, setCursor] = useState<{ mapId: string; x: number; y: number } | null>(null);
  const [npcDialog, setNpcDialog] = useState<NpcSelection | null>(null);
  const [monsterDialog, setMonsterDialog] = useState<MonsterSelection | null>(null);
  const [doorDialog, setDoorDialog] = useState<DoorTravel | null>(null);

  const world = useMemo(() => (G ? toWorldSource(G) : null), [G]);

  const layout = useMemo(() => {
    if (!world) {
      return null;
    }
    return layoutWorld(world.source, layerHeight, includeIgnored, world.npcDefs);
  }, [world, layerHeight, includeIgnored]);

  const layoutReport = useMemo(() => (layout ? analyzeWorldLayout(layout) : null), [layout]);

  const mapIds = useMemo(() => {
    if (!layout) {
      return [];
    }
    return Object.keys(layout.maps).sort((a, b) =>
      layout.maps[a].name.localeCompare(layout.maps[b].name),
    );
  }, [layout]);

  const mapChoices = useMemo(
    () => mapIds.map((id) => ({ id, name: layout?.maps[id].name || id })),
    [layout, mapIds],
  );

  const monsterTypes = useMemo(() => (layout ? collectMonsterTypes(layout.maps) : []), [layout]);

  const { art, progress } = useMapCanvases(
    world?.source.geometry || {},
    world?.tilesets || {},
    mapIds,
    Boolean(pixelArt && world),
  );

  const requestMapFocus = (mapId: string, x: number, y: number) => {
    focusSeqRef.current += 1;
    setFocus({ mapId, x, y, seq: focusSeqRef.current });
  };

  const focusMap = (mapId: string) => {
    const map = layout?.maps[mapId];
    if (!map) {
      return;
    }
    setSelectedMap(mapId);
    requestMapFocus(mapId, (map.artMinX + map.artMaxX) / 2, (map.artMinY + map.artMaxY) / 2);
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

  const toggleOverlay = (kind: OverlayKind, visible: boolean) => {
    setOverlays((current) => ({ ...current, [kind]: visible }));
  };

  if (!G || !world || !layout) {
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
  const loading =
    pixelArt && progress.total > 0 && progress.done < progress.total
      ? `Loading maps (${progress.done}/${progress.total})… ${progress.current}`
      : null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        height: "100%",
        minHeight: 0,
        padding: 1,
        boxSizing: "border-box",
        textAlign: "left",
      }}
    >
      <WorldTopBar
        mapChoices={mapChoices}
        selectedMap={selectedMap && layout.maps[selectedMap] ? selectedMap : null}
        onSelectMap={(mapId) => {
          if (mapId) {
            focusMap(mapId);
          } else {
            setSelectedMap(null);
          }
        }}
        layerHeight={layerHeight}
        onLayerHeight={setLayerHeight}
        mapCount={mapIds.length}
        dataVersion={G.version}
        twoWayCount={twoWayCount}
        oneWayCount={oneWayCount}
        loadingLabel={loading}
        loadProgress={progress.total ? (100 * progress.done) / progress.total : 0}
      />
      <Box sx={{ display: "flex", gap: 1, flex: 1, minHeight: 0 }}>
        <WorldOverlayPanel
          overlays={overlays}
          overlayKinds={OVERLAY_KINDS}
          onToggleOverlay={toggleOverlay}
          pixelArt={pixelArt}
          onPixelArt={setPixelArt}
          seeThroughOverlays={seeThroughOverlays}
          onSeeThrough={setSeeThroughOverlays}
          includeIgnored={includeIgnored}
          onIncludeIgnored={setIncludeIgnored}
          monsterTypes={monsterTypes}
          hiddenMonsterTypes={hiddenMonsterTypes}
          monsters={world.monsters}
          onToggleMonster={toggleMonsterType}
          onHideAllMonsters={() => setHiddenMonsterTypes(new Set(monsterTypes))}
          onShowAllMonsters={() => setHiddenMonsterTypes(new Set())}
        />
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
            spriteContext={world.spriteContext}
            hiddenMonsterTypes={hiddenMonsterTypes}
            seeThroughOverlays={seeThroughOverlays}
          />
        </Box>
        <WorldInspector
          selected={selected}
          selectedPose={selectedPose}
          connections={selectedConnections}
          maps={layout.maps}
          poses={layout.poses}
          onFocusMap={focusMap}
          layoutReport={layoutReport}
        />
      </Box>
      <WorldStatusBar
        cursor={cursor}
        cursorMapName={cursorMap?.name}
        dataVersion={G.version}
        dataTimestamp={G.timestamp}
      />

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
          {monsterDialog ? monsterDisplayName(monsterDialog.type, world.monsters) : "Monster"}
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
