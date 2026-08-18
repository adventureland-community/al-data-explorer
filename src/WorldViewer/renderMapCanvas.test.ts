import { GGeometry } from "typed-adventureland";
import { mapTextureScale, parseTileDef, tileFrameSource, waterFrame } from "./renderMapCanvas";

describe("parseTileDef", () => {
  it("defaults height to width when omitted", () => {
    expect(parseTileDef(["inside", 440, 32, 16])).toEqual({
      set: "inside",
      sx: 440,
      sy: 32,
      w: 16,
      h: 16,
      frames: 1,
      frameWidth: 16,
    });
  });

  it("keeps an explicit height", () => {
    expect(parseTileDef(["outside", 0, 0, 32, 48])).toEqual({
      set: "outside",
      sx: 0,
      sy: 0,
      w: 32,
      h: 48,
      frames: 1,
      frameWidth: 32,
    });
  });

  it("reads array width and height", () => {
    expect(parseTileDef(["custom", 0, 0, [24, 32]])).toEqual({
      set: "custom",
      sx: 0,
      sy: 0,
      w: 24,
      h: 32,
      frames: 1,
      frameWidth: 24,
    });
  });

  it("uses tileset animation frames", () => {
    expect(
      parseTileDef(["water", 192, 528, 16], { frames: 3, frame_width: 48, file: "/x.png" }),
    ).toEqual({
      set: "water",
      sx: 192,
      sy: 528,
      w: 16,
      h: 16,
      frames: 3,
      frameWidth: 48,
    });
  });

  it("honors per-tile frame count from element[5]", () => {
    expect(
      parseTileDef(["puzzle", 240, 144, 16, null, 3], {
        frames: 3,
        frame_width: 16,
        file: "/x.png",
      }),
    ).toEqual({
      set: "puzzle",
      sx: 240,
      sy: 144,
      w: 16,
      h: 16,
      frames: 3,
      frameWidth: 16,
    });
  });
});

describe("tileFrameSource", () => {
  it("steps horizontally through animated strips", () => {
    const def = parseTileDef(["water", 32, 64, 16], {
      frames: 3,
      frame_width: 48,
      file: "/x.png",
    });
    expect(def && tileFrameSource(def, 0)).toEqual({ sx: 32, sy: 64 });
    expect(def && tileFrameSource(def, 1)).toEqual({ sx: 80, sy: 64 });
    expect(def && tileFrameSource(def, 2)).toEqual({ sx: 128, sy: 64 });
  });
});

describe("waterFrame", () => {
  it("matches game.js [0,1,2,1][round(ms/480)%4]", () => {
    expect(waterFrame(0)).toBe(0);
    expect(waterFrame(239)).toBe(0);
    expect(waterFrame(240)).toBe(1);
    expect(waterFrame(480)).toBe(1);
    expect(waterFrame(960)).toBe(2);
    expect(waterFrame(1440)).toBe(1);
    expect(waterFrame(1920)).toBe(0);
  });
});

describe("mapTextureScale", () => {
  it("caps the longest side at 2048", () => {
    expect(mapTextureScale(-1616, 2320, -1040, 2232)).toBeCloseTo(2048 / 3936);
  });

  it("stays 1:1 for small maps", () => {
    const geo = { min_x: -440, max_x: 440, min_y: -688, max_y: 56 } as GGeometry;
    expect(mapTextureScale(geo.min_x, geo.max_x, geo.min_y, geo.max_y)).toBe(1);
  });
});
