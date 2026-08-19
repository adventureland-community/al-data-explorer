import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GMonster } from "typed-adventureland";
import { applyFog, cameraMode } from "./cameraMode";
import { ViewportBounds, WorldMinimap } from "./WorldMinimap";
import {
  applyFloorCanvases,
  applyMapAnimation,
  applyOverlayDepthStyle,
  ConnectionLabelData,
  createConnectionLines,
  createMapGroup,
  disposeObject,
  MapSpriteContext,
  setBandVisibility,
  setConnectionLabelsVisible,
  setMonsterTypeVisibility,
  setOverlayVisibility,
  setSelectedMap,
} from "./createWorldScene";
import { overlayPickColor, overlayTooltip, OverlayPick } from "./overlayPick";
import { spawnPoint } from "./parseMaps";
import { MapArtBake } from "./renderMapCanvas";
import { setHoveredOverlay } from "./sceneOverlays";
import {
  DoorTravel,
  MapBand,
  MapFocus,
  OverlayTooltip,
  OverlayVisibility,
  ParsedDoor,
  ParsedMap,
  ViewerMode,
  WorldLayout,
} from "./types";
import {
  computeMapFocusDistance,
  computeWorldBounds,
  computeWorldFocusPose,
  computeWorldFocusPoseAtPoint,
  createWorldCameraControls,
  mapCenterWorld,
  mapPointToWorld,
  updateWorldCameraResetPose,
  WorldCameraControls,
} from "./worldCameraControls";

function applyMapFocus(
  navigation: WorldCameraControls,
  scene: WorldLayout,
  targetFocus: MapFocus,
  viewMode: ViewerMode,
): void {
  const map = scene.maps[targetFocus.mapId];
  const pose = scene.poses[targetFocus.mapId];
  if (!map || !pose) {
    return;
  }
  if (viewMode === "world") {
    navigation.focusOnPose(computeWorldFocusPose(map, pose));
    return;
  }
  const point = mapPointToWorld(pose, targetFocus.x, targetFocus.y);
  const distance = computeMapFocusDistance(map);
  navigation.focusOnPoint(new THREE.Vector3(point.x, point.y, point.z), distance);
}

interface WorldCanvasProps {
  scene: WorldLayout;
  maps: Record<string, ParsedMap>;
  viewMode: ViewerMode;
  overlays: OverlayVisibility;
  selectedMap: string | null;
  focus: MapFocus | null;
  onSelectMap: (mapId: string | null) => void;
  onDoorTravel: (travel: DoorTravel) => void;
  onInspect: (inspect: OverlayPick | null) => void;
  onCursorMove: (cursor: { mapId: string; x: number; y: number } | null) => void;
  mapArt: Record<string, MapArtBake>;
  pixelArt: boolean;
  spriteContext: MapSpriteContext | null;
  hiddenMonsterTypes: Set<string>;
  seeThroughOverlays: boolean;
  monsterDefs?: Record<string, GMonster>;
  fogDensity: number;
  soloBand?: MapBand | null;
}

interface WorldRefs {
  mapsRoot: THREE.Group;
  connections: THREE.Group | null;
  labelData: ConnectionLabelData[];
  threeScene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  navigation: WorldCameraControls;
}

function pickTargets(root: THREE.Object3D): THREE.Object3D[] {
  const targets: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (object.userData.pick || object.userData.isFloor) {
      targets.push(object);
    }
  });
  return targets;
}

function doorTravel(maps: Record<string, ParsedMap>, door: ParsedDoor): DoorTravel | null {
  const dest = spawnPoint(maps, door.toMap, door.destSpawn);
  const destMap = maps[door.toMap];
  if (!dest || !destMap) {
    return null;
  }
  return {
    toMap: door.toMap,
    toX: dest.x,
    toY: dest.y,
    toName: destMap.name,
    lock: door.lock,
  };
}

function hitFromPointer(
  event: MouseEvent,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  mapsRoot: THREE.Group,
  raycaster: THREE.Raycaster,
  pointer: THREE.Vector2,
): THREE.Intersection | undefined {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(pickTargets(mapsRoot), false)[0];
}

function mapGroupFromObject(object: THREE.Object3D): THREE.Object3D | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node.userData.mapId && node.userData.band) {
      return node;
    }
    node = node.parent;
  }
  return null;
}

function objectPick(object: THREE.Object3D): OverlayPick | undefined {
  return object.userData.pick as OverlayPick | undefined;
}

function applyOverlayPick(
  hit: THREE.Intersection,
  maps: Record<string, ParsedMap>,
  onSelectMap: (mapId: string | null) => void,
  onDoorTravel: (travel: DoorTravel) => void,
  onInspect: (inspect: OverlayPick | null) => void,
): void {
  const pick = objectPick(hit.object);
  if (!pick) {
    if (hit.object.userData.isFloor) {
      onSelectMap(
        (hit.object.userData.mapId as string | undefined) ||
          mapGroupFromObject(hit.object)?.userData.mapId ||
          null,
      );
      onInspect(null);
    }
    return;
  }
  if (pick.kind === "door") {
    const travel = doorTravel(maps, pick.door);
    if (travel) {
      onInspect(null);
      onDoorTravel(travel);
    }
    return;
  }
  onInspect(pick);
  onSelectMap(pick.mapId);
}

export function WorldCanvas({
  scene,
  maps,
  viewMode,
  overlays,
  selectedMap,
  focus,
  onSelectMap,
  onDoorTravel,
  onInspect,
  onCursorMove,
  mapArt,
  pixelArt,
  spriteContext,
  hiddenMonsterTypes,
  seeThroughOverlays,
  monsterDefs,
  fogDensity,
  soloBand,
}: WorldCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<WorldRefs | null>(null);
  const mapsRef = useRef(maps);
  mapsRef.current = maps;
  const fogDensityRef = useRef(fogDensity);
  fogDensityRef.current = fogDensity;
  const viewportBoundsRef = useRef<ViewportBounds | null>(null);
  const minimapRef = useRef<{ update: (bounds: ViewportBounds) => void } | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const prevViewModeRef = useRef(viewMode);
  const onSelectRef = useRef(onSelectMap);
  onSelectRef.current = onSelectMap;
  const onDoorTravelRef = useRef(onDoorTravel);
  onDoorTravelRef.current = onDoorTravel;
  const onInspectRef = useRef(onInspect);
  onInspectRef.current = onInspect;
  const onCursorMoveRef = useRef(onCursorMove);
  onCursorMoveRef.current = onCursorMove;
  const pixelArtRef = useRef(pixelArt);
  pixelArtRef.current = pixelArt;
  const mapArtRef = useRef(mapArt);
  mapArtRef.current = mapArt;
  const selectedMapRef = useRef(selectedMap);
  selectedMapRef.current = selectedMap;
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const seeThroughRef = useRef(seeThroughOverlays);
  seeThroughRef.current = seeThroughOverlays;
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  const hiddenMonsterTypesRef = useRef(hiddenMonsterTypes);
  hiddenMonsterTypesRef.current = hiddenMonsterTypes;
  const monsterDefsRef = useRef(monsterDefs);
  monsterDefsRef.current = monsterDefs;
  const [tooltip, setTooltip] = useState<(OverlayTooltip & { x: number; y: number }) | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x101218, 1);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.cursor = "crosshair";
    host.appendChild(renderer.domElement);

    const threeScene = new THREE.Scene();
    applyFog(threeScene, viewModeRef.current, fogDensityRef.current);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.25, 200000);
    const bounds = computeWorldBounds(sceneRef.current);
    const navRef: { current: WorldCameraControls | null } = { current: null };
    const focusCameraOnSelection = () => {
      const navigation = navRef.current;
      const mapId = selectedMapRef.current;
      if (!navigation || !mapId) {
        return;
      }
      const currentLayout = sceneRef.current;
      const map = currentLayout.maps[mapId];
      const pose = currentLayout.poses[mapId];
      if (!map || !pose) {
        return;
      }
      if (viewModeRef.current === "world") {
        navigation.focusOnPose(computeWorldFocusPose(map, pose));
        return;
      }
      const center = mapCenterWorld(map, pose);
      navigation.focusOnPoint(
        new THREE.Vector3(center.x, center.y, center.z),
        computeMapFocusDistance(map),
      );
    };
    const navigation = createWorldCameraControls(
      camera,
      renderer.domElement,
      bounds,
      focusCameraOnSelection,
      viewModeRef.current,
    );
    navRef.current = navigation;

    const mapsRoot = new THREE.Group();
    mapsRoot.name = "maps";
    threeScene.add(mapsRoot);
    worldRef.current = {
      mapsRoot,
      connections: null,
      labelData: [],
      threeScene,
      camera,
      navigation,
    };
    if (focusRef.current) {
      applyMapFocus(navigation, sceneRef.current, focusRef.current, viewModeRef.current);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    resize();
    window.addEventListener("resize", resize);

    const mapCoordsFromHit = (
      hit: THREE.Intersection,
    ): { mapId: string; x: number; y: number } | null => {
      const mapGroup = mapGroupFromObject(hit.object);
      const mapId = (hit.object.userData.mapId || mapGroup?.userData.mapId) as string | undefined;
      if (!mapId || !mapGroup) {
        return null;
      }
      return {
        mapId,
        x: Math.round(hit.point.x - mapGroup.position.x),
        y: Math.round(hit.point.z - mapGroup.position.z),
      };
    };

    let hovered: THREE.Object3D | null = null;
    const onPointerMove = (event: MouseEvent) => {
      if (navigation.isDragging()) {
        hovered = setHoveredOverlay(hovered, null, seeThroughRef.current);
        setTooltip(null);
        renderer.domElement.style.cursor = "grabbing";
        return;
      }
      const hit = hitFromPointer(event, renderer, camera, mapsRoot, raycaster, pointer);
      if (!hit) {
        onCursorMoveRef.current(null);
        hovered = setHoveredOverlay(hovered, null, seeThroughRef.current);
        setTooltip(null);
        renderer.domElement.style.cursor = "crosshair";
        return;
      }
      onCursorMoveRef.current(mapCoordsFromHit(hit));
      const pick = objectPick(hit.object);
      if (!pick) {
        hovered = setHoveredOverlay(hovered, null, seeThroughRef.current);
        setTooltip(null);
        renderer.domElement.style.cursor = "crosshair";
        return;
      }
      hovered = setHoveredOverlay(hovered, hit.object, seeThroughRef.current);
      renderer.domElement.style.cursor = "pointer";
      const hostRect = host.getBoundingClientRect();
      setTooltip({
        ...overlayTooltip(pick, mapsRef.current),
        x: event.clientX - hostRect.left + 14,
        y: event.clientY - hostRect.top + 14,
      });
    };

    const focusCameraOnHit = (hit: THREE.Intersection) => {
      const coords = mapCoordsFromHit(hit);
      if (!coords) {
        return;
      }
      const pose = sceneRef.current.poses[coords.mapId];
      if (!pose) {
        return;
      }
      const point = mapPointToWorld(pose, coords.x, coords.y);
      const map = sceneRef.current.maps[coords.mapId];
      if (viewModeRef.current === "world" && map) {
        navigation.focusOnPose(computeWorldFocusPoseAtPoint(point, computeMapFocusDistance(map)));
        return;
      }
      const keepZoom = cameraMode(viewModeRef.current).keepFocusHeight;
      const distance = keepZoom || !map ? undefined : computeMapFocusDistance(map);
      navigation.focusOnPoint(new THREE.Vector3(point.x, point.y, point.z), distance);
    };

    const onClick = (event: MouseEvent) => {
      if (navigation.isDragging() || navigation.wasDragging()) {
        return;
      }
      const hit = hitFromPointer(event, renderer, camera, mapsRoot, raycaster, pointer);
      if (!hit) {
        onSelectRef.current(null);
        onInspectRef.current(null);
        return;
      }
      applyOverlayPick(
        hit,
        mapsRef.current,
        onSelectRef.current,
        onDoorTravelRef.current,
        onInspectRef.current,
      );
    };

    const onDoubleClick = (event: MouseEvent) => {
      const hit = hitFromPointer(event, renderer, camera, mapsRoot, raycaster, pointer);
      if (!hit?.object.userData.isFloor) {
        return;
      }
      focusCameraOnHit(hit);
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("dblclick", onDoubleClick);

    let frame = 0;
    const inception = performance.now();
    let lastViewportUpdate = 0;
    const frustumHelper = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    const computeViewport = (now: number): void => {
      if (now - lastViewportUpdate < 100) {
        return;
      }
      lastViewportUpdate = now;
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustumHelper.setFromProjectionMatrix(projScreenMatrix);
      const { target } = navigation.controls;
      const dist = camera.position.distanceTo(target);
      const vFov = (camera.fov * Math.PI) / 180;
      const halfH = Math.tan(vFov / 2) * dist;
      const halfW = halfH * camera.aspect;
      const vp: ViewportBounds = {
        minX: target.x - halfW,
        maxX: target.x + halfW,
        minZ: target.z - halfH,
        maxZ: target.z + halfH,
      };
      viewportBoundsRef.current = vp;
      minimapRef.current?.update(vp);
    };
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const now = performance.now();
      if (pixelArtRef.current) {
        applyMapAnimation(mapsRoot, now - inception);
      }
      navigation.controls.update();
      computeViewport(now);
      renderer.render(threeScene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      navigation.dispose();
      disposeObject(threeScene);
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    const { mapsRoot, threeScene } = world;

    while (mapsRoot.children.length > 0) {
      const child = mapsRoot.children[0];
      mapsRoot.remove(child);
      disposeObject(child);
    }
    if (world.connections) {
      threeScene.remove(world.connections);
      disposeObject(world.connections);
      world.connections = null;
    }

    for (const [id, map] of Object.entries(scene.maps)) {
      const pose = scene.poses[id];
      if (!pose) {
        continue;
      }
      mapsRoot.add(createMapGroup(map, pose, spriteContext || undefined, monsterDefsRef.current));
    }

    if (scene.connections.length > 0) {
      const result = createConnectionLines(scene);
      threeScene.add(result.group);
      world.connections = result.group;
      world.labelData = result.labelData;
    }

    applyFloorCanvases(mapsRoot, mapArtRef.current, pixelArtRef.current, 0);
    setSelectedMap(mapsRoot, selectedMapRef.current);
    setOverlayVisibility(mapsRoot, overlaysRef.current);
    setMonsterTypeVisibility(mapsRoot, hiddenMonsterTypesRef.current);
    applyOverlayDepthStyle(mapsRoot, seeThroughRef.current);
  }, [scene, spriteContext]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    setOverlayVisibility(world.mapsRoot, overlays);
    setMonsterTypeVisibility(world.mapsRoot, hiddenMonsterTypes);
    applyOverlayDepthStyle(world.mapsRoot, seeThroughOverlays);
  }, [overlays, hiddenMonsterTypes, seeThroughOverlays]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    applyFloorCanvases(world.mapsRoot, mapArt, pixelArt, 0);
    setSelectedMap(world.mapsRoot, selectedMap);
  }, [mapArt, pixelArt, selectedMap]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    updateWorldCameraResetPose(world.navigation.controls, computeWorldBounds(scene), viewMode);
  }, [scene, viewMode]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    applyFog(world.threeScene, viewMode, fogDensityRef.current);
    if (prevViewModeRef.current === viewMode) {
      return;
    }
    prevViewModeRef.current = viewMode;
    world.navigation.setViewMode(viewMode, computeWorldBounds(sceneRef.current), {
      resetCamera: viewMode !== "world" || !selectedMapRef.current,
    });
  }, [viewMode]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    applyFog(world.threeScene, viewMode, fogDensity);
  }, [fogDensity, viewMode]);

  /** Consolidated scene-state sync: applies all scene-graph mutations that depend on props. */
  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    if (focus) {
      applyMapFocus(world.navigation, scene, focus, viewMode);
    }
    setSelectedMap(world.mapsRoot, selectedMap);
    setBandVisibility(
      world.mapsRoot,
      world.connections,
      world.labelData,
      viewMode === "world" ? soloBand ?? null : null,
      maps,
    );
    setConnectionLabelsVisible(world.connections, viewMode === "world");
  }, [scene, focus, viewMode, selectedMap, soloBand, maps]);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 480,
        overflow: "hidden",
        borderRadius: 8,
        position: "relative",
        background: "#101218",
      }}
    >
      {viewMode === "world" && <WorldMinimap ref={minimapRef} layout={scene} maps={maps} />}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            maxWidth: 260,
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.82)",
            color: overlayPickColor(tooltip.kind),
            fontSize: 13,
            lineHeight: 1.35,
            whiteSpace: "pre-wrap",
            zIndex: 3,
            pointerEvents: "none",
            transform: "translate(-8px, 0)",
          }}
        >
          <div>{tooltip.title}</div>
          <div style={{ opacity: 0.75, color: "#fff", fontSize: 11 }}>{tooltip.hint}</div>
        </div>
      )}
    </div>
  );
}
