import { isLateralCaveLink } from "./layoutGraph";
import { PortalRigidGroups } from "./doorLayout";
import { MapPose, ParsedMap } from "./types";

export const DEFAULT_SLAB_GAP = 240;
export const PINNED_SLAB_STEP = 120;

export interface ArtRect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function mapArtRect(map: ParsedMap, pose: MapPose): ArtRect {
  return {
    minX: pose.x + map.artMinX,
    maxX: pose.x + map.artMaxX,
    minY: pose.y + map.artMinY,
    maxY: pose.y + map.artMaxY,
  };
}

export function mapSize(map: ParsedMap): { width: number; height: number } {
  return {
    width: map.artMaxX - map.artMinX,
    height: map.artMaxY - map.artMinY,
  };
}

export function rectsOverlap(a: ArtRect, b: ArtRect, gap: number): boolean {
  return (
    a.minX < b.maxX + gap && b.minX < a.maxX + gap && a.minY < b.maxY + gap && b.minY < a.maxY + gap
  );
}

/** Minimum translation to separate `b` from `a`, using art bounds + gap. */
export function separationPush(
  mapA: ParsedMap,
  poseA: MapPose,
  mapB: ParsedMap,
  poseB: MapPose,
  gap: number,
): { dx: number; dy: number } | null {
  const a = mapArtRect(mapA, poseA);
  const b = mapArtRect(mapB, poseB);
  if (!rectsOverlap(a, b, gap)) {
    return null;
  }
  const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) + gap;
  const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) + gap;
  if (overlapX <= 0 && overlapY <= 0) {
    return null;
  }
  if (overlapX <= 0) {
    const dir =
      poseA.y + mapA.artMinY + (mapA.artMaxY - mapA.artMinY) / 2 <=
      poseB.y + mapB.artMinY + (mapB.artMaxY - mapB.artMinY) / 2
        ? 1
        : -1;
    return { dx: 0, dy: dir * overlapY };
  }
  if (overlapY <= 0) {
    const dir =
      poseA.x + mapA.artMinX + (mapA.artMaxX - mapA.artMinX) / 2 <=
      poseB.x + mapB.artMinX + (mapB.artMaxX - mapB.artMinX) / 2
        ? 1
        : -1;
    return { dx: dir * overlapX, dy: 0 };
  }
  const centerAY = poseA.y + (mapA.artMinY + mapA.artMaxY) / 2;
  const centerBY = poseB.y + (mapB.artMinY + mapB.artMaxY) / 2;
  const stackedOnSameRow = Math.abs(centerAY - centerBY) < gap;
  const preferHorizontal =
    mapA.band === mapB.band &&
    (mapA.band === "overworld" || mapA.band === "underground") &&
    overlapX <= overlapY * 1.25 &&
    !stackedOnSameRow;
  if (overlapX <= overlapY || preferHorizontal) {
    const dir =
      poseA.x + mapA.artMinX + (mapA.artMaxX - mapA.artMinX) / 2 <=
      poseB.x + mapB.artMinX + (mapB.artMaxX - mapB.artMinX) / 2
        ? 1
        : -1;
    return { dx: dir * overlapX, dy: 0 };
  }
  const dir =
    poseA.y + mapA.artMinY + (mapA.artMaxY - mapA.artMinY) / 2 <=
    poseB.y + mapB.artMinY + (mapB.artMaxY - mapB.artMinY) / 2
      ? 1
      : -1;
  return { dx: 0, dy: dir * overlapY };
}

/** Smallest axis-aligned shifts that clear overlap between two art rects. */
export function minCardinalClearance(
  fixed: ArtRect,
  movable: ArtRect,
  gap: number,
): Array<{ dx: number; dy: number }> {
  if (!rectsOverlap(fixed, movable, gap)) {
    return [{ dx: 0, dy: 0 }];
  }
  const options: Array<{ dx: number; dy: number }> = [];
  const dxRight = fixed.maxX + gap - movable.minX;
  if (dxRight > 0) {
    options.push({ dx: dxRight, dy: 0 });
  }
  const dxLeft = fixed.minX - gap - movable.maxX;
  if (dxLeft < 0) {
    options.push({ dx: dxLeft, dy: 0 });
  }
  const dyDown = fixed.maxY + gap - movable.minY;
  if (dyDown > 0) {
    options.push({ dx: 0, dy: dyDown });
  }
  const dyUp = fixed.minY - gap - movable.maxY;
  if (dyUp < 0) {
    options.push({ dx: 0, dy: dyUp });
  }
  return options.length > 0 ? options : [{ dx: 0, dy: 0 }];
}

function movePortalGroup(
  poses: Record<string, MapPose>,
  members: Set<string>,
  dx: number,
  dy: number,
): void {
  for (const id of members) {
    if (id === "main") {
      continue;
    }
    poses[id].x += dx;
    poses[id].y += dy;
  }
}

function portalMembers(groups: PortalRigidGroups | undefined, id: string): Set<string> | null {
  if (!groups) {
    return null;
  }
  const root = groups.rootByMap.get(id);
  if (!root) {
    return null;
  }
  return groups.membersByRoot.get(root) || null;
}

function applyPush(
  poses: Record<string, MapPose>,
  idA: string,
  idB: string,
  push: { dx: number; dy: number },
  immovable: Set<string>,
  portalGroups?: PortalRigidGroups,
): void {
  const membersA = portalMembers(portalGroups, idA);
  const membersB = portalMembers(portalGroups, idB);
  const aPinned = immovable.has(idA);
  const bPinned = immovable.has(idB);
  const samePortalGroup =
    membersA && membersB && portalGroups?.rootByMap.get(idA) === portalGroups?.rootByMap.get(idB);
  if (samePortalGroup) {
    return;
  }

  if (!aPinned && !bPinned) {
    if (membersB && !membersA) {
      movePortalGroup(poses, membersB, push.dx, push.dy);
      poses[idA].x -= push.dx;
      poses[idA].y -= push.dy;
      return;
    }
    if (membersA && !membersB) {
      movePortalGroup(poses, membersA, -push.dx, -push.dy);
      poses[idB].x += push.dx;
      poses[idB].y += push.dy;
      return;
    }
    if (membersA && membersB) {
      movePortalGroup(poses, membersB, push.dx, push.dy);
      movePortalGroup(poses, membersA, -push.dx, -push.dy);
      return;
    }
    poses[idA].x -= push.dx / 2;
    poses[idA].y -= push.dy / 2;
    poses[idB].x += push.dx / 2;
    poses[idB].y += push.dy / 2;
    return;
  }
  if (!bPinned) {
    if (membersB) {
      movePortalGroup(poses, membersB, push.dx, push.dy);
    } else {
      poses[idB].x += push.dx;
      poses[idB].y += push.dy;
    }
    return;
  }
  if (!aPinned) {
    if (membersA) {
      movePortalGroup(poses, membersA, -push.dx, -push.dy);
    } else {
      poses[idA].x -= push.dx;
      poses[idA].y -= push.dy;
    }
    return;
  }
  if (membersA && membersB) {
    movePortalGroup(poses, membersB, push.dx, push.dy);
  }
}

/** Push apart overlapping maps on one Z slab using art footprint sizes. */
export function resolveSlabOverlaps(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  slabIds: string[],
  immovable: Set<string>,
  gap = DEFAULT_SLAB_GAP,
  maxIterations = 128,
  portalGroups?: PortalRigidGroups,
): boolean {
  let anyOverlap = false;

  const processPair = (onlyAnchoredPairs: boolean) => {
    let moved = false;
    for (let i = 0; i < slabIds.length; i += 1) {
      for (let j = i + 1; j < slabIds.length; j += 1) {
        const idA = slabIds[i];
        const idB = slabIds[j];
        const aFixed = immovable.has(idA);
        const bFixed = immovable.has(idB);
        if (onlyAnchoredPairs) {
          if (aFixed === bFixed) {
            continue;
          }
        } else if (aFixed || bFixed) {
          continue;
        }
        const push = separationPush(maps[idA], poses[idA], maps[idB], poses[idB], gap);
        if (!push) {
          continue;
        }
        anyOverlap = true;
        applyPush(poses, idA, idB, push, immovable, portalGroups);
        moved = true;
      }
    }
    return moved;
  };

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let moved = false;
    moved = processPair(true) || moved;
    moved = processPair(false) || moved;
    if (!moved) {
      break;
    }
  }
  return anyOverlap;
}

/** Group maps by Z and resolve overlaps on each slab (size-aware 2D layout). */
export function resolveWorldSlabs(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  immovable: Set<string>,
  gap = DEFAULT_SLAB_GAP,
  portalGroups?: PortalRigidGroups,
): void {
  const byZ = new Map<number, string[]>();
  for (const [id, pose] of Object.entries(poses)) {
    if (!maps[id]) {
      continue;
    }
    const list = byZ.get(pose.z) || [];
    list.push(id);
    byZ.set(pose.z, list);
  }
  for (const ids of byZ.values()) {
    if (ids.length < 2) {
      continue;
    }
    resolveSlabOverlaps(maps, poses, ids, immovable, gap, 128, portalGroups);
  }
}

export function countSameSlabOverlaps(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  gap = 0,
): number {
  let count = 0;
  const ids = Object.keys(poses);
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const poseA = poses[ids[i]];
      const poseB = poses[ids[j]];
      if (poseA.z !== poseB.z) {
        continue;
      }
      if (rectsOverlap(mapArtRect(maps[ids[i]], poseA), mapArtRect(maps[ids[j]], poseB), gap)) {
        count += 1;
      }
    }
  }
  return count;
}

/** When port-locked maps share Z and still overlap (art + gap), nudge Z in small steps (keeps door XY). */
export function resolveDoorLockedSlabOverflow(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  doorLocked: Set<string>,
  step = PINNED_SLAB_STEP,
  maxRounds = 512,
  gap = DEFAULT_SLAB_GAP,
  portalGroups?: PortalRigidGroups,
): void {
  const ids = Object.keys(poses);
  for (let round = 0; round < maxRounds; round += 1) {
    let bumped = false;
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const idA = ids[i];
        const idB = ids[j];
        if (!doorLocked.has(idA) || !doorLocked.has(idB)) {
          continue;
        }
        if (idA === "main" || idB === "main") {
          continue;
        }
        const poseA = poses[idA];
        const poseB = poses[idB];
        if (poseA.z !== poseB.z) {
          continue;
        }
        const rectA = mapArtRect(maps[idA], poseA);
        const rectB = mapArtRect(maps[idB], poseB);
        if (!rectsOverlap(rectA, rectB, gap)) {
          continue;
        }
        const mapA = maps[idA];
        const mapB = maps[idB];
        if (mapA && mapB && (isLateralCaveLink(mapA, mapB) || isLateralCaveLink(mapB, mapA))) {
          // Cave↔cove share a wall door; art bounds overlap at the doorway by design.
          continue;
        }
        const portalRootA = portalGroups?.rootByMap.get(idA);
        const portalRootB = portalGroups?.rootByMap.get(idB);
        const samePortalGroup = Boolean(portalRootA && portalRootA === portalRootB);
        if (samePortalGroup) {
          continue;
        }
        if (mapA?.band === "overworld" && mapB?.band === "overworld" && !samePortalGroup) {
          continue;
        }
        const bumpId = idB;
        if (maps[bumpId]?.band === "overworld") {
          continue;
        }
        if (bumpId === "main") {
          continue;
        }
        poses[bumpId].z += step;
        bumped = true;
        break;
      }
      if (bumped) {
        break;
      }
    }
    if (!bumped) {
      break;
    }
  }
}
