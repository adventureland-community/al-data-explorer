import { componentArtBounds, shiftMapPoses, virtualShiftedPoses } from "./layoutBounds";
import {
  doorLinkedPose,
  doorToDoorDistance,
  doorWorldPoint,
  DoorPoint,
  pickShortestOption,
} from "./doorGeometry";
import { minCardinalClearance, ArtRect } from "./rectLayout";
import { DoorConnection, MapPose, ParsedMap } from "./types";

export interface ShortestDoorPlacementSpec {
  anchorMapId: string;
  groupIds: string[];
  linkedMapId: string;
  edge: DoorConnection;
  fixedRect: ArtRect;
  gap: number;
  anchorDoorMapId: string;
  groupDoorAt: (linkedPose: MapPose) => DoorPoint;
}

/** Shift a rigid map group to the shortest straight door link that clears a fixed rect. */
export function placeGroupShortestDoorClearance(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  spec: ShortestDoorPlacementSpec,
): void {
  const anchorPose = poses[spec.anchorMapId];
  const linkedPose = poses[spec.linkedMapId];
  if (!anchorPose || !linkedPose) {
    return;
  }

  const alignedLinked = doorLinkedPose(anchorPose, spec.edge, spec.linkedMapId);
  const alignDx = alignedLinked.x - linkedPose.x;
  const alignDy = alignedLinked.y - linkedPose.y;
  const alignedPoses = virtualShiftedPoses(poses, spec.groupIds, alignDx, alignDy);
  const groupRect = componentArtBounds(maps, alignedPoses, spec.groupIds);
  const doorAnchor = doorWorldPoint(spec.anchorDoorMapId, spec.edge, alignedPoses);
  if (!doorAnchor) {
    return;
  }

  const options = minCardinalClearance(spec.fixedRect, groupRect, spec.gap);
  const best = pickShortestOption(options, (option) => {
    const candidatePoses = virtualShiftedPoses(alignedPoses, spec.groupIds, option.dx, option.dy);
    const linkedCandidate = candidatePoses[spec.linkedMapId];
    if (!linkedCandidate) {
      return Infinity;
    }
    return doorToDoorDistance(doorAnchor, spec.groupDoorAt(linkedCandidate));
  });

  shiftMapPoses(poses, spec.groupIds, alignDx + best.dx, alignDy + best.dy);
}
