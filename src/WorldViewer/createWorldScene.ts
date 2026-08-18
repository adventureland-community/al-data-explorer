import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer";
import {
  FLOOR_INDOOR_COLOR,
  FLOOR_OUTSIDE_COLOR,
  FLOOR_UNDERGROUND_COLOR,
  ONE_WAY_CONNECTION_COLOR,
  SELECTED_FLOOR_COLOR,
  TWO_WAY_CONNECTION_COLOR,
} from "./overlayColors";
import { applyFloorCanvases, applyMapAnimation, mapArtOf } from "./sceneMapArt";
import {
  applyOverlayDepthStyle,
  buildMapOverlays,
  makeLabelSprite,
  setOverlayVisibility,
} from "./sceneOverlays";
import { buildMapSprites, type MapSpriteContext } from "./sceneSprites";
import { MapBand, ParsedMap, WorldLayout } from "./types";

export type { MapSpriteContext };
export { applyFloorCanvases, applyMapAnimation, applyOverlayDepthStyle, setOverlayVisibility };

const CONNECTION_LINE_OPACITY = 0.85;

function floorColor(band: MapBand): number {
  switch (band) {
    case "overworld":
      return FLOOR_OUTSIDE_COLOR;
    case "indoor":
      return FLOOR_INDOOR_COLOR;
    case "underground":
      return FLOOR_UNDERGROUND_COLOR;
    default: {
      const exhaustive: never = band;
      return exhaustive;
    }
  }
}

function makeDepthOccluder(map: ParsedMap): THREE.Mesh {
  const width = Math.max(map.artMaxX - map.artMinX, 8);
  const height = Math.max(map.artMaxY - map.artMinY, 8);
  const geometry = new THREE.PlaneGeometry(width, height);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((map.artMinX + map.artMaxX) / 2, -0.5, (map.artMinY + map.artMaxY) / 2);
  mesh.userData.isDepthOccluder = true;
  mesh.renderOrder = -2;
  return mesh;
}

function makeFloor(map: ParsedMap): THREE.Mesh {
  const width = Math.max(map.artMaxX - map.artMinX, 8);
  const height = Math.max(map.artMaxY - map.artMinY, 8);
  const geometry = new THREE.PlaneGeometry(width, height);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: floorColor(map.band),
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((map.artMinX + map.artMaxX) / 2, 0, (map.artMinY + map.artMaxY) / 2);
  mesh.userData.mapId = map.id;
  mesh.userData.isFloor = true;
  return mesh;
}

export function applyMapPose(group: THREE.Group, pose: { x: number; y: number; z: number }): void {
  group.position.set(pose.x, pose.z, pose.y);
}

export function createMapGroup(
  map: ParsedMap,
  pose: { x: number; y: number; z: number },
  spriteContext?: MapSpriteContext,
): THREE.Group {
  const group = new THREE.Group();
  group.name = map.id;
  group.userData.mapId = map.id;
  group.userData.band = map.band;
  applyMapPose(group, pose);

  group.add(makeDepthOccluder(map));
  const floor = makeFloor(map);
  group.add(floor);

  const overlays = buildMapOverlays(map);
  for (const overlay of overlays) {
    group.add(overlay);
  }

  if (spriteContext) {
    const sprites = buildMapSprites(map, spriteContext);
    sprites.renderOrder = 20;
    group.add(sprites);
  }

  const label = makeLabelSprite(`${map.name} (${map.id})`);
  label.position.set((map.minX + map.maxX) / 2, 36, map.minY);
  group.add(label);

  return group;
}

export function createConnectionLines(layout: WorldLayout): THREE.Group {
  const group = new THREE.Group();
  group.name = "connections";
  const twoWay: number[] = [];
  const oneWay: number[] = [];

  for (const connection of layout.connections) {
    const fromPose = layout.poses[connection.fromMap];
    const toPose = layout.poses[connection.toMap];
    const toMap = layout.maps[connection.toMap];
    if (!fromPose || !toPose || !toMap) {
      continue;
    }
    const reverseDoor = toMap.doors.find((door) => door.toMap === connection.fromMap);
    const { x: toX = connection.toX, y: toY = connection.toY } = reverseDoor || {
      x: connection.toX,
      y: connection.toY,
    };
    const from = [fromPose.x + connection.fromX, fromPose.z + 16, fromPose.y + connection.fromY];
    const to = [toPose.x + toX, toPose.z + 16, toPose.y + toY];
    const target = connection.twoWay ? twoWay : oneWay;
    target.push(from[0], from[1], from[2], to[0], to[1], to[2]);
  }

  const addLines = (positions: number[], color: number, name: string) => {
    if (positions.length === 0) {
      return;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: CONNECTION_LINE_OPACITY,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.name = name;
    group.add(lines);
  };

  addLines(twoWay, TWO_WAY_CONNECTION_COLOR, "twoWay");
  addLines(oneWay, ONE_WAY_CONNECTION_COLOR, "oneWay");
  return group;
}

export function setMonsterTypeVisibility(root: THREE.Object3D, hiddenTypes: Set<string>): void {
  root.traverse((object) => {
    const monsterType = object.userData.monsterType as string | undefined;
    if (!monsterType) {
      return;
    }
    const overlayVisible = object.parent?.visible !== false;
    object.visible = overlayVisible && !hiddenTypes.has(monsterType);
  });
}

export function setSelectedMap(root: THREE.Object3D, mapId: string | null): void {
  root.traverse((object) => {
    if (!object.userData.isFloor || !(object instanceof THREE.Mesh)) {
      return;
    }
    const material = object.material as THREE.MeshBasicMaterial;
    const map = object.parent?.userData.mapId as string | undefined;
    const parsedBand = object.parent?.userData.band as MapBand | undefined;
    const art = mapArtOf(object);
    const hasArt = Boolean(art?.visible);
    if (art?.element) {
      art.element.style.filter = map === mapId ? "brightness(1.18)" : "none";
    }
    if (hasArt) {
      material.opacity = 0;
      return;
    }
    if (map === mapId) {
      material.color.setHex(SELECTED_FLOOR_COLOR);
      material.opacity = 0.75;
      return;
    }
    const band = parsedBand || "overworld";
    material.color.setHex(floorColor(band));
    material.opacity = 0.55;
  });
}

export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child.userData.isMapArt && child instanceof CSS3DObject) {
      child.element.remove();
    }
    if (child.userData.isMapSprite && child instanceof CSS3DObject) {
      child.element.remove();
    }
    const texture = child.userData.disposeTexture as THREE.Texture | undefined;
    if (texture) {
      texture.dispose();
    }
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.LineSegments ||
      child instanceof THREE.Sprite
    ) {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
      }
      const { material } = child;
      const materials = Array.isArray(material) ? material : material ? [material] : [];
      for (const item of materials) {
        const mapped = (item as THREE.MeshBasicMaterial).map;
        if (mapped && !mapped.userData.keep) {
          mapped.dispose();
        }
        if (mapped && mapped.userData.keep) {
          (item as THREE.MeshBasicMaterial).map = null;
        }
        item.dispose();
      }
    }
  });
}
