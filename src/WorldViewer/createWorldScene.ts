import * as THREE from "three";
import {
  FLOOR_INDOOR_COLOR,
  FLOOR_OUTSIDE_COLOR,
  FLOOR_UNDERGROUND_COLOR,
  ONE_WAY_CONNECTION_COLOR,
  overlayColor,
  SELECTED_FLOOR_COLOR,
  TWO_WAY_CONNECTION_COLOR,
} from "./overlayColors";
import { MapBand, OverlayKind, OverlayVisibility, ParsedMap, WorldLayout } from "./types";

const LIFT: Record<OverlayKind, number> = {
  bounds: 2,
  zones: 3,
  monsters: 4,
  quirks: 6,
  doors: 8,
  spawns: 10,
  npcs: 12,
};

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

function makeRectMesh(
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  lift: number,
  opacity: number,
  bottomCentered = false,
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(Math.max(width, 2), Math.max(height, 2));
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const centerY = bottomCentered ? y - height / 2 : y;
  mesh.position.set(x, lift, centerY);
  return mesh;
}

function makePolygonMesh(
  polygon: Array<[number, number]>,
  color: number,
  lift: number,
  opacity: number,
): THREE.Mesh | null {
  if (polygon.length < 3) {
    return null;
  }
  const shape = new THREE.Shape();
  shape.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i += 1) {
    shape.lineTo(polygon[i][0], polygon[i][1]);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = lift;
  return mesh;
}

function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "32px sans-serif";
    context.fillStyle = "rgba(0,0,0,0.55)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(240, 30, 1);
  sprite.userData.disposeTexture = texture;
  return sprite;
}

function boundsLines(map: ParsedMap): THREE.LineSegments {
  const positions: number[] = [];
  const lift = LIFT.bounds;
  for (const [x, y1, y2] of map.xLines) {
    positions.push(x, lift, y1, x, lift, y2);
  }
  for (const [y, x1, x2] of map.yLines) {
    positions.push(x1, lift, y, x2, lift, y);
  }
  if (positions.length === 0) {
    const { minX, maxX, minY, maxY } = map;
    positions.push(
      minX,
      lift,
      minY,
      maxX,
      lift,
      minY,
      maxX,
      lift,
      minY,
      maxX,
      lift,
      maxY,
      maxX,
      lift,
      maxY,
      minX,
      lift,
      maxY,
      minX,
      lift,
      maxY,
      minX,
      lift,
      minY,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: overlayColor("bounds"),
    transparent: true,
    opacity: 0.7,
  });
  return new THREE.LineSegments(geometry, material);
}

function overlayGroup(kind: OverlayKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `overlay:${kind}`;
  group.userData.overlayKind = kind;
  return group;
}

function buildMapOverlays(map: ParsedMap): THREE.Group[] {
  const bounds = overlayGroup("bounds");
  bounds.add(boundsLines(map));

  const doors = overlayGroup("doors");
  for (const door of map.doors) {
    const mesh = makeRectMesh(
      door.x,
      door.y,
      door.width,
      door.height,
      overlayColor("doors"),
      LIFT.doors,
      0.45,
      true,
    );
    mesh.userData.label = `To ${door.toMap}`;
    doors.add(mesh);
  }

  const spawns = overlayGroup("spawns");
  for (const spawn of map.spawns) {
    spawns.add(makeRectMesh(spawn.x, spawn.y, 14, 14, overlayColor("spawns"), LIFT.spawns, 0.7));
  }

  const quirks = overlayGroup("quirks");
  for (const quirk of map.quirks) {
    const mesh = makeRectMesh(
      quirk.x,
      quirk.y,
      quirk.width,
      quirk.height,
      overlayColor("quirks"),
      LIFT.quirks,
      0.4,
      true,
    );
    mesh.userData.label = quirk.text || quirk.kind;
    quirks.add(mesh);
  }

  const npcs = overlayGroup("npcs");
  for (const npc of map.npcs) {
    const mesh = makeRectMesh(npc.x, npc.y, 16, 16, overlayColor("npcs"), LIFT.npcs, 0.8);
    mesh.userData.label = npc.label;
    npcs.add(mesh);
  }

  const monsters = overlayGroup("monsters");
  for (const monster of map.monsters) {
    let mesh: THREE.Object3D | null = null;
    if (monster.polygon) {
      mesh = makePolygonMesh(monster.polygon, overlayColor("monsters"), LIFT.monsters, 0.22);
    } else if (monster.radius) {
      const geometry = new THREE.CircleGeometry(monster.radius, 24);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({
        color: overlayColor("monsters"),
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(monster.x, LIFT.monsters, monster.y);
    } else {
      mesh = makeRectMesh(
        monster.x,
        monster.y,
        monster.width,
        monster.height,
        overlayColor("monsters"),
        LIFT.monsters,
        0.22,
      );
    }
    if (mesh) {
      mesh.userData.label = monster.type;
      monsters.add(mesh);
    }
  }

  const zones = overlayGroup("zones");
  for (const zone of map.zones) {
    const mesh = makePolygonMesh(zone.polygon, overlayColor("zones"), LIFT.zones, 0.18);
    if (mesh) {
      mesh.userData.label = zone.type;
      zones.add(mesh);
    }
  }

  return [bounds, doors, spawns, quirks, npcs, monsters, zones];
}

function makeFloor(map: ParsedMap): THREE.Mesh {
  const width = Math.max(map.maxX - map.minX, 8);
  const height = Math.max(map.maxY - map.minY, 8);
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
  mesh.position.set((map.minX + map.maxX) / 2, 0, (map.minY + map.maxY) / 2);
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
): THREE.Group {
  const group = new THREE.Group();
  group.name = map.id;
  group.userData.mapId = map.id;
  group.userData.band = map.band;
  applyMapPose(group, pose);

  const floor = makeFloor(map);
  group.add(floor);

  const overlays = buildMapOverlays(map);
  for (const overlay of overlays) {
    group.add(overlay);
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
    if (!fromPose || !toPose) {
      continue;
    }
    const from = [fromPose.x + connection.fromX, fromPose.z + 16, fromPose.y + connection.fromY];
    const to = [toPose.x + connection.toX, toPose.z + 16, toPose.y + connection.toY];
    const target = connection.twoWay ? twoWay : oneWay;
    target.push(from[0], from[1], from[2], to[0], to[1], to[2]);
  }

  const addLines = (positions: number[], color: number, name: string) => {
    if (positions.length === 0) {
      return;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const lines = new THREE.LineSegments(geometry, material);
    lines.name = name;
    group.add(lines);
  };

  addLines(twoWay, TWO_WAY_CONNECTION_COLOR, "twoWay");
  addLines(oneWay, ONE_WAY_CONNECTION_COLOR, "oneWay");
  return group;
}

export function setOverlayVisibility(root: THREE.Object3D, visibility: OverlayVisibility): void {
  root.traverse((object) => {
    const kind = object.userData.overlayKind as OverlayKind | undefined;
    if (kind) {
      object.visible = visibility[kind];
    }
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
      if (Array.isArray(material)) {
        for (const item of material) {
          item.dispose();
        }
      } else if (material) {
        material.dispose();
      }
    }
  });
}
