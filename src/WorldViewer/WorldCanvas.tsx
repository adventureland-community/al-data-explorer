import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer";
import {
  applyFloorCanvases,
  applyMapAnimation,
  applyOverlayDepthStyle,
  createConnectionLines,
  createMapGroup,
  disposeObject,
  MapSpriteContext,
  setMonsterTypeVisibility,
  setOverlayVisibility,
  setSelectedMap,
} from "./createWorldScene";
import { spawnPoint } from "./parseMaps";
import { MapArtBake } from "./renderMapCanvas";
import {
  DoorTravel,
  MapFocus,
  MonsterSelection,
  NpcFeature,
  NpcSelection,
  OverlayVisibility,
  ParsedDoor,
  WorldLayout,
} from "./types";

interface WorldCanvasProps {
  layout: WorldLayout;
  overlays: OverlayVisibility;
  selectedMap: string | null;
  focus: MapFocus | null;
  onSelectMap: (mapId: string | null) => void;
  onDoorTravel: (travel: DoorTravel) => void;
  onNpcSelect: (npc: NpcSelection | null) => void;
  onMonsterSelect: (monster: MonsterSelection | null) => void;
  onCursorMove: (cursor: { mapId: string; x: number; y: number } | null) => void;
  mapArt: Record<string, MapArtBake>;
  pixelArt: boolean;
  spriteContext: MapSpriteContext | null;
  hiddenMonsterTypes: Set<string>;
  seeThroughOverlays: boolean;
}

interface WorldRefs {
  mapsRoot: THREE.Group;
  connections: THREE.Group | null;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  cssRenderer: CSS3DRenderer;
}

function pickTargets(root: THREE.Object3D): THREE.Object3D[] {
  const targets: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (object.userData.pickKind || object.userData.isFloor) {
      targets.push(object);
    }
  });
  return targets;
}

function doorTravel(layout: WorldLayout, mapId: string, door: ParsedDoor): DoorTravel | null {
  const dest = spawnPoint(layout.maps, door.toMap, door.destSpawn);
  const destMap = layout.maps[door.toMap];
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

export function WorldCanvas({
  layout,
  overlays,
  selectedMap,
  focus,
  onSelectMap,
  onDoorTravel,
  onNpcSelect,
  onMonsterSelect,
  onCursorMove,
  mapArt,
  pixelArt,
  spriteContext,
  hiddenMonsterTypes,
  seeThroughOverlays,
}: WorldCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<WorldRefs | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const onSelectRef = useRef(onSelectMap);
  onSelectRef.current = onSelectMap;
  const onDoorTravelRef = useRef(onDoorTravel);
  onDoorTravelRef.current = onDoorTravel;
  const onNpcSelectRef = useRef(onNpcSelect);
  onNpcSelectRef.current = onNpcSelect;
  const onMonsterSelectRef = useRef(onMonsterSelect);
  onMonsterSelectRef.current = onMonsterSelect;
  const onCursorMoveRef = useRef(onCursorMove);
  onCursorMoveRef.current = onCursorMove;
  const pixelArtRef = useRef(pixelArt);
  pixelArtRef.current = pixelArt;
  const [hoveredDoor, setHoveredDoor] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.domElement.style.position = "absolute";
    cssRenderer.domElement.style.inset = "0";
    cssRenderer.domElement.style.pointerEvents = "none";
    host.appendChild(cssRenderer.domElement);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x101218, 0);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.cursor = "crosshair";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x101218, 6000, 18000);

    const camera = new THREE.PerspectiveCamera(55, 1, 2, 40000);
    camera.position.set(400, 2200, 1800);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(200, 0, 200);

    const mapsRoot = new THREE.Group();
    mapsRoot.name = "maps";
    scene.add(mapsRoot);
    worldRef.current = { mapsRoot, connections: null, scene, camera, controls, cssRenderer };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      cssRenderer.setSize(width, height);
    };
    resize();
    window.addEventListener("resize", resize);

    const mapCoordsFromHit = (
      hit: THREE.Intersection,
    ): { mapId: string; x: number; y: number } | null => {
      const mapGroup = hit.object.parent;
      const mapId = (hit.object.userData.mapId || mapGroup?.userData.mapId) as string | undefined;
      if (!mapId || !mapGroup) {
        return null;
      }
      return {
        mapId,
        x: Math.round(hit.point.x - mapGroup.position.x),
        y: Math.round(hit.point.z - mapGroup.position.y),
      };
    };

    const onPointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickTargets(mapsRoot), false);
      const hit = hits[0];
      if (!hit) {
        onCursorMoveRef.current(null);
        setHoveredDoor(null);
        renderer.domElement.style.cursor = "crosshair";
        return;
      }
      const coords = mapCoordsFromHit(hit);
      onCursorMoveRef.current(coords);
      if (hit.object.userData.pickKind === "door") {
        const door = hit.object.userData.door as ParsedDoor;
        setHoveredDoor(`${door.toMap}`);
        renderer.domElement.style.cursor = "pointer";
        return;
      }
      setHoveredDoor(null);
      renderer.domElement.style.cursor = hit.object.userData.pickKind ? "pointer" : "crosshair";
    };

    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickTargets(mapsRoot), false);
      const hit = hits[0];
      if (!hit) {
        onSelectRef.current(null);
        return;
      }

      const pickKind = hit.object.userData.pickKind as string | undefined;
      const mapId = hit.object.userData.mapId as string | undefined;

      if (pickKind === "door" && mapId) {
        const door = hit.object.userData.door as ParsedDoor;
        const travel = doorTravel(layoutRef.current, mapId, door);
        if (travel) {
          onDoorTravelRef.current(travel);
        }
        return;
      }

      if (pickKind === "npc" && mapId) {
        const npc = hit.object.userData.npc as NpcFeature;
        onNpcSelectRef.current({
          mapId,
          id: npc.id,
          name: npc.name || npc.label,
          skin: npc.skin,
          x: npc.x,
          y: npc.y,
        });
        onSelectRef.current(mapId);
        return;
      }

      if (pickKind === "monster" && mapId) {
        const monsterType = hit.object.userData.monsterType as string;
        const monster = hit.object.userData.monster as { x: number; y: number };
        onMonsterSelectRef.current({
          mapId,
          type: monsterType,
          x: monster.x,
          y: monster.y,
        });
        onSelectRef.current(mapId);
        return;
      }

      if (hit.object.userData.isFloor) {
        onSelectRef.current(mapId || null);
        onNpcSelectRef.current(null);
        onMonsterSelectRef.current(null);
      }
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);

    let frame = 0;
    const inception = performance.now();
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (pixelArtRef.current) {
        applyMapAnimation(mapsRoot, performance.now() - inception);
      }
      controls.update();
      cssRenderer.render(scene, camera);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      if (cssRenderer.domElement.parentElement === host) {
        host.removeChild(cssRenderer.domElement);
      }
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
    const { mapsRoot, scene } = world;

    while (mapsRoot.children.length > 0) {
      const child = mapsRoot.children[0];
      mapsRoot.remove(child);
      disposeObject(child);
    }
    if (world.connections) {
      scene.remove(world.connections);
      disposeObject(world.connections);
      world.connections = null;
    }

    for (const [id, map] of Object.entries(layout.maps)) {
      const pose = layout.poses[id];
      if (!pose) {
        continue;
      }
      mapsRoot.add(createMapGroup(map, pose, spriteContext || undefined));
    }

    const connections = createConnectionLines(layout);
    scene.add(connections);
    world.connections = connections;
    applyOverlayDepthStyle(mapsRoot, seeThroughOverlays);
  }, [layout, spriteContext, seeThroughOverlays]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    setOverlayVisibility(world.mapsRoot, overlays);
    setMonsterTypeVisibility(world.mapsRoot, hiddenMonsterTypes);
    applyOverlayDepthStyle(world.mapsRoot, seeThroughOverlays);
  }, [layout, overlays, hiddenMonsterTypes, seeThroughOverlays]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    applyFloorCanvases(world.mapsRoot, mapArt, pixelArt, 0);
    setSelectedMap(world.mapsRoot, selectedMap);
  }, [layout, mapArt, pixelArt, selectedMap]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world || !focus) {
      return;
    }
    const map = layout.maps[focus.mapId];
    const pose = layout.poses[focus.mapId];
    if (!map || !pose) {
      return;
    }
    const x = pose.x + focus.x;
    const y = pose.z;
    const z = pose.y + focus.y;
    world.controls.target.set(x, y, z);
  }, [layout, focus]);

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
      {hoveredDoor && (
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.72)",
            color: "#33ff66",
            fontSize: 13,
            pointerEvents: "none",
          }}
        >
          Click to enter {hoveredDoor}
        </div>
      )}
    </div>
  );
}
