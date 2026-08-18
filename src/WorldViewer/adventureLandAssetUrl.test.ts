import { adventureLandAssetUrl, collectArtAssets, loadImage } from "./adventureLandAssetUrl";

describe("adventureLandAssetUrl", () => {
  it("serves a same-origin public path without the cache-bust query", () => {
    expect(adventureLandAssetUrl("/images/tiles/map/castle.png?v=2")).toBe(
      "/images/tiles/map/castle.png",
    );
    expect(adventureLandAssetUrl("images/sprites/monsters/bee.png")).toBe(
      "/images/sprites/monsters/bee.png",
    );
  });

  it("errors with an npm run update hint when local art is missing", async () => {
    const OriginalImage = window.Image;
    window.Image = class {
      crossOrigin = "";

      decoding = "";

      onload: (() => void) | null = null;

      onerror: (() => void) | null = null;

      set src(_url: string) {
        queueMicrotask(() => this.onerror?.());
      }
    } as unknown as typeof Image;
    try {
      await expect(loadImage("/images/missing-tileset.png")).rejects.toThrow(
        /Missing local art \/images\/missing-tileset.png.*npm run update/,
      );
    } finally {
      window.Image = OriginalImage;
    }
  });
});

describe("collectArtAssets", () => {
  it("dedupes tilesets and sprites onto query-stripped paths", () => {
    expect(
      collectArtAssets({
        tilesets: {
          castle: { file: "/images/tiles/map/castle.png?v=2" },
          water: { file: "/images/tiles/map/water_updated.png?v=13" },
        },
        sprites: {
          bees: { file: "/images/tiles/characters/custom1.png?v=5" },
          alsoBees: { file: "/images/tiles/characters/custom1.png" },
        },
      }),
    ).toEqual([
      {
        path: "/images/tiles/characters/custom1.png",
        remotePath: "/images/tiles/characters/custom1.png",
      },
      { path: "/images/tiles/map/castle.png", remotePath: "/images/tiles/map/castle.png?v=2" },
      {
        path: "/images/tiles/map/water_updated.png",
        remotePath: "/images/tiles/map/water_updated.png?v=13",
      },
    ]);
  });
});
