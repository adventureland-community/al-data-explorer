import { GDimension, GImage, GSprite } from "typed-adventureland";
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

export function createSpriteElement(clip: SpriteSheetClip): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.overflow = "hidden";
  wrap.style.width = `${clip.viewWidth}px`;
  wrap.style.height = `${clip.viewHeight}px`;
  wrap.style.pointerEvents = "none";

  const image = document.createElement("img");
  image.src = clip.url;
  image.alt = "";
  image.style.width = `${clip.sheetWidth}px`;
  image.style.height = `${clip.sheetHeight}px`;
  image.style.marginTop = `-${clip.row * clip.cellHeight + clip.offsetY}px`;
  image.style.marginLeft = `-${clip.col * clip.cellWidth + clip.offsetX / 2}px`;
  image.style.imageRendering = "pixelated";
  image.style.display = "block";
  image.style.pointerEvents = "none";
  wrap.appendChild(image);
  return wrap;
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
