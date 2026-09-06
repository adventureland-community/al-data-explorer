import { GDimension, GImage } from "typed-adventureland";

type SpriteSheetEntry = {
  file?: string;
  columns?: number;
  rows?: number;
  type?: string;
  size?: string;
  skip?: unknown;
  matrix?: unknown[][];
};

export type SpriteSkinView = {
  file: string;
  sheetType: string | undefined;
  viewWidth: number;
  viewHeight: number;
  originX: number;
  originY: number;
  imageWidth: number;
  imageHeight: number;
  /** Scaled width of one walk/anim column inside the matrix cell. */
  animCellWidth: number;
  colNum: number;
  rowNum: number;
  walkFrame: number;
  direction: number;
};

/**
 * Sub-grid inside each matrix cell — matches `load_game` XYWH / `precompute_image_positions`.
 */
export function spriteGridSize(type: string | undefined): { colNum: number; rowNum: number } {
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
    case "a_makeup":
    case "a_hat":
      // 3 anim columns × 4 facings (`generate_textures` / `set_texture`)
      return { colNum: 3, rowNum: 4 };
    case "full":
    case "wings":
    case "body":
    case "armor":
    case "skin":
    case "character":
    case "upper":
    case undefined:
      return { colNum: 3, rowNum: 4 };
    default:
      return { colNum: 3, rowNum: 4 };
  }
}

/** Cosmetics that cycle walk columns in-game (`a_makeup` via `updates/4`, `a_hat` with walk). */
export function isAnimatedCosmeticType(type: string | undefined): boolean {
  return type === "a_hat" || type === "a_makeup";
}

/** ~`parseInt(updates/4)` at 60fps — one anim cell every 4 draws. */
export const COSMETIC_ANIM_MS = 80;

/**
 * Standing column on a walk strip.
 * `html.js` `sprite_image` keeps the first cell when `col_num == 1` (heads/hair/hats);
 * otherwise it skips one cell. PIXI `new_sprite` uses `textures[skin][1][0]` for body sheets.
 */
export function idleWalkFrame(colNum: number): number {
  return colNum > 1 ? 1 : 0;
}

export function matrixPosition(
  value: unknown,
  matrix: unknown[][],
): { row: number; col: number } | null {
  for (let row = 0; row < matrix.length; row += 1) {
    const col = (matrix[row] as unknown[]).indexOf(value);
    if (col !== -1) return { row, col };
  }
  return null;
}

export type FoundSpriteSheet = {
  data: SpriteSheetEntry;
  row: number;
  col: number;
};

/** Single matrix walk: locate which sheet owns `skin` (and its cell). */
export function findSpriteSheet(
  sprites: Record<string, SpriteSheetEntry | undefined>,
  skin: string,
): FoundSpriteSheet | null {
  if (!skin) return null;
  for (const entry of Object.values(sprites)) {
    if (!entry?.matrix || entry.skip) continue;
    const position = matrixPosition(skin, entry.matrix);
    if (!position) continue;
    return { data: entry, row: position.row, col: position.col };
  }
  return null;
}

export function spriteSkinViewFromMatch(
  match: FoundSpriteSheet,
  images: Record<string, GImage>,
  dimensions: Record<string, GDimension | undefined> | undefined,
  skin: string,
  scale: number,
  opts?: { walkFrame?: number; direction?: number },
): SpriteSkinView | null {
  if (!match.data.file) return null;

  const image = images[match.data.file.split("?")[0]];
  if (!image?.width || !image?.height) return null;

  const columns = match.data.columns || 1;
  const rows = match.data.rows || 1;
  const { colNum, rowNum } = spriteGridSize(match.data.type);
  const cellWidth = (image.width / (columns * colNum)) * scale;
  const cellHeight = (image.height / (rows * rowNum)) * scale;
  const walkFrame = Math.min(colNum - 1, Math.max(0, opts?.walkFrame ?? idleWalkFrame(colNum)));
  const direction = Math.min(rowNum - 1, Math.max(0, opts?.direction ?? 0));

  let viewWidth = cellWidth;
  let viewHeight = cellHeight;
  let offsetX = 0;
  let offsetY = 0;
  const dimension = dimensions?.[skin];
  if (dimension) {
    viewWidth = dimension[0] * scale;
    viewHeight = dimension[1] * scale;
    offsetX = Math.round((cellWidth - viewWidth) / 2 + (dimension[2] || 0) * scale);
    offsetY = Math.round(cellHeight - viewHeight);
  }

  return {
    file: match.data.file,
    sheetType: match.data.type,
    viewWidth: Math.max(1, viewWidth),
    viewHeight: Math.max(1, viewHeight),
    originX: (match.col * colNum + walkFrame) * cellWidth + offsetX,
    originY: (match.row * rowNum + direction) * cellHeight + offsetY,
    imageWidth: image.width * scale,
    imageHeight: image.height * scale,
    animCellWidth: cellWidth,
    colNum,
    rowNum,
    walkFrame,
    direction,
  };
}

export function spriteSkinView(
  sprites: Record<string, SpriteSheetEntry | undefined>,
  images: Record<string, GImage>,
  dimensions: Record<string, GDimension | undefined> | undefined,
  skin: string,
  scale: number,
  opts?: { walkFrame?: number; direction?: number },
): SpriteSkinView | null {
  const match = findSpriteSheet(sprites, skin);
  if (!match) return null;
  return spriteSkinViewFromMatch(match, images, dimensions, skin, scale, opts);
}
