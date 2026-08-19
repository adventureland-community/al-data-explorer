import * as THREE from "three";
import { SpriteSheetClip, paintSpriteClipFrame } from "./spriteLookup";

export interface AtlasEntry {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  width: number;
  height: number;
}

export interface SpriteAtlas {
  texture: THREE.CanvasTexture;
  material: THREE.MeshBasicMaterial;
  entries: Map<string, AtlasEntry>;
}

interface PackItem {
  key: string;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

function nextPowerOf2(n: number): number {
  let v = Math.max(1, Math.ceil(n));
  v -= 1;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  return v + 1;
}

/** Simple shelf-packing algorithm: sort by height descending, pack left-to-right. */
function shelfPack(
  items: PackItem[],
  maxSize: number,
): { width: number; height: number; placed: Array<{ item: PackItem; x: number; y: number }> } {
  const sorted = [...items].sort((a, b) => b.height - a.height || b.width - a.width);

  const placed: Array<{ item: PackItem; x: number; y: number }> = [];
  let shelfX = 0;
  let shelfY = 0;
  let shelfHeight = 0;
  let maxW = 0;

  for (const item of sorted) {
    if (shelfX + item.width > maxSize) {
      shelfY += shelfHeight;
      shelfX = 0;
      shelfHeight = 0;
    }
    placed.push({ item, x: shelfX, y: shelfY });
    shelfHeight = Math.max(shelfHeight, item.height);
    shelfX += item.width;
    maxW = Math.max(maxW, shelfX);
  }

  return { width: maxW, height: shelfY + shelfHeight, placed };
}

export function buildSpriteAtlas(
  clips: Map<string, { clip: SpriteSheetClip; sheet: HTMLImageElement }>,
): SpriteAtlas {
  const items: PackItem[] = [];
  for (const [key, { clip, sheet }] of clips) {
    const canvas = paintSpriteClipFrame(sheet, clip, 0, 0);
    items.push({
      key,
      width: canvas.width,
      height: canvas.height,
      canvas,
    });
  }

  const MAX_ATLAS = 2048;
  const { width, height, placed } = shelfPack(items, MAX_ATLAS);
  const atlasW = Math.min(MAX_ATLAS, nextPowerOf2(width));
  const atlasH = Math.min(MAX_ATLAS, nextPowerOf2(height));

  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = atlasW;
  atlasCanvas.height = atlasH;
  const ctx = atlasCanvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    for (const { item, x, y } of placed) {
      ctx.drawImage(item.canvas, x, y);
    }
  }

  const entries = new Map<string, AtlasEntry>();
  for (const { item, x, y } of placed) {
    entries.set(item.key, {
      u0: x / atlasW,
      v0: 1 - (y + item.height) / atlasH,
      u1: (x + item.width) / atlasW,
      v1: 1 - y / atlasH,
      width: item.width,
      height: item.height,
    });
  }

  const texture = new THREE.CanvasTexture(atlasCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    side: THREE.DoubleSide,
    alphaTest: 0.01,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  return { texture, material, entries };
}
