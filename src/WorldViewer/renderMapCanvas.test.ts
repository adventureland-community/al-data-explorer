import {
  MAX_MAP_TEXTURE,
  mapTextureScale,
  mapWaterFrameIndex,
  parseTileDef,
  presentMapArt,
  tileDestRect,
  tileFrameSource,
  waterFrame,
} from "./renderMapCanvas";

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
  it("stays 1:1 when both sides fit in MAX_MAP_TEXTURE", () => {
    expect(mapTextureScale(-1616, 2320, -1040, 2232)).toBe(1);
  });

  it("caps the longest side at MAX_MAP_TEXTURE", () => {
    expect(mapTextureScale(0, MAX_MAP_TEXTURE * 2, 0, 10)).toBe(0.5);
  });
});

describe("tileDestRect", () => {
  it("rounds dest pixels so scaled tiles share edges", () => {
    expect(tileDestRect(16, 32, 0, 0, 16, 16, 0.5)).toEqual({ x: 8, y: 16, w: 8, h: 8 });
    expect(tileDestRect(0, 0, -1, -1, 16, 16, 1)).toEqual({ x: 1, y: 1, w: 16, h: 16 });
  });
});

describe("mapWaterFrameIndex", () => {
  it("indexes the 3 baked water frames with the 0,1,2,1 cycle", () => {
    expect(mapWaterFrameIndex(0, 3)).toBe(0);
    expect(mapWaterFrameIndex(480, 3)).toBe(1);
    expect(mapWaterFrameIndex(960, 3)).toBe(2);
    expect(mapWaterFrameIndex(1440, 3)).toBe(1);
    expect(mapWaterFrameIndex(1920, 1)).toBe(0);
  });
});

describe("presentMapArt", () => {
  function canvas(): HTMLCanvasElement {
    const el = document.createElement("canvas");
    el.width = 2;
    el.height = 2;
    return el;
  }

  function displayCanvas(): HTMLCanvasElement {
    const el = canvas();
    const ctx = {
      imageSmoothingEnabled: false,
      clearRect: jest.fn(),
      drawImage: jest.fn(),
    };
    el.getContext = (() => ctx) as unknown as HTMLCanvasElement["getContext"];
    return el;
  }

  it("skips work when the shown water frame is unchanged", () => {
    const frame = canvas();
    expect(
      presentMapArt(
        {
          frames: [frame],
          displayCanvas: frame,
          overlay: null,
          paintOverlay: null,
          needsAnimation: false,
          shownFrame: 0,
        },
        0,
      ),
    ).toBe(false);
  });

  it("blits a new water frame onto the display canvas", () => {
    const bake = {
      frames: [canvas(), canvas(), canvas()],
      displayCanvas: displayCanvas(),
      overlay: null,
      paintOverlay: null,
      needsAnimation: true,
      shownFrame: -1,
    };
    expect(presentMapArt(bake, 0)).toBe(true);
    expect(bake.shownFrame).toBe(0);
    expect(presentMapArt(bake, 0)).toBe(false);
  });
});
