import * as THREE from "three";
import { overlayColor } from "./overlayColors";
import { OverlayKind, OverlayVisibility, ParsedMap } from "./types";

export const SEE_THROUGH_OVERLAY_OPACITY = 0.38;

/** Default debug overlay opacities (zinals-style). */
const OVERLAY_FILL_OPACITY: Record<Exclude<OverlayKind, "bounds" | "npcs">, number> = {
  zones: 0.18,
  monsters: 0.22,
  quirks: 0.4,
  doors: 0.45,
  spawns: 0.7,
};

const BOUNDS_LINE_OPACITY = 0.7;

function markOverlayMesh(mesh: THREE.Object3D, lift: number, baseOpacity: number): void {
  mesh.userData.isOverlayMesh = true;
  mesh.userData.overlayLift = lift;
  mesh.userData.baseOpacity = baseOpacity;
  mesh.renderOrder = lift;
}

const LIFT: Record<OverlayKind, number> = {
  bounds: 2,
  zones: 3,
  monsters: 4,
  quirks: 6,
  doors: 8,
  spawns: 10,
  npcs: 12,
};

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
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
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
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = lift;
  return mesh;
}

export function makeLabelSprite(text: string): THREE.Sprite {
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
    const { artMinX, artMaxX, artMinY, artMaxY } = map;
    positions.push(
      artMinX,
      lift,
      artMinY,
      artMaxX,
      lift,
      artMinY,
      artMaxX,
      lift,
      artMinY,
      artMaxX,
      lift,
      artMaxY,
      artMaxX,
      lift,
      artMaxY,
      artMinX,
      lift,
      artMaxY,
      artMinX,
      lift,
      artMaxY,
      artMinX,
      lift,
      artMinY,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: overlayColor("bounds"),
    transparent: true,
    opacity: BOUNDS_LINE_OPACITY,
    depthWrite: false,
    depthTest: true,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.userData.isOverlayLine = true;
  lines.userData.overlayLift = lift;
  lines.userData.baseOpacity = BOUNDS_LINE_OPACITY;
  lines.renderOrder = lift;
  return lines;
}

function overlayGroup(kind: OverlayKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `overlay:${kind}`;
  group.userData.overlayKind = kind;
  return group;
}

function makePickMesh(
  x: number,
  y: number,
  width: number,
  height: number,
  lift: number,
  bottomCentered = false,
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(Math.max(width, 2), Math.max(height, 2));
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const centerY = bottomCentered ? y - height / 2 : y;
  mesh.position.set(x, lift, centerY);
  return mesh;
}

function tagPick(
  mesh: THREE.Object3D,
  kind: string,
  mapId: string,
  extra: Record<string, unknown>,
): void {
  mesh.userData.pickKind = kind;
  mesh.userData.mapId = mapId;
  Object.assign(mesh.userData, extra);
}

export function buildMapOverlays(map: ParsedMap): THREE.Group[] {
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
      OVERLAY_FILL_OPACITY.doors,
      true,
    );
    mesh.userData.label = `To ${door.toMap}`;
    tagPick(mesh, "door", map.id, { door });
    markOverlayMesh(mesh, LIFT.doors, OVERLAY_FILL_OPACITY.doors);
    doors.add(mesh);
  }

  const spawns = overlayGroup("spawns");
  for (const spawn of map.spawns) {
    const mesh = makeRectMesh(
      spawn.x,
      spawn.y,
      14,
      14,
      overlayColor("spawns"),
      LIFT.spawns,
      OVERLAY_FILL_OPACITY.spawns,
    );
    markOverlayMesh(mesh, LIFT.spawns, OVERLAY_FILL_OPACITY.spawns);
    spawns.add(mesh);
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
      OVERLAY_FILL_OPACITY.quirks,
      true,
    );
    mesh.userData.label = quirk.text || quirk.kind;
    markOverlayMesh(mesh, LIFT.quirks, OVERLAY_FILL_OPACITY.quirks);
    quirks.add(mesh);
  }

  const npcs = overlayGroup("npcs");
  for (const npc of map.npcs) {
    const pick = makePickMesh(npc.x, npc.y, 20, 28, LIFT.npcs, true);
    pick.userData.label = npc.label;
    tagPick(pick, "npc", map.id, { npc });
    npcs.add(pick);
  }

  const monsters = overlayGroup("monsters");
  for (const monster of map.monsters) {
    let mesh: THREE.Object3D | null = null;
    if (monster.polygon) {
      mesh = makePolygonMesh(
        monster.polygon,
        overlayColor("monsters"),
        LIFT.monsters,
        OVERLAY_FILL_OPACITY.monsters,
      );
    } else if (monster.radius) {
      const geometry = new THREE.CircleGeometry(monster.radius, 24);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({
        color: overlayColor("monsters"),
        transparent: true,
        opacity: OVERLAY_FILL_OPACITY.monsters,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true,
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(monster.x, LIFT.monsters, monster.y);
      markOverlayMesh(mesh, LIFT.monsters, OVERLAY_FILL_OPACITY.monsters);
    } else {
      mesh = makeRectMesh(
        monster.x,
        monster.y,
        monster.width,
        monster.height,
        overlayColor("monsters"),
        LIFT.monsters,
        OVERLAY_FILL_OPACITY.monsters,
      );
    }
    if (mesh) {
      mesh.userData.label = monster.type;
      tagPick(mesh, "monster", map.id, { monsterType: monster.type, monster });
      if (!mesh.userData.isOverlayMesh) {
        markOverlayMesh(mesh, LIFT.monsters, OVERLAY_FILL_OPACITY.monsters);
      }
      monsters.add(mesh);
    }
  }

  const zones = overlayGroup("zones");
  for (const zone of map.zones) {
    const mesh = makePolygonMesh(
      zone.polygon,
      overlayColor("zones"),
      LIFT.zones,
      OVERLAY_FILL_OPACITY.zones,
    );
    if (mesh) {
      mesh.userData.label = zone.type;
      markOverlayMesh(mesh, LIFT.zones, OVERLAY_FILL_OPACITY.zones);
      zones.add(mesh);
    }
  }

  return [bounds, doors, spawns, quirks, npcs, monsters, zones];
}

export function applyOverlayDepthStyle(root: THREE.Object3D, seeThrough: boolean): void {
  root.traverse((object) => {
    if (object instanceof THREE.LineSegments && object.userData.isOverlayLine) {
      const material = object.material as THREE.LineBasicMaterial;
      const baseOpacity =
        (object.userData.baseOpacity as number | undefined) ?? BOUNDS_LINE_OPACITY;
      material.transparent = true;
      material.opacity = seeThrough ? SEE_THROUGH_OVERLAY_OPACITY : baseOpacity;
      material.depthWrite = false;
      material.needsUpdate = true;
      return;
    }
    if (!(object instanceof THREE.Mesh)) {
      return;
    }
    if (object.userData.isDepthOccluder || object.userData.isFloor || object.userData.pickKind) {
      return;
    }
    if (!object.userData.isOverlayMesh) {
      return;
    }
    const material = object.material as THREE.MeshBasicMaterial;
    const lift = (object.userData.overlayLift as number | undefined) ?? object.position.y;
    const baseOpacity = (object.userData.baseOpacity as number | undefined) ?? 1;
    const opacity = seeThrough ? SEE_THROUGH_OVERLAY_OPACITY : baseOpacity;
    material.transparent = opacity < 1;
    material.opacity = opacity;
    material.depthWrite = false;
    material.depthTest = true;
    material.side = THREE.DoubleSide;
    object.renderOrder = lift;
    material.needsUpdate = true;
  });
}

export function setOverlayVisibility(root: THREE.Object3D, visibility: OverlayVisibility): void {
  root.traverse((object) => {
    const kind = object.userData.overlayKind as OverlayKind | undefined;
    if (kind) {
      object.visible = visibility[kind];
    }
    if (object.userData.isMapSprite) {
      const spriteKind = object.userData.spriteKind as "npc" | "monster" | undefined;
      if (spriteKind === "npc") {
        object.visible = visibility.npcs;
      } else if (spriteKind === "monster") {
        object.visible = visibility.monsters;
      }
    }
  });
}
