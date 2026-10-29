import { markerOverlaySizes } from "./NpcMapPreview";

describe("markerOverlaySizes", () => {
  it("keeps hop-thumb frames compact", () => {
    const sizes = markerOverlaySizes(2, 72, 72);
    expect(sizes.compact).toBe(true);
    expect(sizes.overview).toBe(false);
    expect(sizes.doorFontPx).toBeLessThanOrEqual(8);
    expect(sizes.npcFontPx).toBeLessThanOrEqual(11);
    expect(sizes.showNpcLabels).toBe(true);
  });

  it("shrinks overview chrome when the full map is cover-zoomed out", () => {
    // Mainland Map Detail: bake ~4k into a phone-width frame → cssScale ≈ 0.11
    const mobile = markerOverlaySizes(0.11, 350, 360);
    expect(mobile.compact).toBe(false);
    expect(mobile.overview).toBe(true);
    expect(mobile.doorFontPx).toBeLessThanOrEqual(7);
    expect(mobile.spriteScale).toBeLessThanOrEqual(0.4);
    expect(mobile.doorLabelLines).toBe(1);
    expect(mobile.showNpcLabels).toBe(false);

    const desktop = markerOverlaySizes(0.18, 720, 360);
    expect(desktop.overview).toBe(true);
    expect(desktop.doorFontPx).toBeLessThanOrEqual(8);
    expect(desktop.spriteScale).toBeLessThanOrEqual(0.4);
    expect(desktop.showNpcLabels).toBe(false);
  });

  it("keeps cropped hero markers readable when zoomed in", () => {
    const sizes = markerOverlaySizes(1.2, 560, 340);
    expect(sizes.compact).toBe(false);
    expect(sizes.overview).toBe(false);
    expect(sizes.doorFontPx).toBeGreaterThanOrEqual(18);
    expect(sizes.npcFontPx).toBeGreaterThanOrEqual(16);
    expect(sizes.spriteScale).toBeGreaterThanOrEqual(2);
    expect(sizes.doorLabelLines).toBe(2);
    expect(sizes.showNpcLabels).toBe(true);
  });
});
