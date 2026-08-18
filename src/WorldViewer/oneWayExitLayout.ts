import { isPortalOverworldPair } from "./layoutGraph";
import { DEFAULT_SLAB_GAP, mapArtRect, minCardinalClearance } from "./rectLayout";
import { DoorConnection, MapPose, ParsedMap } from "./types";

function doorWorld(
  mapId: string,
  edge: DoorConnection,
  poses: Record<string, MapPose>,
): { x: number; y: number } | null {
  const pose = poses[mapId];
  if (!pose) {
    return null;
  }
  if (edge.fromMap === mapId) {
    return { x: pose.x + edge.fromX, y: pose.y + edge.fromY };
  }
  if (edge.toMap === mapId) {
    return { x: pose.x + edge.toX, y: pose.y + edge.toY };
  }
  return null;
}

function doorLinkedPose(anchorPose: MapPose, edge: DoorConnection, childId: string): MapPose {
  const forward = edge.fromMap !== childId;
  return {
    x: forward ? anchorPose.x + edge.fromX - edge.toX : anchorPose.x - edge.fromX + edge.toX,
    y: forward ? anchorPose.y + edge.fromY - edge.toY : anchorPose.y - edge.fromY + edge.toY,
    z: anchorPose.z,
  };
}

function pickShortestSeparation<T extends { dx: number; dy: number }>(
  options: T[],
  score: (option: T) => number,
): T {
  return options.reduce((best, option) => (score(option) < score(best) ? option : best));
}

/**
 * One-way exits (instance arenas, event maps) must not stack on the destination.
 * Keep the child's band Z and offset XY so the door line is short but footprints clear.
 */
export function resolveOneWayExitLayout(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  connections: DoorConnection[],
  gap = DEFAULT_SLAB_GAP,
): void {
  for (const edge of connections) {
    if (edge.twoWay) {
      continue;
    }
    const childId = edge.fromMap;
    const parentId = edge.toMap;
    if (childId === "main" || parentId === childId) {
      continue;
    }
    const childMap = maps[childId];
    const parentMap = maps[parentId];
    const childPose = poses[childId];
    const parentPose = poses[parentId];
    if (!childMap || !parentMap || !childPose || !parentPose) {
      continue;
    }
    if (isPortalOverworldPair(childMap, parentMap)) {
      continue;
    }

    const basePose: MapPose = {
      ...doorLinkedPose(parentPose, edge, childId),
      z: childPose.z,
    };
    const parentRect = mapArtRect(parentMap, parentPose);
    const childRectAtBase = mapArtRect(childMap, basePose);
    const doorParent = doorWorld(parentId, edge, poses);
    if (!doorParent) {
      continue;
    }

    const options = minCardinalClearance(parentRect, childRectAtBase, gap);
    const best = pickShortestSeparation(options, (option) => {
      const candidatePose: MapPose = {
        x: basePose.x + option.dx,
        y: basePose.y + option.dy,
        z: basePose.z,
      };
      const doorChild = {
        x: candidatePose.x + edge.fromX,
        y: candidatePose.y + edge.fromY,
      };
      return Math.hypot(doorChild.x - doorParent.x, doorChild.y - doorParent.y);
    });

    poses[childId] = {
      x: basePose.x + best.dx,
      y: basePose.y + best.dy,
      z: basePose.z,
    };
  }
}
