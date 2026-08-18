import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  createConnectionLines,
  createMapGroup,
  disposeObject,
  setOverlayVisibility,
  setSelectedMap,
} from "./createWorldScene";
import { OverlayVisibility, WorldLayout } from "./types";

interface WorldCanvasProps {
  layout: WorldLayout;
  overlays: OverlayVisibility;
  selectedMap: string | null;
  onSelectMap: (mapId: string | null) => void;
}

interface WorldRefs {
  mapsRoot: THREE.Group;
  connections: THREE.Group | null;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
}

export function WorldCanvas({ layout, overlays, selectedMap, onSelectMap }: WorldCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<WorldRefs | null>(null);
  const onSelectRef = useRef(onSelectMap);
  onSelectRef.current = onSelectMap;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x101218);
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
    worldRef.current = { mapsRoot, connections: null, scene, camera, controls };

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

    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const floors: THREE.Object3D[] = [];
      mapsRoot.traverse((object) => {
        if (object.userData.isFloor) {
          floors.push(object);
        }
      });
      const hits = raycaster.intersectObjects(floors, false);
      const mapId = hits[0]?.object.userData.mapId as string | undefined;
      onSelectRef.current(mapId || null);
    };
    renderer.domElement.addEventListener("click", onClick);

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      disposeObject(scene);
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
      mapsRoot.add(createMapGroup(map, pose));
    }

    const connections = createConnectionLines(layout);
    scene.add(connections);
    world.connections = connections;
  }, [layout]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    setOverlayVisibility(world.mapsRoot, overlays);
  }, [layout, overlays]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) {
      return;
    }
    setSelectedMap(world.mapsRoot, selectedMap);
    if (!selectedMap) {
      return;
    }
    const map = layout.maps[selectedMap];
    const pose = layout.poses[selectedMap];
    if (!map || !pose) {
      return;
    }
    const x = pose.x + (map.minX + map.maxX) / 2;
    const y = pose.z;
    const z = pose.y + (map.minY + map.maxY) / 2;
    world.controls.target.set(x, y, z);
  }, [layout, selectedMap]);

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", height: "100%", minHeight: 480, overflow: "hidden", borderRadius: 8 }}
    />
  );
}
