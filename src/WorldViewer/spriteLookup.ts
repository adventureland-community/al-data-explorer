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
  colNum: number;
  rowNum: number;
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
  type?: string;
};

function spriteGridSize(type: string | undefined): { colNum: number; rowNum: number } {
  switch (type) {
    case "animation":
      return { colNum: 3, rowNum: 1 };
    case "tail":
      return { colNum: 4, rowNum: 4 };
    case "v_animation":
    case "head":
    case "hair":
    case "hat":
    case "s_wings":
    case "face":
    case "makeup":
    case "beard":
      return { colNum: 1, rowNum: 4 };
    case "emblem":
    case "gravestone":
      return { colNum: 1, rowNum: 1 };
    case "full":
    case "wings":
    case "body":
    case "armor":
    case "skin":
    case "character":
    case "upper":
    case "a_makeup":
    case "a_hat":
    case undefined:
      return { colNum: 3, rowNum: 4 };
    default:
      return { colNum: 3, rowNum: 4 };
  }
}

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
  const { colNum, rowNum } = spriteGridSize(match.data.type);
  const cellWidth = image.width / (columns * colNum);
  const cellHeight = image.height / (rows * rowNum);

  const dimension = dimensions[skin];
  let viewWidth = cellWidth;
  let viewHeight = cellHeight;
  let offsetX = 0;
  let offsetY = 0;
  if (dimension) {
    viewWidth = dimension[0] * size;
    viewHeight = dimension[1] * size;
    offsetX = Math.round((cellWidth * size - viewWidth) / 2 + (dimension[2] || 0) * size);
    offsetY = Math.round(cellHeight * size - viewHeight);
  }

  return {
    url: adventureLandAssetUrl(match.data.file),
    sheetWidth: image.width * size,
    sheetHeight: image.height * size,
    cellWidth: cellWidth * size,
    cellHeight: cellHeight * size,
    row: match.row,
    col: match.col,
    colNum,
    rowNum,
    offsetX,
    offsetY,
    viewWidth: Math.max(1, viewWidth),
    viewHeight: Math.max(1, viewHeight),
  };
}

/** Source rect on the natural sprite sheet for a specific facing column and animation row. */
export function spriteClipSourceFrame(
  clip: SpriteSheetClip,
  naturalWidth: number,
  facingCol: number,
  animRow: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const scale = clip.sheetWidth / Math.max(naturalWidth, 1);
  const skinOriginX = clip.col * clip.colNum * clip.cellWidth;
  const skinOriginY = clip.row * clip.rowNum * clip.cellHeight;
  return {
    sx: (skinOriginX + facingCol * clip.cellWidth + clip.offsetX) / scale,
    sy: (skinOriginY + animRow * clip.cellHeight + clip.offsetY) / scale,
    sw: clip.viewWidth / scale,
    sh: clip.viewHeight / scale,
  };
}

/** Source rect on the natural sprite sheet (facing direction 0, frame 0). */
export function spriteClipSource(
  clip: SpriteSheetClip,
  naturalWidth: number,
): { sx: number; sy: number; sw: number; sh: number } {
  return spriteClipSourceFrame(clip, naturalWidth, 0, 0);
}

/** Paint a specific facing + animation frame from the sprite sheet. */
export function paintSpriteClipFrame(
  image: HTMLImageElement,
  clip: SpriteSheetClip,
  facingCol: number,
  animRow: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(clip.viewWidth));
  canvas.height = Math.max(1, Math.round(clip.viewHeight));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }
  ctx.imageSmoothingEnabled = false;
  const source = spriteClipSourceFrame(clip, image.naturalWidth || image.width, facingCol, animRow);
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

export function paintSpriteClip(image: HTMLImageElement, clip: SpriteSheetClip): HTMLCanvasElement {
  return paintSpriteClipFrame(image, clip, 0, 0);
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
