/**
 * Adventure Land client vision is a fixed rectangle around the character
 * (`character.vision` — typed as a 1400×1000 box).
 */
export const PLAN_VISION_WIDTH = 1400;
export const PLAN_VISION_HEIGHT = 1000;

/** Soft teal fill for scout vision overlays. */
export const PLAN_VISION_COLOR = "#4dd0e1";

export function visionRectForPoint(point: { x: number; y: number }): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: point.x - PLAN_VISION_WIDTH / 2,
    y: point.y - PLAN_VISION_HEIGHT / 2,
    width: PLAN_VISION_WIDTH,
    height: PLAN_VISION_HEIGHT,
  };
}
