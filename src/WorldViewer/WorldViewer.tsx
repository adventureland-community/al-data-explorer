import { useContext, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { GDataContext } from "../GDataContext";
import { DEFAULT_LAYER_HEIGHT, layoutWorld } from "./layoutWorld";
import { collectMonsterTypes, collectUsedSpriteUrls } from "./spriteLookup";
import {
  DEFAULT_OVERLAYS,
  DoorTravel,
  MapFocus,
  OVERLAY_KINDS,
  OverlayKind,
  OverlayVisibility,
  ViewerMode,
} from "./types";
import { OverlayPick } from "./overlayPick";
import { useMapCanvases } from "./useMapTextures";
import { nextSelectedMap, selectedMapForMode, visibleWorldLayout } from "./viewerMode";
import { WorldCanvas } from "./WorldCanvas";
import { WorldInspector } from "./WorldInspector";
import { WorldOverlayInspect } from "./WorldOverlayInspect";
import { WorldOverlayPanel, WorldStatusBar, WorldTopBar } from "./WorldViewerHud";
import { toWorldSource } from "./worldData";

export function WorldViewer() {
  const G = useContext(GDataContext);
  const [overlays, setOverlays] = useState<OverlayVisibility>(DEFAULT_OVERLAYS);
  const [viewMode, setViewMode] = useState<ViewerMode>("map");
  const [layerHeight, setLayerHeight] = useState(DEFAULT_LAYER_HEIGHT);
  const [includeIgnored, setIncludeIgnored] = useState(false);
  const [selectedMap, setSelectedMap] = useState<string | null>("main");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const focusSeqRef = useRef(0);
  const [pixelArt, setPixelArt] = useState(true);
  const [seeThroughOverlays, setSeeThroughOverlays] = useState(false);
  const [hiddenMonsterTypes, setHiddenMonsterTypes] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<{ mapId: string; x: number; y: number } | null>(null);
  const [inspect, setInspect] = useState<OverlayPick | null>(null);
  const [doorDialog, setDoorDialog] = useState<DoorTravel | null>(null);

  const world = useMemo(() => (G ? toWorldSource(G) : null), [G]);

  const layout = useMemo(() => {
    if (!world) {
      return null;
    }
    return layoutWorld(world.source, layerHeight, includeIgnored, world.npcDefs);
  }, [world, layerHeight, includeIgnored]);

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

  const visibleLayout = useMemo(
    () => (layout ? visibleWorldLayout(layout, viewMode, selectedMap) : null),
    [layout, viewMode, selectedMap],
  );

  const monsterTypes = useMemo(() => {
    if (!visibleLayout) {
      return [];
    }
    return collectMonsterTypes(visibleLayout.maps);
  }, [visibleLayout]);

  const spriteUrls = useMemo(() => {
    if (!visibleLayout || !world) {
      return [];
    }
    return collectUsedSpriteUrls(visibleLayout.maps, world.spriteContext);
  }, [visibleLayout, world]);

  const bakeIds = useMemo(
    () => (visibleLayout ? Object.keys(visibleLayout.maps) : []),
    [visibleLayout],
  );

  const {
    art,
    sheets,
    progress,
    error: artError,
  } = useMapCanvases(
    world?.source.geometry || {},
    world?.tilesets || {},
    spriteUrls,
    bakeIds,
    Boolean(world),
    Boolean(pixelArt && world),
  );

  const spriteContext = useMemo(
    () => (world ? { ...world.spriteContext, sheets } : null),
    [world, sheets],
  );

  const requestMapFocus = (mapId: string, x: number, y: number) => {
    focusSeqRef.current += 1;
    setFocus({ mapId, x, y, seq: focusSeqRef.current });
  };

  const selectMap = (mapId: string | null, focusAt?: { x: number; y: number }) => {
    setSelectedMap((current) => nextSelectedMap(viewMode, current, mapId));
    if (mapId && focusAt) {
      requestMapFocus(mapId, focusAt.x, focusAt.y);
    }
  };

  const focusMap = (mapId: string) => {
    const map = layout?.maps[mapId];
    if (!map) {
      return;
    }
    selectMap(mapId, { x: (map.artMinX + map.artMaxX) / 2, y: (map.artMinY + map.artMaxY) / 2 });
  };

  const applyViewMode = (mode: ViewerMode) => {
    if (mode === viewMode) {
      return;
    }
    setViewMode(mode);
    if (!layout) {
      return;
    }
    const next = selectedMapForMode(mode, selectedMap, layout.maps);
    if (next !== selectedMap) {
      setSelectedMap(next);
    }
    if (next) {
      const map = layout.maps[next];
      if (map) {
        requestMapFocus(next, (map.artMinX + map.artMaxX) / 2, (map.artMinY + map.artMaxY) / 2);
      }
      return;
    }
    setSelectedMap(null);
  };

  const handleDoorTravel = (travel: DoorTravel) => {
    if (travel.lock) {
      setDoorDialog(travel);
      return;
    }
    selectMap(travel.toMap, { x: travel.toX, y: travel.toY });
  };

  const confirmDoorTravel = () => {
    if (!doorDialog) {
      return;
    }
    selectMap(doorDialog.toMap, { x: doorDialog.toX, y: doorDialog.toY });
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

  if (!G || !world || !layout || !visibleLayout) {
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
            selectMap(null);
          }
        }}
        viewMode={viewMode}
        onViewMode={applyViewMode}
        layerHeight={layerHeight}
        onLayerHeight={setLayerHeight}
        mapCount={mapIds.length}
        dataVersion={G.version}
        twoWayCount={twoWayCount}
        oneWayCount={oneWayCount}
        loadingLabel={loading}
        loadProgress={progress.total ? (100 * progress.done) / progress.total : 0}
        errorLabel={artError}
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
            scene={visibleLayout}
            maps={layout.maps}
            viewMode={viewMode}
            overlays={overlays}
            selectedMap={selectedMap}
            focus={focus}
            onSelectMap={selectMap}
            onDoorTravel={handleDoorTravel}
            onInspect={setInspect}
            onCursorMove={setCursor}
            mapArt={art}
            pixelArt={pixelArt}
            spriteContext={spriteContext}
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
        />
      </Box>
      <WorldStatusBar
        viewMode={viewMode}
        cursor={cursor}
        cursorMapName={cursorMap?.name}
        dataVersion={G.version}
        dataTimestamp={G.timestamp}
      />

      <WorldOverlayInspect
        inspect={inspect}
        maps={layout.maps}
        monsters={world.monsters}
        onClose={() => setInspect(null)}
      />

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
