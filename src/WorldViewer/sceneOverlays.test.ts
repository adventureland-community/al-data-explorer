import { gameToShapePoint } from "./sceneOverlays";

describe("gameToShapePoint", () => {
  it("negates game Y so rotateX(-π/2) maps onto world +Z", () => {
    expect(gameToShapePoint(20, 40)).toEqual([20, -40]);
    expect(gameToShapePoint(-880, -352)).toEqual([-880, 352]);
  });
});
