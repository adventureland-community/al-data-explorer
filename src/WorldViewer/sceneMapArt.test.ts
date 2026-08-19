import * as THREE from "three";
import { applyFloorCanvases, floorHasMapArt, nearestCanvasTexture } from "./sceneMapArt";
import { spriteCanvasTexture } from "./sceneSprites";
import { spriteClipSource } from "./spriteLookup";
import { MapArtBake } from "./renderMapCanvas";

function stubBake(): MapArtBake {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  return {
    frames: [canvas],
    displayCanvas: canvas,
    overlay: null,
    paintOverlay: null,
    needsAnimation: false,
    shownFrame: 0,
  };
}

function stubFloor(mapId: string): THREE.Mesh {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshBasicMaterial({ color: 0x1b3d2a }),
  );
  floor.userData.isFloor = true;
  floor.userData.mapId = mapId;
  return floor;
}

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

describe("applyFloorCanvases", () => {
  it("reattaches cached art after the floor mesh is rebuilt", () => {
    const bake = stubBake();
    const art = { main: bake };
    const root = new THREE.Group();
    const first = stubFloor("main");
    root.add(first);
    applyFloorCanvases(root, art, true, 0);
    expect(floorHasMapArt(first)).toBe(true);

    root.remove(first);
    const rebuilt = stubFloor("main");
    root.add(rebuilt);
    applyFloorCanvases(root, art, true, 0);
    expect(floorHasMapArt(rebuilt)).toBe(true);
    expect((rebuilt.material as THREE.MeshBasicMaterial).map).toBeTruthy();
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
          colNum: 1,
          rowNum: 1,
          offsetX: 6,
          offsetY: 4,
          viewWidth: 20,
          viewHeight: 24,
        },
        96,
      ),
    ).toEqual({ sx: 70, sy: 36, sw: 20, sh: 24 });
  });
});
