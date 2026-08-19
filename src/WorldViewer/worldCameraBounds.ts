import { ParsedMap, MapPose, WorldLayout } from "./types";

export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerY: number;
  centerZ: number;
  radius: number;
}

export interface CameraPose {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

const MAP_LAYER_THICKNESS = 48;

/** Oblique orbit direction for world overview (Home / reset). */
export const WORLD_ORBIT_DIRECTION = { x: 0.55, y: 0.82, z: 0.62 };

/** World map focus: axis-aligned like single-map mode, tilted 45° above the slab. */
export const WORLD_FOCUS_ELEVATION = Math.PI / 4;

function orbitCameraPosition(
  target: { x: number; y: number; z: number },
  distance: number,
): { x: number; y: number; z: number } {
  const dir = WORLD_ORBIT_DIRECTION;
  const len = Math.hypot(dir.x, dir.y, dir.z);
  return {
    x: target.x + (dir.x / len) * distance,
    y: target.y + (dir.y / len) * distance,
    z: target.z + (dir.z / len) * distance,
  };
}

/** Camera offset for world focus — same X as target, 45° elevation from the -Z edge. */
function axisAlignedFocusCameraPosition(
  target: { x: number; y: number; z: number },
  distance: number,
): { x: number; y: number; z: number } {
  const horizontal = distance * Math.cos(WORLD_FOCUS_ELEVATION);
  const vertical = distance * Math.sin(WORLD_FOCUS_ELEVATION);
  return {
    x: target.x,
    y: target.y + vertical,
    z: target.z - horizontal,
  };
}

export function worldFocusDirection(): { x: number; y: number; z: number } {
  const horizontal = Math.cos(WORLD_FOCUS_ELEVATION);
  const vertical = Math.sin(WORLD_FOCUS_ELEVATION);
  const len = Math.hypot(horizontal, vertical);
  return { x: 0, y: vertical / len, z: -horizontal / len };
}

/** Aggregate world-space bounds from laid-out map art (Y = vertical layer). */
export function computeWorldBounds(layout: WorldLayout): WorldBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const [id, map] of Object.entries(layout.maps)) {
    const pose = layout.poses[id];
    if (!pose) {
      continue;
    }
    minX = Math.min(minX, pose.x + map.artMinX);
    maxX = Math.max(maxX, pose.x + map.artMaxX);
    minY = Math.min(minY, pose.z);
    maxY = Math.max(maxY, pose.z + MAP_LAYER_THICKNESS);
    minZ = Math.min(minZ, pose.y + map.artMinY);
    maxZ = Math.max(maxZ, pose.y + map.artMaxY);
  }

  if (!Number.isFinite(minX)) {
    return {
      minX: 0,
      maxX: 400,
      minY: 0,
      maxY: MAP_LAYER_THICKNESS,
      minZ: 0,
      maxZ: 400,
      centerX: 200,
      centerY: 0,
      centerZ: 200,
      radius: 400,
    };
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const spanZ = maxZ - minZ;
  const radius = Math.max(spanX, spanY, spanZ, 400) * 0.55;

  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    centerX,
    centerY,
    centerZ,
    radius,
  };
}

export function mapPointToWorld(
  pose: MapPose,
  mapX: number,
  mapY: number,
): { x: number; y: number; z: number } {
  return { x: pose.x + mapX, y: pose.z, z: pose.y + mapY };
}

export function mapCenterWorld(map: ParsedMap, pose: MapPose): { x: number; y: number; z: number } {
  return mapPointToWorld(pose, (map.artMinX + map.artMaxX) / 2, (map.artMinY + map.artMaxY) / 2);
}

/** Camera distance that frames one map's art footprint in the viewport. */
export function computeMapFocusDistance(map: ParsedMap, margin = 1.45): number {
  const spanX = map.artMaxX - map.artMinX;
  const spanZ = map.artMaxY - map.artMinY;
  return Math.max(spanX, spanZ, 240) * margin;
}

/** Default overview camera for the full laid-out world (Home / reset). */
export function computeOverviewPose(bounds: WorldBounds): CameraPose {
  const target = { x: bounds.centerX, y: bounds.centerY, z: bounds.centerZ };
  const distance = Math.max(bounds.radius * 2.8, 900);
  return { target, position: orbitCameraPosition(target, distance) };
}

/**
 * World-mode focus on one map: axis-aligned (map edges square to screen) at 45°
 * elevation — like single-map top-down but tilted for layer depth.
 */
export function computeWorldFocusPose(map: ParsedMap, pose: MapPose, margin = 1.65): CameraPose {
  const target = mapCenterWorld(map, pose);
  const distance = computeMapFocusDistance(map, margin);
  return { target, position: axisAlignedFocusCameraPosition(target, distance) };
}

export function computeWorldFocusPoseAtPoint(
  point: { x: number; y: number; z: number },
  distance: number,
): CameraPose {
  return { target: point, position: axisAlignedFocusCameraPosition(point, distance) };
}

/**
 * Straight-down camera matching the in-game 2D view. Game Y maps to world Z;
 * camera.up should be (0, 0, -1) so smaller game Y is the top of the screen.
 */
export function computeTopDownPose(bounds: WorldBounds): CameraPose {
  const target = { x: bounds.centerX, y: bounds.minY, z: bounds.centerZ };
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 240);
  const height = span * 1.15;
  return {
    target,
    position: { x: target.x, y: target.y + height, z: target.z },
  };
}
