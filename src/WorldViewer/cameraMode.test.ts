import { cameraMode } from "./cameraMode";

describe("cameraMode", () => {
  it("puts HUD selection flags on the camera mode table", () => {
    expect(cameraMode("map").allowClearSelection).toBe(false);
    expect(cameraMode("map").showLayerSlider).toBe(false);
    expect(cameraMode("map").showConnectionLegend).toBe(false);
    expect(cameraMode("world").allowClearSelection).toBe(true);
    expect(cameraMode("world").showLayerSlider).toBe(true);
    expect(cameraMode("world").showConnectionLegend).toBe(true);
  });
});
