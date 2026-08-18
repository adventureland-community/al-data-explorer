import * as THREE from "three";
import { nearestCanvasTexture } from "./sceneMapArt";
import { spriteCanvasTexture } from "./sceneSprites";
import { spriteClipSource } from "./spriteLookup";

describe("nearestCanvasTexture", () => {
  it("keeps nearest magnification and mipmaps for minification", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const texture = nearestCanvasTexture(canvas);
    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(texture.generateMipmaps).toBe(true);
    texture.dispose();
  });
});

describe("spriteCanvasTexture", () => {
  it("uses nearest filtering without mipmaps", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 24;
    const texture = spriteCanvasTexture(canvas);
    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.minFilter).toBe(THREE.NearestFilter);
    expect(texture.generateMipmaps).toBe(false);
    texture.dispose();
  });
});

describe("spriteClipSource", () => {
  it("maps the CSS clip window back onto natural sheet pixels", () => {
    expect(
      spriteClipSource(
        {
          url: "/images/x.png",
          sheetWidth: 96,
          sheetHeight: 128,
          cellWidth: 32,
          cellHeight: 32,
          row: 1,
          col: 2,
          offsetX: 6,
          offsetY: 4,
          viewWidth: 20,
          viewHeight: 24,
        },
        96,
      ),
    ).toEqual({ sx: 67, sy: 36, sw: 20, sh: 24 });
  });
});
