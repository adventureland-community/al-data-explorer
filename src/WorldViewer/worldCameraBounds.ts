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

/** Default overview camera for the full laid-out world. */
export function computeOverviewPose(bounds: WorldBounds): CameraPose {
  const target = { x: bounds.centerX, y: bounds.centerY, z: bounds.centerZ };
  const distance = Math.max(bounds.radius * 2.8, 900);
  const position = {
    x: target.x + distance * 0.55,
    y: target.y + distance * 0.82,
    z: target.z + distance * 0.62,
  };
  return { position, target };
}
