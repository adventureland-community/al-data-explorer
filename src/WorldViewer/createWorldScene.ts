import * as THREE from "three";
import { GMonster } from "typed-adventureland";
import {
  FLOOR_INDOOR_COLOR,
  FLOOR_OUTSIDE_COLOR,
  FLOOR_UNDERGROUND_COLOR,
  ONE_WAY_CONNECTION_COLOR,
  SELECTED_FLOOR_COLOR,
  TWO_WAY_CONNECTION_COLOR,
} from "./overlayColors";
import { applyFloorCanvases, applyMapAnimation, floorHasMapArt, tintFloorArt } from "./sceneMapArt";
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

function mapSizedPlane(map: ParsedMap, y: number, material: THREE.MeshBasicMaterial): THREE.Mesh {
  const width = Math.max(map.artMaxX - map.artMinX, 8);
  const height = Math.max(map.artMaxY - map.artMinY, 8);
  const geometry = new THREE.PlaneGeometry(width, height);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((map.artMinX + map.artMaxX) / 2, y, (map.artMinY + map.artMaxY) / 2);
  return mesh;
}

function makeDepthOccluder(map: ParsedMap): THREE.Mesh {
  const mesh = mapSizedPlane(
    map,
    -0.5,
    new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
    }),
  );
  mesh.userData.isDepthOccluder = true;
  mesh.renderOrder = -2;
  return mesh;
}

function makeFloor(map: ParsedMap): THREE.Mesh {
  const mesh = mapSizedPlane(
    map,
    0,
    new THREE.MeshBasicMaterial({
      color: floorColor(map.band),
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
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
  monsterDefs?: Record<string, GMonster>,
): THREE.Group {
  const group = new THREE.Group();
  group.name = map.id;
  group.userData.mapId = map.id;
  group.userData.band = map.band;
  applyMapPose(group, pose);

  group.add(makeDepthOccluder(map));
  const floor = makeFloor(map);
  group.add(floor);

  const overlays = buildMapOverlays(map, monsterDefs);
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

function createTextSprite(text: string, color = "#fff"): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 24px sans-serif";
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width) + 8;
  canvas.height = 32;
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 4, 16);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.7,
    depthTest: false,
    fog: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width * 2, canvas.height * 2, 1);
  sprite.userData.disposeTexture = texture;
  return sprite;
}

export interface ConnectionEndpoints {
  from: [number, number, number];
  to: [number, number, number];
}

export interface ConnectionLabelData {
  fromMap: string;
  toMap: string;
  endpoints: ConnectionEndpoints;
}

export interface ConnectionsResult {
  group: THREE.Group;
  labelData: ConnectionLabelData[];
}

export function createConnectionLines(layout: WorldLayout): ConnectionsResult {
  const group = new THREE.Group();
  group.name = "connections";
  group.frustumCulled = false;
  const twoWay: number[] = [];
  const oneWay: number[] = [];
  const labelData: ConnectionLabelData[] = [];

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
    const from: [number, number, number] = [
      fromPose.x + connection.fromX,
      fromPose.z + 16,
      fromPose.y + connection.fromY,
    ];
    const to: [number, number, number] = [toPose.x + toX, toPose.z + 16, toPose.y + toY];
    const target = connection.twoWay ? twoWay : oneWay;
    target.push(from[0], from[1], from[2], to[0], to[1], to[2]);
    labelData.push({
      fromMap: connection.fromMap,
      toMap: connection.toMap,
      endpoints: { from, to },
    });
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
      depthTest: false,
      fog: false,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.name = name;
    lines.frustumCulled = false;
    lines.renderOrder = 40;
    group.add(lines);
  };

  addLines(twoWay, TWO_WAY_CONNECTION_COLOR, "twoWay");
  addLines(oneWay, ONE_WAY_CONNECTION_COLOR, "oneWay");

  const labels = new THREE.Group();
  labels.name = "connectionLabels";
  for (const data of labelData) {
    const destName = layout.maps[data.toMap]?.name ?? data.toMap;
    const sprite = createTextSprite(destName);
    const { from, to } = data.endpoints;
    sprite.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
    labels.add(sprite);
  }
  group.add(labels);

  return { group, labelData };
}

export function setConnectionLabelsVisible(
  connectionsGroup: THREE.Group | null,
  visible: boolean,
): void {
  if (!connectionsGroup) {
    return;
  }
  const labels = connectionsGroup.getObjectByName("connectionLabels");
  if (labels) {
    labels.visible = visible;
  }
}

export function disposeObject(object: THREE.Object3D): void {
  const disposed = new Set<THREE.Texture>();
  object.traverse((child) => {
    const texture = child.userData.disposeTexture as THREE.Texture | undefined;
    if (texture && !disposed.has(texture)) {
      disposed.add(texture);
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
        if (mapped && !disposed.has(mapped)) {
          disposed.add(mapped);
          mapped.dispose();
        }
        if (mapped) {
          (item as THREE.MeshBasicMaterial).map = null;
        }
        item.dispose();
      }
    }
  });
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
    if (floorHasMapArt(object)) {
      tintFloorArt(object, map === mapId);
      material.opacity = 1;
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

export function setBandVisibility(
  mapsRoot: THREE.Group,
  connectionsGroup: THREE.Group | null,
  labelData: ConnectionLabelData[],
  soloBand: MapBand | null,
  maps: Record<string, ParsedMap>,
): void {
  for (const child of mapsRoot.children) {
    const band = child.userData.band as MapBand | undefined;
    child.visible = !soloBand || band === soloBand;
  }
  if (!connectionsGroup) {
    return;
  }
  const labels = connectionsGroup.getObjectByName("connectionLabels");
  if (labels) {
    for (let i = 0; i < labels.children.length; i += 1) {
      const sprite = labels.children[i];
      const data = labelData[i];
      if (!soloBand || !data) {
        sprite.visible = !soloBand;
        continue;
      }
      const fromBand = maps[data.fromMap]?.band;
      const toBand = maps[data.toMap]?.band;
      sprite.visible = fromBand === soloBand && toBand === soloBand;
    }
  }
}
