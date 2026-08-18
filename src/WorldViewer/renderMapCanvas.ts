import { GGeometry, GTileset } from "typed-adventureland";

export const MAX_MAP_TEXTURE = 2048;
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
  placement: number[];
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
    placement: raw as number[],
    intervalMs,
    delayMs: Number.isFinite(delayMs) ? delayMs : 0,
    alpha,
  };
}

export function collectTimedLayers(geometry: {
  animations?: unknown[];
  nights?: unknown[];
}): TimedTileLayer[] {
  const layers: TimedTileLayer[] = [];
  for (const raw of geometry.animations || []) {
    const layer = parseTimedLayer(raw, 1);
    if (layer) {
      layers.push(layer);
    }
  }
  for (const raw of geometry.nights || []) {
    const layer = parseTimedLayer(raw, 1);
    if (layer) {
      layers.push(layer);
    }
  }
  return layers;
}

function timedLayerKey(placement: number[]): string {
  return placement.map((value) => String(value)).join("|");
}

export function timedLayerKeys(layers: TimedTileLayer[]): Set<string> {
  return new Set(layers.map((layer) => timedLayerKey(layer.placement)));
}

export function tileFrameSource(def: TileDef, frame = 0): { sx: number; sy: number } {
  const index = ((frame % def.frames) + def.frames) % def.frames;
  return {
    sx: def.sx + index * def.frameWidth,
    sy: def.sy,
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
  ctx.drawImage(
    image,
    source.sx,
    source.sy,
    def.w,
    def.h,
    (x - originX) * scale,
    (y - originY) * scale,
    def.w * scale,
    def.h * scale,
  );
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
  ctx.translate((startX - geometry.min_x) * scale, (startY - geometry.min_y) * scale);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, (geometry.max_x - startX) * scale, (geometry.max_y - startY) * scale);
  ctx.restore();
}

function drawPlacement(
  ctx: CanvasRenderingContext2D,
  images: Record<string, HTMLImageElement>,
  tiles: unknown[],
  tilesets: Record<string, GTileset>,
  placement: number[],
  originX: number,
  originY: number,
  scale: number,
  frame = 0,
): void {
  const raw = tiles[placement[0]];
  const def = parseTileDef(raw, tilesets[(raw as [string])[0]]);
  const image = def ? images[def.set] : undefined;
  if (!def || !image) {
    return;
  }
  const x2 = placement[3] == null ? placement[1] : placement[3];
  const y2 = placement[4] == null ? placement[2] : placement[4];
  drawTileRange(
    ctx,
    image,
    def,
    placement[1],
    placement[2],
    x2,
    y2,
    originX,
    originY,
    scale,
    frame,
  );
}

function tileDefOf(
  raw: unknown,
  tilesets: Record<string, GTileset>,
  images: Record<string, HTMLImageElement>,
): { def: TileDef; image: HTMLImageElement } | null {
  const def = parseTileDef(raw, tilesets[(raw as [string])?.[0]]);
  const image = def ? images[def.set] : undefined;
  if (!def || !image) {
    return null;
  }
  return { def, image };
}

function isAnimated(def: TileDef): boolean {
  return def.frames > 1;
}

function defaultFillOffset(geometry: GGeometry, def: TileDef): { x: number; y: number } {
  const startX = Math.floor(geometry.min_x / def.w) * def.w;
  const startY = Math.floor(geometry.min_y / def.h) * def.h;
  return { x: startX - geometry.min_x, y: startY - geometry.min_y };
}

function drawPlacements(
  ctx: CanvasRenderingContext2D,
  geometry: GGeometry,
  images: Record<string, HTMLImageElement>,
  tilesets: Record<string, GTileset>,
  scale: number,
  frame: number,
  kind: "static" | "animated",
): void {
  const tiles = geometry.tiles as unknown[];
  const originX = geometry.min_x;
  const originY = geometry.min_y;

  if (kind === "static" && geometry.default != null) {
    const parsed = tileDefOf(tiles[geometry.default], tilesets, images);
    if (parsed && !isAnimated(parsed.def)) {
      fillDefaultTile(ctx, parsed.image, parsed.def, geometry, scale, 0);
    }
  }

  for (const placement of geometry.placements || []) {
    const parsed = tileDefOf(tiles[(placement as number[])[0]], tilesets, images);
    if (!parsed || isAnimated(parsed.def) !== (kind === "animated")) {
      continue;
    }
    drawPlacement(
      ctx,
      images,
      tiles,
      tilesets,
      placement as number[],
      originX,
      originY,
      scale,
      frame,
    );
  }

  for (const group of geometry.groups || []) {
    for (const placement of group) {
      const parsed = tileDefOf(tiles[placement[0]], tilesets, images);
      if (!parsed || isAnimated(parsed.def) !== (kind === "animated")) {
        continue;
      }
      drawPlacement(
        ctx,
        images,
        tiles,
        tilesets,
        placement as number[],
        originX,
        originY,
        scale,
        frame,
      );
    }
  }
}

function drawDecor(
  ctx: CanvasRenderingContext2D,
  geometry: GGeometry,
  images: Record<string, HTMLImageElement>,
  tilesets: Record<string, GTileset>,
  scale: number,
  skipTimed: Set<string>,
): void {
  const tiles = geometry.tiles as unknown[];
  const originX = geometry.min_x;
  const originY = geometry.min_y;

  for (const animation of geometry.animations || []) {
    const placement = animation as number[];
    if (skipTimed.has(placement.map((value) => String(value)).join("|"))) {
      continue;
    }
    drawPlacement(ctx, images, tiles, tilesets, placement, originX, originY, scale, 0);
  }

  for (const light of geometry.lights || []) {
    drawPlacement(ctx, images, tiles, tilesets, light as number[], originX, originY, scale, 0);
  }

  for (const night of geometry.nights || []) {
    const placement = night as number[];
    if (skipTimed.has(placement.map((value) => String(value)).join("|"))) {
      continue;
    }
    drawPlacement(ctx, images, tiles, tilesets, placement, originX, originY, scale, 0);
  }
}

function drawTimedLayers(
  ctx: CanvasRenderingContext2D,
  geometry: GGeometry,
  images: Record<string, HTMLImageElement>,
  tilesets: Record<string, GTileset>,
  scale: number,
  elapsedMs: number,
  timedLayers: TimedTileLayer[],
): void {
  const tiles = geometry.tiles as unknown[];
  const originX = geometry.min_x;
  const originY = geometry.min_y;

  for (const timed of timedLayers) {
    const raw = tiles[timed.placement[0]];
    const parsed = tileDefOf(raw, tilesets, images);
    if (!parsed) {
      continue;
    }
    const frame = tileAnimFrame(parsed.def, elapsedMs, {
      kind: "interval",
      intervalMs: timed.intervalMs,
      delayMs: timed.delayMs,
    });
    if (timed.alpha < 1) {
      ctx.save();
      ctx.globalAlpha = timed.alpha;
    }
    drawPlacement(ctx, images, tiles, tilesets, timed.placement, originX, originY, scale, frame);
    if (timed.alpha < 1) {
      ctx.restore();
    }
  }
}

function overlaySignature(
  geometry: GGeometry,
  images: Record<string, HTMLImageElement>,
  tilesets: Record<string, GTileset>,
  elapsedMs: number,
  timedLayers: TimedTileLayer[],
  animatedPlacements: boolean,
): string {
  const parts: number[] = [];
  if (animatedPlacements) {
    parts.push(waterFrame(elapsedMs));
  }
  for (const timed of timedLayers) {
    const raw = (geometry.tiles as unknown[])[timed.placement[0]];
    const parsed = tileDefOf(raw, tilesets, images);
    if (!parsed) {
      continue;
    }
    parts.push(
      tileAnimFrame(parsed.def, elapsedMs, {
        kind: "interval",
        intervalMs: timed.intervalMs,
        delayMs: timed.delayMs,
      }),
    );
  }
  return parts.join(",");
}

export interface AnimatedDefault {
  def: TileDef;
  image: HTMLImageElement;
  offsetX: number;
  offsetY: number;
}

export interface MapArtBake {
  staticCanvas: HTMLCanvasElement;
  animatedDefault: AnimatedDefault | null;
  overlay: HTMLCanvasElement | null;
  paintOverlay: ((elapsedMs: number) => boolean) | null;
  needsAnimation: boolean;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function makeCanvas(width: number, height: number, scale: number): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  return canvas;
}

function hasAnimatedPlacements(
  geometry: GGeometry,
  images: Record<string, HTMLImageElement>,
  tilesets: Record<string, GTileset>,
): boolean {
  const tiles = geometry.tiles as unknown[];
  const check = (placement: number[]) => {
    const parsed = tileDefOf(tiles[placement[0]], tilesets, images);
    return Boolean(parsed && isAnimated(parsed.def));
  };
  for (const placement of geometry.placements || []) {
    if (check(placement as number[])) {
      return true;
    }
  }
  for (const group of geometry.groups || []) {
    for (const placement of group) {
      if (check(placement as number[])) {
        return true;
      }
    }
  }
  return false;
}

export function mapNeedsAnimation(
  geometry: GGeometry,
  images: Record<string, HTMLImageElement>,
  tilesets: Record<string, GTileset>,
): boolean {
  if (geometry.default != null) {
    const parsed = tileDefOf((geometry.tiles as unknown[])[geometry.default], tilesets, images);
    if (parsed && isAnimated(parsed.def)) {
      return true;
    }
  }
  if (hasAnimatedPlacements(geometry, images, tilesets)) {
    return true;
  }
  return collectTimedLayers(geometry).length > 0;
}

export function createDefaultPatternSvg(
  mapId: string,
  animated: AnimatedDefault,
  width: number,
  height: number,
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.dataset.patternId = `al-water-${mapId}`;

  const defs = document.createElementNS(SVG_NS, "defs");
  const pattern = document.createElementNS(SVG_NS, "pattern");
  pattern.setAttribute("id", `al-water-${mapId}`);
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("width", String(animated.def.w));
  pattern.setAttribute("height", String(animated.def.h));
  pattern.setAttribute("x", String(animated.offsetX));
  pattern.setAttribute("y", String(animated.offsetY));

  const source = tileFrameSource(animated.def, 0);
  const image = document.createElementNS(SVG_NS, "image");
  image.setAttribute("href", animated.image.src);
  image.setAttribute("x", String(-source.sx));
  image.setAttribute("y", String(-source.sy));
  image.setAttribute("width", String(animated.image.naturalWidth || animated.image.width));
  image.setAttribute("height", String(animated.image.naturalHeight || animated.image.height));
  image.setAttribute("image-rendering", "pixelated");

  pattern.appendChild(image);
  defs.appendChild(pattern);
  svg.appendChild(defs);

  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("width", "100%");
  rect.setAttribute("height", "100%");
  rect.setAttribute("fill", `url(#al-water-${mapId})`);
  svg.appendChild(rect);
  return svg;
}

export function setDefaultPatternFrame(svg: SVGSVGElement, def: TileDef, frame: number): void {
  const image = svg.querySelector("image");
  if (!image) {
    return;
  }
  const source = tileFrameSource(def, frame);
  image.setAttribute("x", String(-source.sx));
  image.setAttribute("y", String(-source.sy));
}

/** Static land/buildings once; animated default is an SVG pattern; animated placements redraw on a thin overlay. */
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
  const staticCanvas = makeCanvas(width, height, scale);
  const ctx = staticCanvas?.getContext("2d");
  if (!staticCanvas || !ctx) {
    return null;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, staticCanvas.width, staticCanvas.height);
  const timedLayers = collectTimedLayers(geometry);
  const skipTimed = timedLayerKeys(timedLayers);
  drawPlacements(ctx, geometry, images, tilesets, scale, 0, "static");
  drawDecor(ctx, geometry, images, tilesets, scale, skipTimed);

  let animatedDefault: AnimatedDefault | null = null;
  if (geometry.default != null) {
    const parsed = tileDefOf((geometry.tiles as unknown[])[geometry.default], tilesets, images);
    if (parsed && isAnimated(parsed.def)) {
      const offset = defaultFillOffset(geometry, parsed.def);
      animatedDefault = {
        def: parsed.def,
        image: parsed.image,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    }
  }

  const animatedPlacements = hasAnimatedPlacements(geometry, images, tilesets);
  const needsOverlay = animatedPlacements || timedLayers.length > 0;
  let overlay: HTMLCanvasElement | null = null;
  let paintOverlay: ((elapsedMs: number) => boolean) | null = null;
  if (needsOverlay) {
    overlay = makeCanvas(width, height, scale);
    const overlayCanvas = overlay;
    const overlayCtx = overlayCanvas?.getContext("2d");
    if (overlayCanvas && overlayCtx) {
      overlayCtx.imageSmoothingEnabled = false;
      let lastSignature = "";
      paintOverlay = (elapsedMs: number) => {
        const signature = overlaySignature(
          geometry,
          images,
          tilesets,
          elapsedMs,
          timedLayers,
          animatedPlacements,
        );
        if (signature === lastSignature) {
          return false;
        }
        lastSignature = signature;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (animatedPlacements) {
          const waterIndex = waterFrame(elapsedMs);
          drawPlacements(overlayCtx, geometry, images, tilesets, scale, waterIndex, "animated");
        }
        drawTimedLayers(overlayCtx, geometry, images, tilesets, scale, elapsedMs, timedLayers);
        return true;
      };
      paintOverlay(0);
    } else {
      overlay = null;
    }
  }

  const needsAnimation = Boolean(animatedDefault || overlay);
  return { staticCanvas, animatedDefault, overlay, paintOverlay, needsAnimation };
}
