import * as THREE from "three";
import { EXTRA_PACK_BOUNDS_COLOR, GROW_PACK_LINE_COLOR, overlayColor } from "./overlayColors";
import { OverlayPick } from "./overlayPick";
import { packOverlayLabel } from "./packSpriteSlots";
import { MonsterFeature, OverlayKind, OverlayVisibility, ParsedMap } from "./types";

export const SEE_THROUGH_OVERLAY_OPACITY = 0.38;
const HOVER_WHITE = new THREE.Color(0xffffff);

/** Default debug overlay opacities (zinals-style). */
const OVERLAY_FILL_OPACITY: Record<Exclude<OverlayKind, "bounds">, number> = {
  zones: 0.18,
  monsters: 0.22,
  rage: 0.2,
  traps: 0.28,
  quirks: 0.4,
  machines: 0.4,
  animatables: 0.4,
  doors: 0.45,
  spawns: 0.7,
  npcs: 0.35,
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
  rage: 5,
  traps: 6,
  quirks: 7,
  machines: 8,
  doors: 9,
  animatables: 10,
  spawns: 11,
  npcs: 12,
};

function makeLineLoop(
  points: Array<[number, number]>,
  color: number,
  lift: number,
  opacity: number,
): THREE.LineLoop | null {
  if (points.length < 2) {
    return null;
  }
  const positions: number[] = [];
  for (const [x, y] of points) {
    positions.push(x, lift, y);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  const line = new THREE.LineLoop(geometry, material);
  line.userData.isOverlayLine = true;
  line.userData.overlayLift = lift;
  line.userData.baseOpacity = opacity;
  line.renderOrder = lift + 0.5;
  return line;
}

function growPackOutline(monster: MonsterFeature, lift: number): THREE.LineLoop | null {
  if (!monster.grow) {
    return null;
  }
  if (monster.polygon && monster.polygon.length >= 3) {
    return makeLineLoop(monster.polygon, GROW_PACK_LINE_COLOR, lift, 0.95);
  }
  if (monster.radius) {
    const points: Array<[number, number]> = [];
    const steps = 24;
    for (let i = 0; i < steps; i += 1) {
      const angle = (i / steps) * Math.PI * 2;
      points.push([
        monster.x + Math.cos(angle) * monster.radius,
        monster.y + Math.sin(angle) * monster.radius,
      ]);
    }
    return makeLineLoop(points, GROW_PACK_LINE_COLOR, lift, 0.95);
  }
  const halfW = monster.width / 2;
  const halfH = monster.height / 2;
  return makeLineLoop(
    [
      [monster.x - halfW, monster.y - halfH],
      [monster.x + halfW, monster.y - halfH],
      [monster.x + halfW, monster.y + halfH],
      [monster.x - halfW, monster.y + halfH],
    ],
    GROW_PACK_LINE_COLOR,
    lift,
    0.95,
  );
}

function overlayFillMaterial(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    fog: false,
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

function makeCircleMesh(
  x: number,
  y: number,
  radius: number,
  color: number,
  lift: number,
  opacity: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    layFlatOnMap(new THREE.CircleGeometry(Math.max(radius, 1), 20)),
    overlayFillMaterial(color, opacity),
  );
  mesh.position.set(x, lift, y);
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
    fog: false,
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

function attachKindRect(
  group: THREE.Group,
  pick: OverlayPick,
  x: number,
  y: number,
  width: number,
  height: number,
  kind: Exclude<OverlayKind, "bounds">,
  label: string,
  outline = false,
): void {
  const lift = LIFT[kind];
  const opacity = OVERLAY_FILL_OPACITY[kind];
  attachOverlay(
    group,
    makeRectMesh(x, y, width, height, overlayColor(kind), lift, opacity, outline),
    pick,
    label,
    { lift, opacity },
  );
}

export function buildMapOverlays(map: ParsedMap): THREE.Group[] {
  const bounds = overlayGroup("bounds");
  bounds.add(boundsLines(map));

  const doors = overlayGroup("doors");
  for (const door of map.doors) {
    const pick = { kind: "door" as const, mapId: map.id, door };
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
      pick,
      `To ${door.toMap}`,
      { lift: LIFT.doors, opacity: OVERLAY_FILL_OPACITY.doors },
    );
    attachOverlay(
      doors,
      makeCircleMesh(door.x, door.y, 2.5, overlayColor("doors"), LIFT.doors + 0.2, 0.95),
      pick,
      `To ${door.toMap}`,
      { lift: LIFT.doors + 0.2, opacity: 0.95 },
    );
  }

  const spawns = overlayGroup("spawns");
  for (const spawn of map.spawns) {
    attachOverlay(
      spawns,
      makeCircleMesh(
        spawn.x,
        spawn.y,
        10,
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
    const pick = { kind: "quirk" as const, mapId: map.id, quirk };
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
      pick,
      quirk.text || quirk.kind,
      { lift: LIFT.quirks, opacity: OVERLAY_FILL_OPACITY.quirks },
    );
    attachOverlay(
      quirks,
      makeCircleMesh(quirk.x, quirk.y, 2.5, overlayColor("quirks"), LIFT.quirks + 0.2, 0.95),
      pick,
      quirk.text || quirk.kind,
      { lift: LIFT.quirks + 0.2, opacity: 0.95 },
    );
  }

  const npcs = overlayGroup("npcs");
  for (const npc of map.npcs) {
    const pick = { kind: "npc" as const, mapId: map.id, npc };
    if (npc.roam) {
      attachOverlay(
        npcs,
        makeRectMesh(
          npc.roam.x,
          npc.roam.y,
          npc.roam.width,
          npc.roam.height,
          overlayColor("npcs"),
          LIFT.npcs,
          OVERLAY_FILL_OPACITY.npcs,
        ),
        pick,
        npc.label,
        { lift: LIFT.npcs, opacity: OVERLAY_FILL_OPACITY.npcs },
      );
    }
    attachOverlay(
      npcs,
      makeRectMesh(npc.x, npc.y, 20, 28, overlayColor("npcs"), LIFT.npcs + 0.2, 0.85, true),
      pick,
      npc.label,
      { lift: LIFT.npcs + 0.2, opacity: 0.85 },
    );
  }

  const monsters = overlayGroup("monsters");
  for (const monster of map.monsters) {
    const fill = overlayColor("monsters");
    let mesh: THREE.Mesh | null = null;
    if (monster.polygon) {
      mesh = makePolygonMesh(monster.polygon, fill, LIFT.monsters, OVERLAY_FILL_OPACITY.monsters);
    } else if (monster.radius) {
      mesh = new THREE.Mesh(
        layFlatOnMap(new THREE.CircleGeometry(monster.radius, 24)),
        overlayFillMaterial(fill, OVERLAY_FILL_OPACITY.monsters),
      );
      mesh.position.set(monster.x, LIFT.monsters, monster.y);
    } else {
      mesh = makeRectMesh(
        monster.x,
        monster.y,
        monster.width,
        monster.height,
        fill,
        LIFT.monsters,
        OVERLAY_FILL_OPACITY.monsters,
      );
    }
    attachOverlay(
      monsters,
      mesh,
      { kind: "monster", mapId: map.id, monster },
      packOverlayLabel(monster),
      {
        lift: LIFT.monsters,
        opacity: OVERLAY_FILL_OPACITY.monsters,
      },
    );
    for (const extra of monster.extraBounds || []) {
      attachOverlay(
        monsters,
        makeRectMesh(
          extra.x,
          extra.y,
          extra.width,
          extra.height,
          EXTRA_PACK_BOUNDS_COLOR,
          LIFT.monsters,
          OVERLAY_FILL_OPACITY.monsters,
        ),
        { kind: "monster", mapId: map.id, monster },
        packOverlayLabel(monster),
        { lift: LIFT.monsters, opacity: OVERLAY_FILL_OPACITY.monsters },
      );
    }
    const outline = growPackOutline(monster, LIFT.monsters + 0.4);
    if (outline) {
      outline.userData.pick = { kind: "monster", mapId: map.id, monster };
      outline.userData.mapId = map.id;
      monsters.add(outline);
    }
  }

  const rage = overlayGroup("rage");
  for (const monster of map.monsters) {
    if (!monster.rage) {
      continue;
    }
    attachKindRect(
      rage,
      { kind: "rage", mapId: map.id, monster },
      monster.rage.x,
      monster.rage.y,
      monster.rage.width,
      monster.rage.height,
      "rage",
      `${monster.type} rage`,
    );
  }

  const machines = overlayGroup("machines");
  for (const machine of map.machines) {
    attachKindRect(
      machines,
      { kind: "machine", mapId: map.id, machine },
      machine.x,
      machine.y,
      machine.width,
      machine.height,
      "machines",
      machine.type,
      true,
    );
  }

  const animatables = overlayGroup("animatables");
  for (const animatable of map.animatables) {
    attachKindRect(
      animatables,
      { kind: "animatable", mapId: map.id, animatable },
      animatable.x,
      animatable.y,
      24,
      32,
      "animatables",
      animatable.id,
      true,
    );
  }

  const traps = overlayGroup("traps");
  for (const trap of map.traps) {
    const mesh = trap.polygon
      ? makePolygonMesh(trap.polygon, overlayColor("traps"), LIFT.traps, OVERLAY_FILL_OPACITY.traps)
      : makeCircleMesh(
          trap.x,
          trap.y,
          12,
          overlayColor("traps"),
          LIFT.traps,
          OVERLAY_FILL_OPACITY.traps,
        );
    attachOverlay(traps, mesh, { kind: "trap", mapId: map.id, trap }, trap.type, {
      lift: LIFT.traps,
      opacity: OVERLAY_FILL_OPACITY.traps,
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

  return [bounds, doors, spawns, quirks, npcs, monsters, rage, machines, animatables, traps, zones];
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
