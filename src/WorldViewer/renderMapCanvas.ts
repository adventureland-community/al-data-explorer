import { GGeometry, GTileset } from "typed-adventureland";

export const MAX_MAP_TEXTURE = 4096;
/** game.js water_frame: [0,1,2,1][round(mssince(inception) / 480) % 4] */
export const WATER_FRAME_MS = 480;
export const WATER_FRAME_CYCLE = [0, 1, 2, 1] as const;

export interface TileDef {
  set: string;
  sx: number;
  sy: number;
  w: number;
  h: number;
  frames: number;
  frameWidth: number;
}

/** Matches game.js create_map tile parsing (element[4]=nunv, frames from tileset or element[5]). */
export function parseTileDef(raw: unknown, tileset?: GTileset): TileDef | null {
  if (!Array.isArray(raw) || typeof raw[0] !== "string") {
    return null;
  }

  let w: number;
  let h: number;
  if (Array.isArray(raw[3])) {
    w = Number(raw[3][0]);
    h = Number(raw[3][1]);
  } else {
    w = Number(raw[3]);
    h = raw[4] == null ? w : Number(raw[4]);
  }
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
    return null;
  }

  let frames = tileset?.frames || 1;
  let frameWidth = tileset?.frame_width ?? w;
  if (raw[5] != null) {
    frames = Number(raw[5]);
    frameWidth = w;
  }
  if (!Number.isFinite(frames) || frames < 1) {
    frames = 1;
  }
  if (!Number.isFinite(frameWidth) || frameWidth <= 0) {
    frameWidth = w;
  }

  return {
    set: raw[0],
    sx: Number(raw[1]),
    sy: Number(raw[2]),
    w,
    h,
    frames,
    frameWidth,
  };
}

export function waterFrame(elapsedMs: number): number {
  const index = Math.round(elapsedMs / WATER_FRAME_MS) % WATER_FRAME_CYCLE.length;
  return WATER_FRAME_CYCLE[index];
}

/** How a tile clip advances — mirrors game.js water sync vs xmap interval sprites. */
export type TileAnimMode =
  | { kind: "water" }
  | { kind: "interval"; intervalMs: number; delayMs: number };

export function tileAnimFrame(def: TileDef, elapsedMs: number, mode: TileAnimMode): number {
  if (def.frames <= 1) {
    return 0;
  }
  if (mode.kind === "water") {
    return waterFrame(elapsedMs) % def.frames;
  }
  const delayMs = mode.delayMs || 0;
  const intervalMs = mode.intervalMs || 1;
  const adjusted = Math.max(0, elapsedMs - delayMs);
  return Math.floor(adjusted / intervalMs) % def.frames;
}

export interface TimedTileLayer {
  intervalMs: number;
  delayMs: number;
  alpha: number;
}

/** geometry.animations / nights: [tile, x, y, x2?, y2?, interval, delay?, z?] */
export function parseTimedLayer(raw: unknown, alpha = 1): TimedTileLayer | null {
  if (!Array.isArray(raw) || raw.length < 6) {
    return null;
  }
  const intervalMs = Number(raw[5]);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return null;
  }
  const delayMs = raw[6] == null ? 0 : Number(raw[6]);
  return {
    intervalMs,
    delayMs: Number.isFinite(delayMs) ? delayMs : 0,
    alpha,
  };
}

export function tileFrameSource(def: TileDef, frame = 0): { sx: number; sy: number } {
  const index = ((frame % def.frames) + def.frames) % def.frames;
  return {
    sx: def.sx + index * def.frameWidth,
    sy: def.sy,
  };
}

/** Integer dest rect so tile edges do not gap or overlap after scale. */
export function tileDestRect(
  x: number,
  y: number,
  originX: number,
  originY: number,
  w: number,
  h: number,
  scale: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.round((x - originX) * scale),
    y: Math.round((y - originY) * scale),
    w: Math.max(1, Math.round(w * scale)),
    h: Math.max(1, Math.round(h * scale)),
  };
}

export function mapTextureScale(minX: number, maxX: number, minY: number, maxY: number): number {
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const longest = Math.max(width, height);
  if (longest <= MAX_MAP_TEXTURE) {
    return 1;
  }
  return MAX_MAP_TEXTURE / longest;
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  def: TileDef,
  x: number,
  y: number,
  originX: number,
  originY: number,
  scale: number,
  frame = 0,
): void {
  const source = tileFrameSource(def, frame);
  const dest = tileDestRect(x, y, originX, originY, def.w, def.h, scale);
  ctx.drawImage(image, source.sx, source.sy, def.w, def.h, dest.x, dest.y, dest.w, dest.h);
}

function drawTileRange(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  def: TileDef,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  originX: number,
  originY: number,
  scale: number,
  frame = 0,
): void {
  for (let x = x1; x <= x2; x += def.w) {
    for (let y = y1; y <= y2; y += def.h) {
      drawTile(ctx, image, def, x, y, originX, originY, scale, frame);
    }
  }
}

function fillDefaultTile(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  def: TileDef,
  geometry: GGeometry,
  scale: number,
  frame = 0,
): void {
  const source = tileFrameSource(def, frame);
  const tile = document.createElement("canvas");
  tile.width = Math.max(1, Math.round(def.w * scale));
  tile.height = Math.max(1, Math.round(def.h * scale));
  const tileCtx = tile.getContext("2d");
  if (!tileCtx) {
    return;
  }
  tileCtx.imageSmoothingEnabled = false;
  tileCtx.drawImage(image, source.sx, source.sy, def.w, def.h, 0, 0, tile.width, tile.height);
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) {
    return;
  }
  const startX = Math.floor(geometry.min_x / def.w) * def.w;
  const startY = Math.floor(geometry.min_y / def.h) * def.h;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(
    Math.round((startX - geometry.min_x) * scale),
    Math.round((startY - geometry.min_y) * scale),
  );
  ctx.fillStyle = pattern;
  ctx.fillRect(
    0,
    0,
    Math.max(1, Math.round((geometry.max_x - startX) * scale)),
    Math.max(1, Math.round((geometry.max_y - startY) * scale)),
  );
  ctx.restore();
}

interface ResolvedTile {
  def: TileDef;
  image: HTMLImageElement;
}

interface DrawOp {
  tile: ResolvedTile;
  x: number;
  y: number;
  x2: number;
  y2: number;
}

interface TimedDrawOp extends DrawOp {
  intervalMs: number;
  delayMs: number;
  alpha: number;
}

interface MapDrawList {
  defaultTile: ResolvedTile | null;
  placements: DrawOp[];
  decor: DrawOp[];
  timed: TimedDrawOp[];
}

function resolveTile(
  raw: unknown,
  tilesets: Record<string, GTileset>,
  images: Record<string, HTMLImageElement>,
): ResolvedTile | null {
  if (!Array.isArray(raw) || typeof raw[0] !== "string") {
    return null;
  }
  const def = parseTileDef(raw, tilesets[raw[0]]);
  const image = def ? images[def.set] : undefined;
  if (!def || !image) {
    return null;
  }
  return { def, image };
}

function readPlacement(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length < 3) {
    return null;
  }
  const tileIndex = Number(raw[0]);
  const x = Number(raw[1]);
  const y = Number(raw[2]);
  if (![tileIndex, x, y].every(Number.isFinite)) {
    return null;
  }
  const placement = [tileIndex, x, y];
  if (raw.length > 3 && raw[3] != null && Number.isFinite(Number(raw[3]))) {
    placement.push(Number(raw[3]));
  }
  if (raw.length > 4 && raw[4] != null && Number.isFinite(Number(raw[4]))) {
    placement.push(Number(raw[4]));
  }
  return placement;
}

function toDrawOp(
  raw: unknown,
  tiles: unknown[],
  tilesets: Record<string, GTileset>,
  images: Record<string, HTMLImageElement>,
): DrawOp | null {
  const placement = readPlacement(raw);
  if (!placement) {
    return null;
  }
  const tile = resolveTile(tiles[placement[0]], tilesets, images);
  if (!tile) {
    return null;
  }
  return {
    tile,
    x: placement[1],
    y: placement[2],
    x2: placement[3] == null ? placement[1] : placement[3],
    y2: placement[4] == null ? placement[2] : placement[4],
  };
}

function collectDrawOps(
  rawList: Iterable<unknown> | undefined,
  tiles: unknown[],
  tilesets: Record<string, GTileset>,
  images: Record<string, HTMLImageElement>,
): DrawOp[] {
  const ops: DrawOp[] = [];
  for (const raw of rawList || []) {
    const op = toDrawOp(raw, tiles, tilesets, images);
    if (op) {
      ops.push(op);
    }
  }
  return ops;
}

function classifyLayerRows(
  rawList: Iterable<unknown> | undefined,
  tiles: unknown[],
  tilesets: Record<string, GTileset>,
  images: Record<string, HTMLImageElement>,
  timed: TimedDrawOp[],
  defaultAlpha = 1,
): DrawOp[] {
  const decor: DrawOp[] = [];
  for (const raw of rawList || []) {
    const op = toDrawOp(raw, tiles, tilesets, images);
    if (!op) {
      continue;
    }
    const timedMeta = parseTimedLayer(raw, defaultAlpha);
    if (timedMeta) {
      timed.push({
        ...op,
        intervalMs: timedMeta.intervalMs,
        delayMs: timedMeta.delayMs,
        alpha: timedMeta.alpha,
      });
    } else {
      decor.push(op);
    }
  }
  return decor;
}

function buildMapDrawList(
  geometry: GGeometry,
  images: Record<string, HTMLImageElement>,
  tilesets: Record<string, GTileset>,
): MapDrawList {
  const tiles: unknown[] = Array.isArray(geometry.tiles) ? geometry.tiles : [];
  const placements = collectDrawOps(geometry.placements, tiles, tilesets, images);
  for (const group of geometry.groups || []) {
    for (const op of collectDrawOps(group, tiles, tilesets, images)) {
      placements.push(op);
    }
  }
  const timed: TimedDrawOp[] = [];
  return {
    defaultTile:
      geometry.default == null ? null : resolveTile(tiles[geometry.default], tilesets, images),
    placements,
    decor: [
      ...classifyLayerRows(geometry.animations, tiles, tilesets, images, timed),
      ...classifyLayerRows(geometry.nights, tiles, tilesets, images, timed, 0.7),
    ],
    timed,
  };
}

function drawOp(
  ctx: CanvasRenderingContext2D,
  op: DrawOp,
  originX: number,
  originY: number,
  scale: number,
  frame: number,
): void {
  drawTileRange(
    ctx,
    op.tile.image,
    op.tile.def,
    op.x,
    op.y,
    op.x2,
    op.y2,
    originX,
    originY,
    scale,
    frame,
  );
}

function waterFrameOf(def: TileDef, waterIndex: number): number {
  return def.frames > 1 ? waterIndex : 0;
}

function paintMapFrame(
  ctx: CanvasRenderingContext2D,
  geometry: GGeometry,
  list: MapDrawList,
  scale: number,
  waterIndex: number,
): void {
  const originX = geometry.min_x;
  const originY = geometry.min_y;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (list.defaultTile) {
    fillDefaultTile(
      ctx,
      list.defaultTile.image,
      list.defaultTile.def,
      geometry,
      scale,
      waterFrameOf(list.defaultTile.def, waterIndex),
    );
  }
  for (const op of list.placements) {
    drawOp(ctx, op, originX, originY, scale, waterFrameOf(op.tile.def, waterIndex));
  }
  for (const op of list.decor) {
    drawOp(ctx, op, originX, originY, scale, 0);
  }
}

function drawTimedLayers(
  ctx: CanvasRenderingContext2D,
  geometry: GGeometry,
  timed: TimedDrawOp[],
  scale: number,
  elapsedMs: number,
): void {
  const originX = geometry.min_x;
  const originY = geometry.min_y;
  for (const op of timed) {
    const frame = tileAnimFrame(op.tile.def, elapsedMs, {
      kind: "interval",
      intervalMs: op.intervalMs,
      delayMs: op.delayMs,
    });
    if (op.alpha < 1) {
      ctx.save();
      ctx.globalAlpha = op.alpha;
    }
    drawOp(ctx, op, originX, originY, scale, frame);
    if (op.alpha < 1) {
      ctx.restore();
    }
  }
}

function overlaySignature(timed: TimedDrawOp[], elapsedMs: number): string {
  return timed
    .map((op) =>
      tileAnimFrame(op.tile.def, elapsedMs, {
        kind: "interval",
        intervalMs: op.intervalMs,
        delayMs: op.delayMs,
      }),
    )
    .join(",");
}

export interface MapArtBake {
  frames: HTMLCanvasElement[];
  displayCanvas: HTMLCanvasElement;
  overlay: HTMLCanvasElement | null;
  paintOverlay: ((elapsedMs: number) => boolean) | null;
  needsAnimation: boolean;
  shownFrame: number;
}

export function mapWaterFrameIndex(elapsedMs: number, frameCount: number): number {
  if (frameCount <= 1) {
    return 0;
  }
  return waterFrame(elapsedMs) % frameCount;
}

/**
 * Present the water-frame bake (and optional timed overlay) onto displayCanvas.
 * Matches game.js rtextures[water_frame] — one bitmap, placement order, not a
 * water layer stacked on top of the bridge.
 */
export function presentMapArt(bake: MapArtBake, elapsedMs: number): boolean {
  const frameIndex = mapWaterFrameIndex(elapsedMs, bake.frames.length);
  const overlayChanged = Boolean(bake.paintOverlay?.(elapsedMs));
  if (bake.shownFrame === frameIndex && !overlayChanged) {
    return false;
  }
  bake.shownFrame = frameIndex;
  const source = bake.frames[frameIndex];
  if (!bake.overlay && bake.displayCanvas === source) {
    return true;
  }
  const ctx = bake.displayCanvas.getContext("2d");
  if (!ctx) {
    return false;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, bake.displayCanvas.width, bake.displayCanvas.height);
  ctx.drawImage(source, 0, 0);
  if (bake.overlay) {
    ctx.drawImage(bake.overlay, 0, 0);
  }
  return true;
}

function makeCanvas(width: number, height: number, scale: number): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  return canvas;
}

function needsWaterFrames(list: MapDrawList): boolean {
  if (list.defaultTile && list.defaultTile.def.frames > 1) {
    return true;
  }
  for (const op of list.placements) {
    if (op.tile.def.frames > 1) {
      return true;
    }
  }
  return false;
}

/** Bake like game.js rtextures: default water behind, then every placement in order. */
export function renderMapArt(
  geometry: GGeometry,
  images: Record<string, HTMLImageElement>,
  tilesets: Record<string, GTileset>,
): MapArtBake | null {
  const width = geometry.max_x - geometry.min_x;
  const height = geometry.max_y - geometry.min_y;
  if (width <= 0 || height <= 0) {
    return null;
  }
  const scale = mapTextureScale(geometry.min_x, geometry.max_x, geometry.min_y, geometry.max_y);
  const list = buildMapDrawList(geometry, images, tilesets);
  const frameCount = needsWaterFrames(list) ? 3 : 1;

  const frames: HTMLCanvasElement[] = [];
  for (let waterIndex = 0; waterIndex < frameCount; waterIndex += 1) {
    const canvas = makeCanvas(width, height, scale);
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return null;
    }
    paintMapFrame(ctx, geometry, list, scale, waterIndex);
    frames.push(canvas);
  }

  let overlay: HTMLCanvasElement | null = null;
  let paintOverlay: ((elapsedMs: number) => boolean) | null = null;
  if (list.timed.length > 0) {
    overlay = makeCanvas(width, height, scale);
    const overlayCanvas = overlay;
    const overlayCtx = overlayCanvas?.getContext("2d");
    if (overlayCanvas && overlayCtx) {
      overlayCtx.imageSmoothingEnabled = false;
      let lastSignature = "";
      paintOverlay = (elapsedMs: number) => {
        const signature = overlaySignature(list.timed, elapsedMs);
        if (signature === lastSignature) {
          return false;
        }
        lastSignature = signature;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        drawTimedLayers(overlayCtx, geometry, list.timed, scale, elapsedMs);
        return true;
      };
      paintOverlay(0);
    } else {
      overlay = null;
    }
  }

  const displayCanvas =
    frameCount > 1 || overlay ? makeCanvas(width, height, scale) || frames[0] : frames[0];
  const bake: MapArtBake = {
    frames,
    displayCanvas,
    overlay,
    paintOverlay,
    needsAnimation: frameCount > 1 || Boolean(overlay),
    shownFrame: -1,
  };
  presentMapArt(bake, 0);
  return bake;
}
