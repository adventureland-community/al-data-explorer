import { mapArtRect } from "./rectLayout";
import { MapPose, ParsedMap } from "./types";

export interface ComponentArtBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function componentArtBounds(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  ids: string[],
): ComponentArtBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const id of ids) {
    const map = maps[id];
    const pose = poses[id];
    if (!map || !pose) {
      continue;
    }
    const rect = mapArtRect(map, pose);
    minX = Math.min(minX, rect.minX);
    maxX = Math.max(maxX, rect.maxX);
    minY = Math.min(minY, rect.minY);
    maxY = Math.max(maxY, rect.maxY);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  return { minX, maxX, minY, maxY };
}

export function shiftMapPoses(
  poses: Record<string, MapPose>,
  ids: string[],
  dx: number,
  dy: number,
): void {
  for (const id of ids) {
    const pose = poses[id];
    if (!pose) {
      continue;
    }
    pose.x += dx;
    pose.y += dy;
  }
}

export function virtualShiftedPoses(
  poses: Record<string, MapPose>,
  ids: string[],
  dx: number,
  dy: number,
): Record<string, MapPose> {
  const next: Record<string, MapPose> = { ...poses };
  for (const id of ids) {
    const pose = poses[id];
    if (!pose) {
      continue;
    }
    next[id] = { x: pose.x + dx, y: pose.y + dy, z: pose.z };
  }
  return next;
}
