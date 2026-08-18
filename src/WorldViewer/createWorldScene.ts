import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer";
import { GDimension, GImage, GMonster, GSprite } from "typed-adventureland";
import {
  FLOOR_INDOOR_COLOR,
  FLOOR_OUTSIDE_COLOR,
  FLOOR_UNDERGROUND_COLOR,
  ONE_WAY_CONNECTION_COLOR,
  overlayColor,
  SELECTED_FLOOR_COLOR,
  TWO_WAY_CONNECTION_COLOR,
} from "./overlayColors";
import {
  MapArtBake,
  createDefaultPatternSvg,
  setDefaultPatternFrame,
  tileAnimFrame,
} from "./renderMapCanvas";
import { createSpriteElement, lookupSkinSprite } from "./spriteLookup";
import { MapBand, OverlayKind, OverlayVisibility, ParsedMap, WorldLayout } from "./types";

export interface MapSpriteContext {
  sprites: Record<string, GSprite>;
  images: Record<string, GImage>;
  dimensions: Record<string, GDimension>;
  monsters: Record<string, GMonster>;
}

const SPRITE_LIFT = 14;
const SEE_THROUGH_OVERLAY_OPACITY = 0.38;

/** Default debug overlay opacities (zinals-style). */
const OVERLAY_FILL_OPACITY: Record<Exclude<OverlayKind, "bounds" | "npcs">, number> = {
  zones: 0.18,
  monsters: 0.22,
  quirks: 0.4,
  doors: 0.45,
  spawns: 0.7,
};

const BOUNDS_LINE_OPACITY = 0.7;
const CONNECTION_LINE_OPACITY = 0.85;

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

function makeCssSprite(
  clip: ReturnType<typeof lookupSkinSprite>,
  x: number,
  y: number,
  lift: number,
  feetAnchored: boolean,
): CSS3DObject | null {
  if (!clip) {
    return null;
  }
  const element = createSpriteElement(clip);
  const sprite = new CSS3DObject(element);
  sprite.userData.isMapSprite = true;
  sprite.rotation.x = -Math.PI / 2;
  const z = feetAnchored ? y - clip.viewHeight / 2 : y;
  sprite.position.set(x, lift, z);
  return sprite;
}

function buildMapSprites(map: ParsedMap, ctx: MapSpriteContext): THREE.Group {
  const group = new THREE.Group();
  group.name = "sprites";

  for (const npc of map.npcs) {
    const clip = lookupSkinSprite(ctx.sprites, ctx.images, ctx.dimensions, npc.skin);
    const sprite = makeCssSprite(clip, npc.x, npc.y, SPRITE_LIFT, true);
    if (!sprite) {
      continue;
    }
    sprite.userData.spriteKind = "npc";
    sprite.userData.npc = npc;
    sprite.userData.mapId = map.id;
    group.add(sprite);
  }

  for (const monster of map.monsters) {
    const def = ctx.monsters[monster.type as keyof typeof ctx.monsters];
    const skin = def?.skin || monster.type;
    const size = def?.size || 1;
    const clip = lookupSkinSprite(ctx.sprites, ctx.images, ctx.dimensions, skin, size);
    const sprite = makeCssSprite(clip, monster.x, monster.y, SPRITE_LIFT - 2, false);
    if (!sprite) {
      continue;
    }
    sprite.userData.spriteKind = "monster";
    sprite.userData.monsterType = monster.type;
    sprite.userData.mapId = map.id;
    group.add(sprite);
  }

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
    group.add(buildMapSprites(map, spriteContext));
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

function styleLayer(element: HTMLElement, width: number, height: number): void {
  element.style.position = "absolute";
  element.style.left = "0";
  element.style.top = "0";
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.pointerEvents = "none";
  if (element instanceof HTMLCanvasElement) {
    element.style.imageRendering = "pixelated";
    element.style.display = "block";
  }
}

function mapArtOf(floor: THREE.Object3D): CSS3DObject | undefined {
  const found = floor.children.find((child) => child.userData.isMapArt);
  return found instanceof CSS3DObject ? found : undefined;
}

function makeMapArt(
  floor: THREE.Mesh,
  mapId: string,
  bake: MapArtBake,
  elapsedMs: number,
): CSS3DObject {
  const geometry = floor.geometry as THREE.PlaneGeometry;
  const { width, height } = geometry.parameters;
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  wrap.style.width = `${width}px`;
  wrap.style.height = `${height}px`;
  wrap.style.pointerEvents = "none";

  if (bake.animatedDefault) {
    const svg = createDefaultPatternSvg(mapId, bake.animatedDefault, width, height);
    const defaultFrame = tileAnimFrame(bake.animatedDefault.def, elapsedMs, { kind: "water" });
    setDefaultPatternFrame(svg, bake.animatedDefault.def, defaultFrame);
    wrap.appendChild(svg);
  }

  styleLayer(bake.staticCanvas, width, height);
  wrap.appendChild(bake.staticCanvas);

  if (bake.overlay) {
    styleLayer(bake.overlay, width, height);
    wrap.appendChild(bake.overlay);
    bake.paintOverlay?.(elapsedMs);
  }

  const art = new CSS3DObject(wrap);
  art.userData.isMapArt = true;
  art.userData.mapArt = bake;
  art.userData.lastDefaultFrame = bake.animatedDefault
    ? tileAnimFrame(bake.animatedDefault.def, elapsedMs, { kind: "water" })
    : -1;
  // Match floor plane (XZ): canvas Y-down maps to +Z, same as geometry coords.
  art.rotation.x = -Math.PI / 2;
  art.position.set(0, 0.02, 0);
  return art;
}

/**
 * Official tileset images have no CORS headers, so they cannot become WebGL
 * textures. Baked canvases are shown with CSS3D instead (display-only is allowed).
 */
export function applyFloorCanvases(
  root: THREE.Object3D,
  artByMap: Record<string, MapArtBake>,
  enabled: boolean,
  elapsedMs: number,
): void {
  root.traverse((object) => {
    if (!object.userData.isFloor || !(object instanceof THREE.Mesh)) {
      return;
    }
    const { parent } = object;
    if (!parent) {
      return;
    }
    const material = object.material as THREE.MeshBasicMaterial;
    const mapId = object.userData.mapId as string | undefined;
    const bake = mapId && enabled ? artByMap[mapId] : undefined;
    let art = mapArtOf(object);

    if (bake) {
      if (!art) {
        art = makeMapArt(object, mapId || "map", bake, elapsedMs);
        object.add(art);
      } else if (art.userData.mapArt !== bake) {
        object.remove(art);
        art = makeMapArt(object, mapId || "map", bake, elapsedMs);
        object.add(art);
      }
      art.visible = true;
      material.opacity = 0;
      material.needsUpdate = true;
      return;
    }

    if (art) {
      art.visible = false;
    }
    material.needsUpdate = true;
  });
}

export function applyMapAnimation(root: THREE.Object3D, elapsedMs: number): void {
  root.traverse((object) => {
    if (!object.userData.isMapArt || !(object instanceof CSS3DObject)) {
      return;
    }
    const bake = object.userData.mapArt as MapArtBake | undefined;
    if (!bake?.needsAnimation) {
      return;
    }
    if (bake.animatedDefault) {
      const frame = tileAnimFrame(bake.animatedDefault.def, elapsedMs, { kind: "water" });
      if (object.userData.lastDefaultFrame !== frame) {
        object.userData.lastDefaultFrame = frame;
        const svg = object.element.querySelector("svg");
        if (svg) {
          setDefaultPatternFrame(svg, bake.animatedDefault.def, frame);
        }
      }
    }
    bake.paintOverlay?.(elapsedMs);
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
