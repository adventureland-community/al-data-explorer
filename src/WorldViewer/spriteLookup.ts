import { GDimension, GImage, GMonster, GSprite } from "typed-adventureland";
import { adventureLandAssetUrl } from "./adventureLandAssetUrl";

export interface SpriteSheetClip {
  url: string;
  sheetWidth: number;
  sheetHeight: number;
  cellWidth: number;
  cellHeight: number;
  row: number;
  col: number;
  offsetX: number;
  offsetY: number;
  viewWidth: number;
  viewHeight: number;
}

type SpriteMatrixEntry = GSprite & {
  matrix?: unknown[][];
  file?: string;
  columns?: number;
  rows?: number;
};

function matrixPosition(value: unknown, matrix: unknown[][]): { row: number; col: number } | null {
  for (let row = 0; row < matrix.length; row += 1) {
    const col = matrix[row].indexOf(value);
    if (col !== -1) {
      return { row, col };
    }
  }
  return null;
}

export function lookupSkinSprite(
  sprites: Record<string, SpriteMatrixEntry>,
  images: Record<string, GImage>,
  dimensions: Record<string, GDimension>,
  skin: string,
  size = 1,
): SpriteSheetClip | null {
  if (!skin) {
    return null;
  }

  let match: { data: SpriteMatrixEntry; row: number; col: number } | null = null;
  for (const entry of Object.values(sprites)) {
    if (!entry?.matrix || !entry.file) {
      continue;
    }
    const position = matrixPosition(skin, entry.matrix);
    if (position) {
      match = { data: entry, row: position.row, col: position.col };
      break;
    }
  }
  if (!match) {
    return null;
  }

  const imageKey = match.data.file.split("?")[0];
  const image = images[imageKey];
  if (!image?.width || !image?.height) {
    return null;
  }

  const columns = match.data.columns || 1;
  const rows = match.data.rows || 1;
  const cellWidth = (image.width / columns) * size;
  const cellHeight = (image.height / rows) * size;
  const dimension = dimensions[skin];
  let offsetX = 0;
  let offsetY = 0;
  if (dimension) {
    offsetX = cellWidth / 3 - dimension[0] * size;
    offsetY = cellHeight / 4 - (dimension[2] || 0) - dimension[1] * size;
  }

  return {
    url: adventureLandAssetUrl(match.data.file),
    sheetWidth: image.width * size,
    sheetHeight: image.height * size,
    cellWidth,
    cellHeight,
    row: match.row,
    col: match.col,
    offsetX,
    offsetY,
    viewWidth: Math.max(1, cellWidth / 3 - offsetX),
    viewHeight: Math.max(1, cellHeight / 4 - offsetY),
  };
}

/** Source rect on the natural sprite sheet that the old CSS clip window showed. */
export function spriteClipSource(
  clip: SpriteSheetClip,
  naturalWidth: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const size = clip.sheetWidth / Math.max(naturalWidth, 1);
  return {
    sx: (clip.col * clip.cellWidth + clip.offsetX / 2) / size,
    sy: (clip.row * clip.cellHeight + clip.offsetY) / size,
    sw: clip.viewWidth / size,
    sh: clip.viewHeight / size,
  };
}

export function paintSpriteClip(image: HTMLImageElement, clip: SpriteSheetClip): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(clip.viewWidth));
  canvas.height = Math.max(1, Math.round(clip.viewHeight));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }
  ctx.imageSmoothingEnabled = false;
  const source = spriteClipSource(clip, image.naturalWidth || image.width);
  ctx.drawImage(
    image,
    source.sx,
    source.sy,
    source.sw,
    source.sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

export function collectMonsterTypes(
  maps: Record<string, { monsters: Array<{ type: string }> }>,
): string[] {
  const types = new Set<string>();
  for (const map of Object.values(maps)) {
    for (const monster of map.monsters) {
      types.add(monster.type);
    }
  }
  return [...types].sort((a, b) => a.localeCompare(b));
}

export function collectUsedSpriteUrls(
  maps: Record<string, { npcs: Array<{ skin: string }>; monsters: Array<{ type: string }> }>,
  ctx: {
    sprites: Record<string, SpriteMatrixEntry>;
    images: Record<string, GImage>;
    dimensions: Record<string, GDimension>;
    monsters: Record<string, GMonster>;
  },
): string[] {
  const urls = new Set<string>();
  for (const map of Object.values(maps)) {
    for (const npc of map.npcs) {
      const clip = lookupSkinSprite(ctx.sprites, ctx.images, ctx.dimensions, npc.skin);
      if (clip) {
        urls.add(clip.url);
      }
    }
    for (const monster of map.monsters) {
      const def = ctx.monsters[monster.type];
      const clip = lookupSkinSprite(
        ctx.sprites,
        ctx.images,
        ctx.dimensions,
        def?.skin || monster.type,
        def?.size || 1,
      );
      if (clip) {
        urls.add(clip.url);
      }
    }
  }
  return [...urls].sort((a, b) => a.localeCompare(b));
}
