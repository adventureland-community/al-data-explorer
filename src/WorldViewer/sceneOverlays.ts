import * as THREE from "three";
import { overlayColor } from "./overlayColors";
import { OverlayPick } from "./overlayPick";
import { OverlayKind, OverlayVisibility, ParsedMap } from "./types";

export const SEE_THROUGH_OVERLAY_OPACITY = 0.38;
const HOVER_WHITE = new THREE.Color(0xffffff);

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
  if (mesh instanceof THREE.Mesh) {
    const material = mesh.material as THREE.MeshBasicMaterial;
    mesh.userData.baseColor = material.color.getHex();
  }
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

function overlayFillMaterial(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
  });
}

/** XY shape → XZ map plane. rotateX(-π/2) maps (x, y) to (x, z=-y). */
function layFlatOnMap(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  return geometry.rotateX(-Math.PI / 2);
}

/**
 * Game (x, y) → Shape vertex so layFlatOnMap lands on world (x, z=y),
 * matching floors, sprites, and centered rect overlays.
 */
export function gameToShapePoint(x: number, y: number): [number, number] {
  return [x, -y];
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
  const geometry = layFlatOnMap(new THREE.PlaneGeometry(Math.max(width, 2), Math.max(height, 2)));
  const mesh = new THREE.Mesh(geometry, overlayFillMaterial(color, opacity));
  mesh.position.set(x, lift, bottomCentered ? y - height / 2 : y);
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
  const first = gameToShapePoint(polygon[0][0], polygon[0][1]);
  shape.moveTo(first[0], first[1]);
  for (let i = 1; i < polygon.length; i += 1) {
    const point = gameToShapePoint(polygon[i][0], polygon[i][1]);
    shape.lineTo(point[0], point[1]);
  }
  shape.closePath();
  const mesh = new THREE.Mesh(
    layFlatOnMap(new THREE.ShapeGeometry(shape)),
    overlayFillMaterial(color, opacity),
  );
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

function attachOverlay(
  group: THREE.Group,
  mesh: THREE.Mesh | null,
  pick: OverlayPick,
  label: string,
  style?: { lift: number; opacity: number },
): void {
  if (!mesh) {
    return;
  }
  mesh.userData.label = label;
  mesh.userData.pick = pick;
  mesh.userData.mapId = pick.mapId;
  if (style) {
    markOverlayMesh(mesh, style.lift, style.opacity);
  }
  group.add(mesh);
}

export function buildMapOverlays(map: ParsedMap): THREE.Group[] {
  const bounds = overlayGroup("bounds");
  bounds.add(boundsLines(map));

  const doors = overlayGroup("doors");
  for (const door of map.doors) {
    attachOverlay(
      doors,
      makeRectMesh(
        door.x,
        door.y,
        door.width,
        door.height,
        overlayColor("doors"),
        LIFT.doors,
        OVERLAY_FILL_OPACITY.doors,
        true,
      ),
      { kind: "door", mapId: map.id, door },
      `To ${door.toMap}`,
      { lift: LIFT.doors, opacity: OVERLAY_FILL_OPACITY.doors },
    );
  }

  const spawns = overlayGroup("spawns");
  for (const spawn of map.spawns) {
    attachOverlay(
      spawns,
      makeRectMesh(
        spawn.x,
        spawn.y,
        14,
        14,
        overlayColor("spawns"),
        LIFT.spawns,
        OVERLAY_FILL_OPACITY.spawns,
      ),
      { kind: "spawn", mapId: map.id, spawn },
      spawn.label,
      { lift: LIFT.spawns, opacity: OVERLAY_FILL_OPACITY.spawns },
    );
  }

  const quirks = overlayGroup("quirks");
  for (const quirk of map.quirks) {
    attachOverlay(
      quirks,
      makeRectMesh(
        quirk.x,
        quirk.y,
        quirk.width,
        quirk.height,
        overlayColor("quirks"),
        LIFT.quirks,
        OVERLAY_FILL_OPACITY.quirks,
        true,
      ),
      { kind: "quirk", mapId: map.id, quirk },
      quirk.text || quirk.kind,
      { lift: LIFT.quirks, opacity: OVERLAY_FILL_OPACITY.quirks },
    );
  }

  const npcs = overlayGroup("npcs");
  for (const npc of map.npcs) {
    attachOverlay(
      npcs,
      makeRectMesh(npc.x, npc.y, 20, 28, 0xffffff, LIFT.npcs, 0, true),
      { kind: "npc", mapId: map.id, npc },
      npc.label,
    );
  }

  const monsters = overlayGroup("monsters");
  for (const monster of map.monsters) {
    let mesh: THREE.Mesh | null = null;
    if (monster.polygon) {
      mesh = makePolygonMesh(
        monster.polygon,
        overlayColor("monsters"),
        LIFT.monsters,
        OVERLAY_FILL_OPACITY.monsters,
      );
    } else if (monster.radius) {
      mesh = new THREE.Mesh(
        layFlatOnMap(new THREE.CircleGeometry(monster.radius, 24)),
        overlayFillMaterial(overlayColor("monsters"), OVERLAY_FILL_OPACITY.monsters),
      );
      mesh.position.set(monster.x, LIFT.monsters, monster.y);
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
    attachOverlay(monsters, mesh, { kind: "monster", mapId: map.id, monster }, monster.type, {
      lift: LIFT.monsters,
      opacity: OVERLAY_FILL_OPACITY.monsters,
    });
  }

  const zones = overlayGroup("zones");
  for (const zone of map.zones) {
    attachOverlay(
      zones,
      makePolygonMesh(zone.polygon, overlayColor("zones"), LIFT.zones, OVERLAY_FILL_OPACITY.zones),
      { kind: "zone", mapId: map.id, zone },
      zone.type,
      { lift: LIFT.zones, opacity: OVERLAY_FILL_OPACITY.zones },
    );
  }

  return [bounds, doors, spawns, quirks, npcs, monsters, zones];
}

export function applyOverlayMeshStyle(object: THREE.Object3D, seeThrough: boolean): void {
  if (!(object instanceof THREE.Mesh) || !object.userData.isOverlayMesh) {
    return;
  }
  const material = object.material as THREE.MeshBasicMaterial;
  const lift = (object.userData.overlayLift as number | undefined) ?? object.position.y;
  const baseOpacity = (object.userData.baseOpacity as number | undefined) ?? 1;
  const baseColor = (object.userData.baseColor as number | undefined) ?? material.color.getHex();
  const hovered = Boolean(object.userData.isHovered);
  const opacity = seeThrough ? SEE_THROUGH_OVERLAY_OPACITY : baseOpacity;
  material.transparent = true;
  material.opacity = hovered ? Math.min(0.92, opacity + 0.4) : opacity;
  material.color.setHex(baseColor);
  if (hovered) {
    material.color.lerp(HOVER_WHITE, 0.42);
  }
  material.depthWrite = false;
  material.depthTest = true;
  material.side = THREE.DoubleSide;
  object.renderOrder = lift;
  material.needsUpdate = true;
}

export function setHoveredOverlay(
  previous: THREE.Object3D | null,
  next: THREE.Object3D | null,
  seeThrough: boolean,
): THREE.Object3D | null {
  if (previous === next) {
    return previous;
  }
  if (previous) {
    previous.userData.isHovered = false;
    applyOverlayMeshStyle(previous, seeThrough);
  }
  if (!next?.userData.isOverlayMesh) {
    return null;
  }
  next.userData.isHovered = true;
  applyOverlayMeshStyle(next, seeThrough);
  return next;
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
    applyOverlayMeshStyle(object, seeThrough);
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
