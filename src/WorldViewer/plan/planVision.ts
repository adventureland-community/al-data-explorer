/**
 * Entity visibility from a position — matches Adventure Land server
 * `within_xy_range` / `send_all_xy` (adventureland_mongodb).
 *
 * Server sets `player.vision = B.vision` where `B.vision = [700, 500]` are
 * half-extents. An entity at (x,y) is visible when:
 *   observer.x - vision[0] < x < observer.x + vision[0]
 *   observer.y - vision[1] < y < observer.y + vision[1]
 * → full scout box 1400×1000 centered on the ghost.
 */
export const PLAN_VISION_HALF_X = 700;
export const PLAN_VISION_HALF_Y = 500;
export const PLAN_VISION_WIDTH = PLAN_VISION_HALF_X * 2;
export const PLAN_VISION_HEIGHT = PLAN_VISION_HALF_Y * 2;

/** Soft teal fill for scout vision overlays. */
export const PLAN_VISION_COLOR = "#4dd0e1";

export function visionRectForPoint(point: { x: number; y: number }): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: point.x - PLAN_VISION_HALF_X,
    y: point.y - PLAN_VISION_HALF_Y,
    width: PLAN_VISION_WIDTH,
    height: PLAN_VISION_HEIGHT,
  };
}

/** Same predicate as server `within_xy_range` (same map assumed). */
export function entityInVision(
  observer: { x: number; y: number },
  entity: { x: number; y: number },
): boolean {
  return (
    observer.x - PLAN_VISION_HALF_X < entity.x &&
    entity.x < observer.x + PLAN_VISION_HALF_X &&
    observer.y - PLAN_VISION_HALF_Y < entity.y &&
    entity.y < observer.y + PLAN_VISION_HALF_Y
  );
}
