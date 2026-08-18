import { parseTimedLayer, parseTileDef, tileAnimFrame, waterFrame } from "./renderMapCanvas";

describe("tileAnimFrame", () => {
  const waterDef = parseTileDef(["water", 0, 0, 16], {
    frames: 3,
    frame_width: 48,
    file: "/x.png",
  });

  it("cycles water tiles with the global water clock", () => {
    expect(waterDef && tileAnimFrame(waterDef, 0, { kind: "water" })).toBe(0);
    expect(waterDef && tileAnimFrame(waterDef, 960, { kind: "water" })).toBe(2);
    expect(waterDef && tileAnimFrame(waterDef, 1440, { kind: "water" })).toBe(waterFrame(1440) % 3);
  });

  it("steps interval animations after delay", () => {
    const def = parseTileDef(["lights", 0, 0, 16, null, 4], {
      frames: 4,
      frame_width: 16,
      file: "/x.png",
    });
    expect(def && tileAnimFrame(def, 0, { kind: "interval", intervalMs: 180, delayMs: 0 })).toBe(0);
    expect(def && tileAnimFrame(def, 179, { kind: "interval", intervalMs: 180, delayMs: 0 })).toBe(
      0,
    );
    expect(def && tileAnimFrame(def, 180, { kind: "interval", intervalMs: 180, delayMs: 0 })).toBe(
      1,
    );
    expect(def && tileAnimFrame(def, 720, { kind: "interval", intervalMs: 180, delayMs: 0 })).toBe(
      0,
    );
  });

  it("respects animation delay from geometry", () => {
    const def = parseTileDef(["lights", 0, 0, 16], { frames: 2, frame_width: 16, file: "/x.png" });
    expect(
      def && tileAnimFrame(def, 200, { kind: "interval", intervalMs: 100, delayMs: 500 }),
    ).toBe(0);
    expect(
      def && tileAnimFrame(def, 600, { kind: "interval", intervalMs: 100, delayMs: 500 }),
    ).toBe(1);
  });
});

describe("parseTimedLayer", () => {
  it("reads interval and delay from geometry.animations rows", () => {
    expect(parseTimedLayer([238, 88, -232, 104, -232, 80, "0", -999])).toEqual({
      placement: [238, 88, -232, 104, -232, 80, "0", -999],
      intervalMs: 80,
      delayMs: 0,
      alpha: 1,
    });
  });

  it("ignores zero or missing intervals", () => {
    expect(parseTimedLayer([238, 88, -232, 104, -232, 0])).toBeNull();
    expect(parseTimedLayer([238, 88, -232])).toBeNull();
  });
});
