import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { ClassKey } from "typed-adventureland";
import { useLocation } from "react-router-dom";
import { GDataContext } from "../GDataContext";
import { DEFAULT_LAYER_HEIGHT, layoutWorld } from "./layoutWorld";
import { collectMonsterTypes, collectUsedSpriteUrls } from "./spriteLookup";
import { TravelBreadcrumb } from "./TravelBreadcrumb";
import {
  DEFAULT_OVERLAYS,
  DoorTravel,
  MapBand,
  MapFocus,
  OVERLAY_KINDS,
  OverlayKind,
  OverlayVisibility,
  ViewerMode,
} from "./types";
import { parseHash, syncHashFromState } from "./urlState";
import { OverlayPick } from "./overlayPick";
import { useMapCanvases } from "./useMapTextures";
import { nextSelectedMap, selectedMapForMode, visibleWorldLayout } from "./viewerMode";
import { WorldCanvas } from "./WorldCanvas";
import { WorldInspector } from "./WorldInspector";
import { WorldOverlayPanel, WorldStatusBar, WorldTopBar } from "./WorldViewerHud";
import { WorldSearchBar } from "./WorldSearchBar";
import { toWorldSource } from "./worldData";
import { PLAN_DEFAULT_OVERLAYS } from "./plan/planDefaults";
import { PlanLibraryPanel } from "./plan/PlanLibraryPanel";
import { PlanToolbar } from "./plan/PlanToolbar";
import { computeLoadoutStats } from "../gameData/loadoutStats";
import { advanceRouteT, pointAlongRoute } from "./plan/planPlayback";
import { usePlanSession } from "./plan/usePlanSession";
import { PlanPoint, PlanRouteObject } from "./plan/types";

const MAX_TRAVEL_HISTORY = 15;

function focusFromHash(hash: Record<string, string>): MapFocus | null {
  const mapId = hash.map;
  if (!mapId) return null;
  const x = Number(hash.x);
  const y = Number(hash.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { mapId, x, y, seq: 1, fit: "point" };
}

function viewerModeFromHash(mode: string | undefined): ViewerMode {
  if (mode === "world" || mode === "plan" || mode === "map") {
    return mode;
  }
  return "map";
}

export function WorldViewer() {
  const G = useContext(GDataContext);
  const location = useLocation();
  const initialHash = useRef(parseHash());
  const [overlays, setOverlays] = useState<OverlayVisibility>(() =>
    initialHash.current.mode === "plan" ? PLAN_DEFAULT_OVERLAYS : DEFAULT_OVERLAYS,
  );
  const [viewMode, setViewMode] = useState<ViewerMode>(
    viewerModeFromHash(initialHash.current.mode),
  );
  const [ghostClass, setGhostClass] = useState<ClassKey>("warrior");
  const [ghostLoadoutName, setGhostLoadoutName] = useState("");
  const [layerHeight, setLayerHeight] = useState(() => {
    const h = Number(initialHash.current.layers);
    return h > 0 ? h : DEFAULT_LAYER_HEIGHT;
  });
  const [includeIgnored, setIncludeIgnored] = useState(false);
  const [selectedMap, setSelectedMap] = useState<string | null>(initialHash.current.map || "main");
  const planSession = usePlanSession({
    mapKey: selectedMap,
    initialShare: initialHash.current.plan || null,
  });
  const focusSeqRef = useRef(0);
  const [focus, setFocus] = useState<MapFocus | null>(() => {
    const fromHash = focusFromHash(initialHash.current);
    if (fromHash) {
      focusSeqRef.current = fromHash.seq;
      return fromHash;
    }
    return null;
  });
  const travelSeqRef = useRef(0);
  const [travelHistory, setTravelHistory] = useState<Array<{ mapId: string; key: number }>>([]);
  const [pixelArt, setPixelArt] = useState(true);
  const [seeThroughOverlays, setSeeThroughOverlays] = useState(false);
  const [hiddenMonsterTypes, setHiddenMonsterTypes] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<{ mapId: string; x: number; y: number } | null>(null);
  const [inspect, setInspect] = useState<OverlayPick | null>(null);
  const [doorDialog, setDoorDialog] = useState<DoorTravel | null>(null);
  const [fogDensity, setFogDensity] = useState(0.000025);
  const [soloBand, setSoloBand] = useState<MapBand | null>(null);
  const [playbackPoint, setPlaybackPoint] = useState<PlanPoint | null>(null);
  const [trailPoints, setTrailPoints] = useState<PlanPoint[]>([]);

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
    selectedMap,
  );

  const spriteContext = useMemo(
    () => (world ? { ...world.spriteContext, sheets } : null),
    [world, sheets],
  );

  // Sync state → URL hash (preserve plan= share blob while in Plan mode)
  useEffect(() => {
    syncHashFromState(
      selectedMap,
      focus,
      viewMode,
      layerHeight,
      viewMode === "plan" && planSession.document
        ? planSession.shareUrl()?.split("plan=")[1]
        : null,
    );
  }, [selectedMap, focus, viewMode, layerHeight, planSession.document, planSession]);

  const requestMapFocus = (mapId: string, x: number, y: number, fit: MapFocus["fit"] = "map") => {
    focusSeqRef.current += 1;
    setFocus({ mapId, x, y, seq: focusSeqRef.current, fit });
  };

  const selectMap = (
    mapId: string | null,
    focusAt?: { x: number; y: number },
    fit: MapFocus["fit"] = "map",
  ) => {
    setSelectedMap((current) => nextSelectedMap(viewMode, current, mapId));
    if (mapId && focusAt) {
      requestMapFocus(mapId, focusAt.x, focusAt.y, fit);
    }
  };

  const focusMap = (mapId: string) => {
    const map = layout?.maps[mapId];
    if (!map) {
      return;
    }
    selectMap(mapId, { x: (map.artMinX + map.artMaxX) / 2, y: (map.artMinY + map.artMaxY) / 2 });
  };

  // Deep links (`#map=&x=&y=`) and in-app hash navigations → point focus at coords.
  useEffect(() => {
    if (!layout) return;
    const h = parseHash();
    if (!h.map || !layout.maps[h.map]) return;
    const hx = Number(h.x);
    const hy = Number(h.y);
    if (!Number.isFinite(hx) || !Number.isFinite(hy)) {
      if (!focus) focusMap(h.map);
      return;
    }
    setSelectedMap((current) => (current === h.map ? current : h.map));
    if (
      focus &&
      focus.mapId === h.map &&
      Math.round(focus.x) === Math.round(hx) &&
      Math.round(focus.y) === Math.round(hy) &&
      focus.fit === "point"
    ) {
      return;
    }
    requestMapFocus(h.map, hx, hy, "point");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, location.hash]);

  const applyViewMode = (mode: ViewerMode) => {
    if (mode === viewMode) {
      return;
    }
    setViewMode(mode);
    if (mode === "plan") {
      setOverlays(PLAN_DEFAULT_OVERLAYS);
      if (selectedMap) {
        planSession.enterPlan(
          selectedMap,
          planSession.document?.mapKey === selectedMap
            ? planSession.document ?? undefined
            : undefined,
        );
      }
    } else {
      planSession.exitPlan();
    }
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
      if (mode === "plan") {
        planSession.enterPlan(next);
      }
      return;
    }
    setSelectedMap(null);
  };

  useEffect(() => {
    if (planSession.active && planSession.document && viewMode !== "plan") {
      setViewMode("plan");
      setOverlays(PLAN_DEFAULT_OVERLAYS);
      if (planSession.document.mapKey !== selectedMap) {
        setSelectedMap(planSession.document.mapKey);
      }
    }
  }, [planSession.active, planSession.document, viewMode, selectedMap]);

  const playbackTRef = useRef(0);
  useEffect(() => {
    playbackTRef.current = planSession.playback.t;
  }, [planSession.playback.t]);

  useEffect(() => {
    if (!planSession.playback.playing || !planSession.document || !planSession.playback.routeId) {
      return undefined;
    }
    const route = planSession.document.objects.find(
      (object) => object.id === planSession.playback.routeId && object.kind === "route",
    ) as PlanRouteObject | undefined;
    if (!route) {
      return undefined;
    }
    let frame = 0;
    let last = performance.now();
    const ghost = route.ghostId
      ? planSession.document.objects.find((object) => object.id === route.ghostId)
      : undefined;
    let speedPx = 40;
    if (ghost?.kind === "ghost" && ghost.loadout && G) {
      const classRaw = G.classes[ghost.loadout.classKey];
      const stats = computeLoadoutStats({
        characterClass: classRaw
          ? {
              className: ghost.loadout.classKey,
              stats: classRaw.stats ?? {},
              lstats: classRaw.lstats ?? {},
              main_stat: classRaw.main_stat,
              mainhand: classRaw.mainhand,
              offhand: classRaw.offhand,
              doublehand: classRaw.doublehand,
            }
          : undefined,
        level: ghost.loadout.level,
        gear: ghost.loadout.gear,
        G,
      });
      if (typeof stats.speed === "number" && stats.speed > 0) {
        speedPx = stats.speed;
      }
    }
    const { speedMul, loop, trail } = planSession.playback;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const advanced = advanceRouteT({
        route,
        t: playbackTRef.current,
        dtSeconds: dt,
        speedPx,
        speedMul,
        loop,
      });
      playbackTRef.current = advanced.t;
      const point = pointAlongRoute(route, advanced.t);
      setPlaybackPoint(point);
      if (trail && point) {
        setTrailPoints((current) => [...current.slice(-24), point]);
      }
      if (advanced.done) {
        planSession.setPlayback({ t: advanced.t, playing: false });
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    planSession.playback.playing,
    planSession.playback.routeId,
    planSession.playback.speedMul,
    planSession.playback.loop,
    planSession.playback.trail,
    planSession.document,
    planSession,
    G,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!planSession.active) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          planSession.redo();
        } else {
          planSession.undo();
        }
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        planSession.deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [planSession]);

  const pushTravel = useCallback((mapId: string) => {
    travelSeqRef.current += 1;
    const entry = { mapId, key: travelSeqRef.current };
    setTravelHistory((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_TRAVEL_HISTORY ? next.slice(next.length - MAX_TRAVEL_HISTORY) : next;
    });
  }, []);

  const handleDoorTravel = (travel: DoorTravel) => {
    if (travel.lock) {
      setDoorDialog(travel);
      return;
    }
    selectMap(travel.toMap, { x: travel.toX, y: travel.toY });
    pushTravel(travel.toMap);
  };

  const confirmDoorTravel = () => {
    if (!doorDialog) {
      return;
    }
    selectMap(doorDialog.toMap, { x: doorDialog.toX, y: doorDialog.toY });
    pushTravel(doorDialog.toMap);
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
      >
        <WorldSearchBar
          maps={layout.maps}
          monsters={world.monsters}
          mapChoices={mapChoices}
          onFocusMap={focusMap}
          onSelectHit={(hit) => {
            if (hit.inspectNpc) {
              const npc = hit.inspectNpc;
              const showMarket = Boolean(npc.marketAreas?.length || npc.marketStops?.length);
              setOverlays((current) => ({
                ...current,
                npcs: true,
                ...(showMarket ? { market: true } : {}),
              }));
              setInspect({ kind: "npc", mapId: hit.mapId, npc });
            }
            selectMap(hit.mapId, { x: hit.x, y: hit.y }, hit.fit);
          }}
        />
      </WorldTopBar>
      {viewMode === "plan" && planSession.document && (
        <PlanToolbar
          tool={planSession.tool}
          onTool={planSession.setTool}
          color={planSession.color}
          onColor={planSession.recolorSelected}
          selectedRadius={(() => {
            const rangeDisc = [...planSession.selectedIds]
              .map((id) => planSession.document?.objects.find((object) => object.id === id))
              .find((object) => object?.kind === "ellipse" && object.role === "range");
            if (!rangeDisc || rangeDisc.kind !== "ellipse") {
              return null;
            }
            return rangeDisc.radiusOverride ?? rangeDisc.radiusX;
          })()}
          onSelectedRadius={planSession.setSelectedRadiusOverride}
          stamp={planSession.stamp}
          onStamp={planSession.setStamp}
          planName={planSession.document.name}
          onRename={planSession.renamePlan}
          onUndo={planSession.undo}
          onRedo={planSession.redo}
          onDelete={planSession.deleteSelected}
          onPreset={planSession.applyPreset}
          onShare={() => {
            const url = planSession.shareUrl();
            if (url) {
              navigator.clipboard.writeText(url).catch(() => undefined);
            }
          }}
          loadouts={planSession.loadouts}
          ghostClass={ghostClass}
          onGhostClass={setGhostClass}
          ghostLoadoutName={ghostLoadoutName}
          onGhostLoadoutName={setGhostLoadoutName}
          playback={{
            playing: planSession.playback.playing,
            t: planSession.playback.t,
            speedMul: planSession.playback.speedMul,
            trail: planSession.playback.trail,
            loop: planSession.playback.loop,
            hasRoute: planSession.document.objects.some((object) => object.kind === "route"),
          }}
          onPlayback={(patch) => {
            if (patch.t != null) {
              playbackTRef.current = patch.t;
              const activeRoute = planSession.document?.objects.find(
                (object) =>
                  object.kind === "route" &&
                  (object.id === planSession.playback.routeId || !planSession.playback.routeId),
              ) as PlanRouteObject | undefined;
              if (activeRoute) {
                setPlaybackPoint(pointAlongRoute(activeRoute, patch.t));
              }
            }
            if (patch.playing && !planSession.playback.routeId) {
              const route = planSession.document?.objects.find((object) => object.kind === "route");
              planSession.setPlayback({
                ...patch,
                routeId: route?.id ?? null,
                t: patch.t ?? 0,
              });
              playbackTRef.current = patch.t ?? 0;
              setTrailPoints([]);
              return;
            }
            if (patch.trail === false) {
              setTrailPoints([]);
            }
            planSession.setPlayback(patch);
          }}
        />
      )}
      <TravelBreadcrumb
        history={travelHistory}
        maps={layout.maps}
        onFocusMap={focusMap}
        onClear={() => setTravelHistory([])}
      />
      <Box sx={{ display: "flex", gap: 1, flex: 1, minHeight: 0 }}>
        <WorldOverlayPanel
          viewMode={viewMode}
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
          fogDensity={fogDensity}
          onFogDensity={setFogDensity}
          soloBand={soloBand}
          onSoloBand={setSoloBand}
          plansSlot={
            <PlanLibraryPanel
              mapKey={selectedMap}
              mapName={selected?.name}
              plansForMap={planSession.libraryForMap}
              allPlans={planSession.allPlans}
              activePlanId={planSession.document?.id ?? null}
              onCreate={(name) => {
                if (!selectedMap) {
                  return;
                }
                setOverlays(PLAN_DEFAULT_OVERLAYS);
                setViewMode("plan");
                planSession.createNamedPlan(selectedMap, name);
              }}
              onLoad={(id) => {
                const plan = planSession.allPlans.find((entry) => entry.id === id);
                if (plan) {
                  setSelectedMap(plan.mapKey);
                  setOverlays(PLAN_DEFAULT_OVERLAYS);
                  setViewMode("plan");
                }
                planSession.loadPlan(id);
              }}
              onDelete={planSession.deleteCurrentPlan}
              onPlanThisMap={() => {
                if (!selectedMap) {
                  return;
                }
                setOverlays(PLAN_DEFAULT_OVERLAYS);
                setViewMode("plan");
                planSession.enterPlan(selectedMap);
              }}
            />
          }
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
            monsterDefs={world.monsters}
            soloBand={soloBand}
            fogDensity={fogDensity}
            plan={
              viewMode === "plan" && planSession.document
                ? {
                    active: true,
                    document: planSession.document,
                    selectedIds: planSession.selectedIds,
                    tool: planSession.tool,
                    G,
                    capturePointer: planSession.tool !== "select",
                    playbackPoint,
                    playbackRouteId: planSession.playback.routeId,
                    trailPoints: planSession.playback.trail ? trailPoints : [],
                    onSelectIds: planSession.setSelectedIds,
                    onPointer: (args) => {
                      if (planSession.tool === "ghost" && args.phase === "down") {
                        const loadout = ghostLoadoutName
                          ? planSession.loadouts[ghostLoadoutName]
                          : undefined;
                        planSession.placeGhost({
                          point: args.point,
                          classKey: loadout?.classKey || ghostClass,
                          loadoutName: ghostLoadoutName || undefined,
                          loadout: loadout
                            ? {
                                classKey: loadout.classKey || ghostClass,
                                level: loadout.level,
                                gear: loadout.gear,
                                loadoutName: ghostLoadoutName,
                              }
                            : undefined,
                        });
                        return;
                      }
                      planSession.handleMapPointer(args);
                    },
                  }
                : null
            }
          />
        </Box>
        <WorldInspector
          selected={selected}
          selectedPose={selectedPose}
          connections={selectedConnections}
          maps={layout.maps}
          poses={layout.poses}
          onFocusMap={focusMap}
          inspect={inspect}
          monsters={world.monsters}
          drops={world.drops}
          items={world.items}
          npcs={world.npcs}
          onInspectClose={() => setInspect(null)}
        />
      </Box>
      <WorldStatusBar
        viewMode={viewMode}
        cursor={cursor}
        cursorMapName={cursorMap?.name}
        dataVersion={G.version}
        dataTimestamp={G.timestamp}
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
