import {
  PLAN_VISION_HALF_X,
  PLAN_VISION_HALF_Y,
  PLAN_VISION_HEIGHT,
  PLAN_VISION_WIDTH,
  entityInVision,
  visionRectForPoint,
} from "./planVision";

describe("planVision (server within_xy_range)", () => {
  it("centers the B.vision [700,500] half-extent box", () => {
    const rect = visionRectForPoint({ x: 100, y: -50 });
    expect(rect.width).toBe(PLAN_VISION_WIDTH);
    expect(rect.height).toBe(PLAN_VISION_HEIGHT);
    expect(rect.x).toBe(100 - PLAN_VISION_HALF_X);
    expect(rect.y).toBe(-50 - PLAN_VISION_HALF_Y);
  });

  it("matches server within_xy_range edges", () => {
    const observer = { x: 0, y: 0 };
    expect(entityInVision(observer, { x: 699, y: 0 })).toBe(true);
    expect(entityInVision(observer, { x: 700, y: 0 })).toBe(false);
    expect(entityInVision(observer, { x: 0, y: 499 })).toBe(true);
    expect(entityInVision(observer, { x: 0, y: 500 })).toBe(false);
    expect(entityInVision(observer, { x: -699, y: -499 })).toBe(true);
    expect(entityInVision(observer, { x: -700, y: 0 })).toBe(false);
  });
});
