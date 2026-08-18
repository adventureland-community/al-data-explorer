import { DoorConnection, MapPose } from "./types";

export interface DoorPoint {
  x: number;
  y: number;
}

export function doorWorldPoint(
  mapId: string,
  edge: DoorConnection,
  poses: Record<string, MapPose>,
): DoorPoint | null {
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

export function doorLinkedPose(
  anchorPose: MapPose,
  edge: DoorConnection,
  childId: string,
): MapPose {
  const forward = edge.fromMap !== childId;
  return {
    x: forward ? anchorPose.x + edge.fromX - edge.toX : anchorPose.x - edge.fromX + edge.toX,
    y: forward ? anchorPose.y + edge.fromY - edge.toY : anchorPose.y - edge.fromY + edge.toY,
    z: anchorPose.z,
  };
}

export function pickShortestOption<T>(options: T[], score: (option: T) => number): T {
  return options.reduce((best, option) => (score(option) < score(best) ? option : best));
}

export function doorToDoorDistance(a: DoorPoint, b: DoorPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
