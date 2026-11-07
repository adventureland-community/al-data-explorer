import { PLAN_VISION_HEIGHT, PLAN_VISION_WIDTH, visionRectForPoint } from "./planVision";

describe("visionRectForPoint", () => {
  it("centers the 1400×1000 AL vision box on the ghost", () => {
    const rect = visionRectForPoint({ x: 100, y: -50 });
    expect(rect.width).toBe(PLAN_VISION_WIDTH);
    expect(rect.height).toBe(PLAN_VISION_HEIGHT);
    expect(rect.x).toBe(100 - PLAN_VISION_WIDTH / 2);
    expect(rect.y).toBe(-50 - PLAN_VISION_HEIGHT / 2);
  });
});
