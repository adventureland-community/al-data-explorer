import { placeGroupShortestDoorClearance } from "./doorPlacement";
import { isPortalOverworldPair } from "./layoutGraph";
import { DEFAULT_SLAB_GAP, mapArtRect } from "./rectLayout";
import { DoorConnection, MapPose, ParsedMap } from "./types";

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

    const childZ = childPose.z;
    placeGroupShortestDoorClearance(maps, poses, {
      anchorMapId: parentId,
      groupIds: [childId],
      linkedMapId: childId,
      edge,
      fixedRect: mapArtRect(parentMap, parentPose),
      gap,
      anchorDoorMapId: parentId,
      groupDoorAt: (linkedPose) => ({
        x: linkedPose.x + edge.fromX,
        y: linkedPose.y + edge.fromY,
      }),
    });
    const nextPose: MapPose | undefined = poses[childId];
    if (nextPose) {
      nextPose.z = childZ;
    }
  }
}
