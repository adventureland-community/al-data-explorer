import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { GDimension, GGeometry, GImage, GSprite, GTileset } from "typed-adventureland";

import { adventureLandAssetUrl, loadImage } from "../WorldViewer/adventureLandAssetUrl";
import {
  mapTextureScale,
  presentMapArt,
  renderMapArt,
  type MapArtBake,
} from "../WorldViewer/renderMapCanvas";
import {
  lookupSkinSprite,
  paintSpriteClip,
  type SpriteSheetClip,
} from "../WorldViewer/spriteLookup";

export type NpcMapMarkerKind = "npc" | "door" | "transporter" | "pin";

export type NpcMapMarker = {
  x: number;
  y: number;
  label?: string;
  kind?: NpcMapMarkerKind;
  /** AdventureLand skin id — drawn when kind is `npc` (or when set). */
  skin?: string;
};

export type NpcMapSpriteContext = {
  sprites: Record<string, GSprite>;
  images: Record<string, GImage>;
  dimensions: Record<string, GDimension>;
};

type NpcMapPreviewProps = {
  geometry: GGeometry;
  tilesets: Record<string, GTileset>;
  markers: NpcMapMarker[];
  spriteContext?: NpcMapSpriteContext;
  /** Max CSS width of the preview. */
  maxWidth?: number;
  /** Max CSS height of the preview. */
  maxHeight?: number;
  /**
   * When set, crop the bake around marker focus (± world units), clamped to map bounds.
   * Ignored when `cropToMarkers` is false.
   */
  focusPadding?: number;
  /** Crop around markers (default true when markers exist). */
  cropToMarkers?: boolean;
  /** Size canvas to parent width (capped by maxWidth/maxHeight). */
  fillWidth?: boolean;
  /**
   * Keep a constant outer frame (maxWidth×maxHeight / parent×maxHeight) so layout
   * doesn't jump while loading or when switching maps. Map art cover-fills the frame
   * (no letterbox bars).
   */
  fixedFrame?: boolean;
};

type SpritePaint = {
  canvas: HTMLCanvasElement;
  clip: SpriteSheetClip;
  /** First opaque row in the sprite sheet (CSS px of source canvas). */
  contentTop: number;
  /** Exclusive bottom opaque row. */
  contentBottom: number;
};

function markersSignature(markers: NpcMapMarker[]): string {
  return markers
    .map((m) => `${m.x},${m.y},${m.kind ?? ""},${m.label ?? ""},${m.skin ?? ""}`)
    .join("|");
}

/** Opaque body span, walking up from the feet so floating sheet noise doesn't lift the name. */
function opaqueContentBounds(canvas: HTMLCanvasElement): { top: number; bottom: number } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { top: 0, bottom: canvas.height };
  const { width: w, height: h } = canvas;
  const { data } = ctx.getImageData(0, 0, w, h);
  const minOpaque = Math.max(3, Math.floor(w * 0.18));
  const rowCounts = new Array<number>(h).fill(0);
  for (let y = 0; y < h; y += 1) {
    let count = 0;
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3]! > 32) count += 1;
    }
    rowCounts[y] = count;
  }
  let bottom = -1;
  for (let y = h - 1; y >= 0; y -= 1) {
    if (rowCounts[y]! >= minOpaque) {
      bottom = y + 1;
      break;
    }
  }
  if (bottom < 0) return { top: 0, bottom: h };
  let top = bottom - 1;
  let gap = 0;
  for (let y = bottom - 1; y >= 0; y -= 1) {
    if (rowCounts[y]! >= minOpaque) {
      top = y;
      gap = 0;
    } else {
      gap += 1;
      if (gap > 1) break;
    }
  }
  return { top, bottom };
}

async function loadTilesetImages(
  tilesets: Record<string, GTileset>,
): Promise<Record<string, HTMLImageElement>> {
  const images: Record<string, HTMLImageElement> = {};
  await Promise.all(
    Object.entries(tilesets).map(async ([key, tileset]) => {
      if (!tileset?.file) return;
      images[key] = await loadImage(adventureLandAssetUrl(tileset.file));
    }),
  );
  return images;
}

async function loadMarkerSprites(
  markers: NpcMapMarker[],
  spriteContext: NpcMapSpriteContext | undefined,
): Promise<Map<string, SpritePaint>> {
  const out = new Map<string, SpritePaint>();
  if (!spriteContext) return out;
  const skins = new Set<string>();
  for (const marker of markers) {
    if (marker.skin) skins.add(marker.skin);
  }
  await Promise.all(
    [...skins].map(async (skin) => {
      const clip = lookupSkinSprite(
        spriteContext.sprites as never,
        spriteContext.images,
        spriteContext.dimensions,
        skin,
      );
      if (!clip) return;
      const image = await loadImage(clip.url);
      const canvas = paintSpriteClip(image, clip);
      const bounds = opaqueContentBounds(canvas);
      out.set(skin, {
        canvas,
        clip,
        contentTop: bounds.top,
        contentBottom: bounds.bottom,
      });
    }),
  );
  return out;
}

type FocusBox = { minX: number; minY: number; maxX: number; maxY: number };

/**
 * Build a tight crop around markers. Size is limited so the marker can sit at a
 * stable anchor inside the frame — near map edges we zoom in instead of sliding
 * the subject into a corner of a huge window.
 */
function focusRect(geometry: GGeometry, markers: NpcMapMarker[], padding: number): FocusBox {
  if (markers.length === 0) {
    return {
      minX: geometry.min_x,
      minY: geometry.min_y,
      maxX: geometry.max_x,
      maxY: geometry.max_y,
    };
  }

  let fx = 0;
  let fy = 0;
  for (const marker of markers) {
    fx += marker.x;
    fy += marker.y;
  }
  fx /= markers.length;
  fy /= markers.length;

  const skinLabeled = markers.some((m) => m.label && m.skin);
  const pinLabeled = markers.some((m) => m.label && !m.skin);
  // Skin labels need the feet lower in-frame; door pins sit a bit high for a bottom caption.
  const anchorY = skinLabeled ? 0.64 : pinLabeled ? 0.4 : 0.5;

  let size = Math.min(padding * 2.1, 170);
  // Keep the marker at anchorY / centered X — shrink when an edge would break that.
  const maxAbove = (fy - geometry.min_y) / Math.max(0.2, anchorY);
  const maxBelow = (geometry.max_y - fy) / Math.max(0.2, 1 - anchorY);
  const maxLeft = (fx - geometry.min_x) / 0.5;
  const maxRight = (geometry.max_x - fx) / 0.5;
  size = Math.min(size, maxAbove, maxBelow, maxLeft, maxRight);
  size = Math.max(56, size);

  const minX = fx - size / 2;
  const maxX = fx + size / 2;
  const minY = fy - size * anchorY;
  const maxY = fy + size * (1 - anchorY);

  return {
    minX: Math.max(geometry.min_x, Math.min(minX, geometry.max_x - 1)),
    maxX: Math.min(geometry.max_x, Math.max(maxX, geometry.min_x + 1)),
    minY: Math.max(geometry.min_y, Math.min(minY, geometry.max_y - 1)),
    maxY: Math.min(geometry.max_y, Math.max(maxY, geometry.min_y + 1)),
  };
}

/**
 * Grow a focus window toward a frame aspect without zooming out past map bounds.
 * If the map can't supply the aspect, keep the tighter window (cover-fill will crop).
 */
function expandFocusToAspect(focus: FocusBox, geometry: GGeometry, aspect: number): FocusBox {
  let { minX, minY, maxX, maxY } = focus;
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  if (w / h < aspect - 1e-6) {
    const needW = h * aspect;
    if (needW <= geometry.max_x - geometry.min_x + 1e-6) {
      const mid = (minX + maxX) / 2;
      minX = mid - needW / 2;
      maxX = mid + needW / 2;
      if (minX < geometry.min_x) {
        maxX += geometry.min_x - minX;
        minX = geometry.min_x;
      }
      if (maxX > geometry.max_x) {
        minX -= maxX - geometry.max_x;
        maxX = geometry.max_x;
      }
    }
  } else if (w / h > aspect + 1e-6) {
    const needH = w / aspect;
    if (needH <= geometry.max_y - geometry.min_y + 1e-6) {
      const mid = (minY + maxY) / 2;
      minY = mid - needH / 2;
      maxY = mid + needH / 2;
      if (minY < geometry.min_y) {
        maxY += geometry.min_y - minY;
        minY = geometry.min_y;
      }
      if (maxY > geometry.max_y) {
        minY -= maxY - geometry.max_y;
        maxY = geometry.max_y;
      }
    }
  }
  minX = Math.max(geometry.min_x, minX);
  maxX = Math.min(geometry.max_x, maxX);
  minY = Math.max(geometry.min_y, minY);
  maxY = Math.min(geometry.max_y, maxY);
  return { minX, minY, maxX, maxY };
}

function markerColor(kind: NpcMapMarkerKind | undefined): string {
  switch (kind) {
    case "door":
      // Amber reads as a discrete pin on snow/ice (sky-blue blends into winterland).
      return "#f59e0b";
    case "transporter":
      return "#a78bfa";
    case "npc":
      return "#f87171";
    default:
      return "#ef4444";
  }
}

/** Wrap / truncate a pin label so destination names fit under hop thumbs. */
function wrapMarkerLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  maxW: number,
  maxLines: number,
): string[] {
  if (maxLines <= 1 || !label.includes(" ")) {
    let text = label;
    while (text.length > 4 && ctx.measureText(text).width > maxW) {
      text = `${text.slice(0, Math.max(2, text.length - 2))}…`;
    }
    return [text];
  }
  const words = label.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && ctx.measureText(next).width > maxW) {
      lines.push(cur);
      cur = word;
      if (lines.length >= maxLines) break;
    } else {
      cur = next;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  // Truncate last line if still overflowing.
  const last = lines.length - 1;
  if (last >= 0) {
    let text = lines[last]!;
    while (text.length > 4 && ctx.measureText(text).width > maxW) {
      text = `${text.slice(0, Math.max(2, text.length - 2))}…`;
    }
    lines[last] = text;
  }
  return lines.length > 0 ? lines : [label];
}

function drawLabelChip(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontPx: number,
  baseline: "top" | "bottom",
): void {
  ctx.font = `700 ${fontPx}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = baseline;
  const tw = ctx.measureText(text).width;
  const padX = Math.max(3, fontPx * 0.35);
  const padY = Math.max(1.5, fontPx * 0.18);
  const boxW = tw + padX * 2;
  const boxH = fontPx + padY * 2;
  const top = baseline === "bottom" ? y - boxH : y;
  const left = x - boxW / 2;
  const r = Math.min(4, boxH / 2);
  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.arcTo(left + boxW, top, left + boxW, top + boxH, r);
  ctx.arcTo(left + boxW, top + boxH, left, top + boxH, r);
  ctx.arcTo(left, top + boxH, left, top, r);
  ctx.arcTo(left, top, left + boxW, top, r);
  ctx.closePath();
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  const textY = baseline === "bottom" ? y - padY : y + padY;
  ctx.fillText(text, x, textY);
}

function drawMarkers(
  ctx: CanvasRenderingContext2D,
  geometry: GGeometry,
  markers: NpcMapMarker[],
  bakeScale: number,
  cssScale: number,
  sprites: Map<string, SpritePaint>,
  originX: number,
  originY: number,
  viewW?: number,
  viewH?: number,
): void {
  const canvasW = viewW ?? ctx.canvas.width;
  const canvasH = viewH ?? ctx.canvas.height;
  const compact = Math.min(canvasW, canvasH) < 120;

  for (const marker of markers) {
    const px = (marker.x - originX) * bakeScale * cssScale;
    const py = (marker.y - originY) * bakeScale * cssScale;
    const skinPaint = marker.skin ? sprites.get(marker.skin) : undefined;
    const isDoorPin = marker.kind === "door" || marker.kind === "pin";
    const pinR = isDoorPin
      ? compact
        ? 2
        : Math.max(4, Math.min(6, 4.75 * Math.max(cssScale, 0.7)))
      : Math.max(2.5, Math.min(5, 4 * cssScale));

    const drawY = py;
    let labelLines: string[] = [];
    let fontPx = 0;
    let labelGap = 0;

    if (marker.label) {
      if (isDoorPin) {
        fontPx = compact
          ? Math.max(6.5, Math.min(8, 7.25))
          : Math.max(20, Math.min(24, 21 * Math.max(cssScale, 0.8)));
      } else {
        fontPx = compact
          ? Math.max(9, Math.min(11, 10))
          : Math.max(16, Math.min(20, 17 * Math.max(cssScale, 0.8)));
      }
      ctx.font = `700 ${fontPx}px ui-sans-serif, system-ui, sans-serif`;
      const maxW = isDoorPin
        ? compact
          ? Math.max(44, Math.min(canvasW - 4, 58))
          : Math.max(120, Math.min(canvasW - 16, 260))
        : compact
        ? Math.max(42, Math.min(canvasW - 4, 58))
        : Math.max(80, Math.min(canvasW - 16, 220));
      labelLines = wrapMarkerLabel(ctx, marker.label, maxW, isDoorPin && !compact ? 2 : 1);
      labelGap = pinR + (compact ? 4 : 7);
    }

    let skinTopY = py;
    let skinH = 0;
    if (skinPaint) {
      const srcTop = skinPaint.contentTop;
      const srcBottom = Math.max(srcTop + 1, skinPaint.contentBottom);
      const srcH = srcBottom - srcTop;
      let scale = compact
        ? Math.max(1.05, Math.min(1.5, 1.3 * Math.max(cssScale, 0.55)))
        : Math.max(1.6, Math.min(2.8, 2.1 * Math.max(cssScale, 0.7)));
      const chipH = marker.label ? fontPx + Math.max(6, fontPx * 0.45) : 0;
      const labelGapAbove = marker.label ? (compact ? 8 : 8) : 0;
      const labelRoom = chipH + labelGapAbove;
      const maxDrawH = Math.max(8, py - labelRoom);
      if (srcH * scale > maxDrawH) {
        scale = maxDrawH / srcH;
      }
      let w = skinPaint.canvas.width * scale;
      skinH = srcH * scale;
      skinTopY = py - skinH;
      if (marker.label && skinTopY < labelRoom) {
        skinH = Math.max(6, py - labelRoom);
        skinTopY = Math.max(labelRoom, py - skinH);
        scale = skinH / Math.max(1, srcH);
        w = skinPaint.canvas.width * scale;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        skinPaint.canvas,
        0,
        srcTop,
        skinPaint.canvas.width,
        srcH,
        px - w / 2,
        skinTopY,
        w,
        skinH,
      );
    } else {
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.arc(px, drawY, pinR + 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "#fff";
      ctx.arc(px, drawY, pinR + 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = markerColor(marker.kind);
      ctx.arc(px, drawY, pinR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (marker.label && labelLines.length > 0) {
      const textX = Math.min(canvasW - 4, Math.max(4, px));
      if (skinPaint) {
        const gap = compact ? 6 : 8;
        const chipH = fontPx + Math.max(6, fontPx * 0.45);
        // Keep chip fully above the drawn sprite (and inside the frame).
        const labelY = Math.max(chipH, Math.min(skinTopY - gap, canvasH - 2));
        drawLabelChip(ctx, labelLines[0]!, textX, labelY, fontPx, "bottom");
      } else if (compact) {
        const lineStep = fontPx + Math.max(3, fontPx * 0.25);
        let labelY = canvasH - 2;
        for (let i = labelLines.length - 1; i >= 0; i -= 1) {
          drawLabelChip(ctx, labelLines[i]!, textX, labelY, fontPx, "bottom");
          labelY -= lineStep;
        }
      } else {
        const lineStep = fontPx + Math.max(4, fontPx * 0.28);
        const blockH = labelLines.length * lineStep;
        let labelY = drawY + labelGap;
        let baseline: "top" | "bottom" = "top";
        if (labelY + blockH > canvasH - 1) {
          baseline = "bottom";
          labelY = drawY - labelGap;
        }
        for (let i = 0; i < labelLines.length; i += 1) {
          const line = labelLines[i]!;
          const y =
            baseline === "top"
              ? labelY + i * lineStep
              : labelY - (labelLines.length - 1 - i) * lineStep;
          drawLabelChip(ctx, line, textX, y, fontPx, baseline);
        }
      }
    }
  }
}

/**
 * Small top-down map art with NPC / travel markers. Reuses WorldViewer tile baking.
 */
export function NpcMapPreview({
  geometry,
  tilesets,
  markers,
  spriteContext,
  maxWidth = 420,
  maxHeight = 320,
  focusPadding,
  cropToMarkers = true,
  fillWidth = false,
  fixedFrame = false,
}: NpcMapPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const bakeRef = useRef<MapArtBake | null>(null);
  const spritesRef = useRef<Map<string, SpritePaint>>(new Map());
  const startedRef = useRef(0);
  const markersRef = useRef(markers);
  markersRef.current = markers;
  // Value-stable key so parent re-renders with a fresh markers array don't rebake.
  const markersSig = markersSignature(markers);

  useEffect(() => {
    if (!fillWidth || !wrapRef.current?.parentElement) return undefined;
    const parent = wrapRef.current.parentElement;
    const sync = () => {
      const next = Math.floor(parent.clientWidth);
      if (next > 0) setContainerWidth(next);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [fillWidth]);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    startedRef.current = start;
    setLoading(true);
    setError(null);
    bakeRef.current = null;
    spritesRef.current = new Map();
    const markersNow = markersRef.current;

    (async () => {
      try {
        const [images, sprites] = await Promise.all([
          loadTilesetImages(tilesets),
          loadMarkerSprites(markersNow, spriteContext),
        ]);
        if (cancelled) return;
        const bake = renderMapArt(geometry, images, tilesets);
        if (!bake) {
          setError("Could not render this map.");
          setLoading(false);
          return;
        }
        bakeRef.current = bake;
        spritesRef.current = sprites;
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load map art.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [geometry, markersSig, spriteContext, tilesets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading || error) return;

    let raf = 0;
    const paint = (now: number) => {
      const bake = bakeRef.current;
      const ctx = canvas.getContext("2d");
      if (!bake || !ctx) return;
      const markersNow = markersRef.current;

      const elapsed = Math.max(0, now - startedRef.current);
      presentMapArt(bake, elapsed);

      const src = bake.displayCanvas;
      const bakeScale = mapTextureScale(
        geometry.min_x,
        geometry.max_x,
        geometry.min_y,
        geometry.max_y,
      );
      const pad = cropToMarkers && markersNow.length > 0 ? focusPadding ?? 220 : undefined;
      let focus = pad != null ? focusRect(geometry, markersNow, pad) : null;

      const widthCap =
        fillWidth && containerWidth != null ? Math.min(maxWidth, containerWidth) : maxWidth;
      let cssW: number;
      let cssH: number;
      const drawX = 0;
      const drawY = 0;
      let drawW: number;
      let drawH: number;
      let srcX: number;
      let srcY: number;
      let srcW: number;
      let srcH: number;
      let originX: number;
      let originY: number;

      if (fixedFrame) {
        cssW = Math.max(1, Math.round(widthCap));
        cssH = Math.max(1, Math.round(maxHeight));
        if (focus) {
          focus = expandFocusToAspect(focus, geometry, cssW / cssH);
        }
        const worldW = focus ? focus.maxX - focus.minX : geometry.max_x - geometry.min_x;
        const worldH = focus ? focus.maxY - focus.minY : geometry.max_y - geometry.min_y;
        const fullSrcX = focus ? (focus.minX - geometry.min_x) * bakeScale : 0;
        const fullSrcY = focus ? (focus.minY - geometry.min_y) * bakeScale : 0;
        const fullSrcW = Math.max(1, worldW * bakeScale);
        const fullSrcH = Math.max(1, worldH * bakeScale);
        // Cover-fill: scale to fill the frame, then crop the source (no letterbox bars).
        // Anchor the crop on the primary marker so near-edge NPCs stay in frame.
        const cover = Math.max(cssW / fullSrcW, cssH / fullSrcH);
        const cropW = cssW / cover;
        const cropH = cssH / cover;
        const skinLabeled = markersNow.some((m) => m.label && m.skin);
        const pinLabeled = markersNow.some((m) => m.label && !m.skin);
        const focusOriginX = focus ? focus.minX : geometry.min_x;
        const focusOriginY = focus ? focus.minY : geometry.min_y;
        let anchorX = fullSrcW / 2;
        let anchorY = fullSrcH / 2;
        if (markersNow.length > 0) {
          let sx = 0;
          let sy = 0;
          for (const marker of markersNow) {
            sx += marker.x;
            sy += marker.y;
          }
          sx /= markersNow.length;
          sy /= markersNow.length;
          anchorX = (sx - focusOriginX) * bakeScale;
          anchorY = (sy - focusOriginY) * bakeScale;
        }
        // Skin: feet ~64% down (room for name). Door pin: ~40% down (room for caption).
        const targetX = cropW * 0.5;
        const targetY = skinLabeled ? cropH * 0.64 : pinLabeled ? cropH * 0.4 : cropH * 0.5;
        let cropX = anchorX - targetX;
        let cropY = anchorY - targetY;
        cropX = Math.min(Math.max(0, cropX), Math.max(0, fullSrcW - cropW));
        cropY = Math.min(Math.max(0, cropY), Math.max(0, fullSrcH - cropH));
        srcX = fullSrcX + cropX;
        srcY = fullSrcY + cropY;
        srcW = Math.max(1, cropW);
        srcH = Math.max(1, cropH);
        drawW = cssW;
        drawH = cssH;
        originX = focusOriginX + cropX / bakeScale;
        originY = focusOriginY + cropY / bakeScale;
      } else {
        const worldW = focus ? focus.maxX - focus.minX : geometry.max_x - geometry.min_x;
        const worldH = focus ? focus.maxY - focus.minY : geometry.max_y - geometry.min_y;
        srcX = focus ? (focus.minX - geometry.min_x) * bakeScale : 0;
        srcY = focus ? (focus.minY - geometry.min_y) * bakeScale : 0;
        srcW = Math.max(1, worldW * bakeScale);
        srcH = Math.max(1, worldH * bakeScale);
        // fillWidth may upscale small maps so the destination reads as the hero tile.
        const fitCap = fillWidth ? Number.POSITIVE_INFINITY : 1;
        const fit = Math.min(widthCap / srcW, maxHeight / srcH, fitCap);
        cssW = Math.max(1, Math.round(srcW * fit));
        cssH = Math.max(1, Math.round(srcH * fit));
        drawW = cssW;
        drawH = cssH;
        originX = focus ? focus.minX : geometry.min_x;
        originY = focus ? focus.minY : geometry.min_y;
      }
      if (canvas.width !== cssW || canvas.height !== cssH) {
        canvas.width = cssW;
        canvas.height = cssH;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(src, srcX, srcY, srcW, srcH, drawX, drawY, drawW, drawH);
      const cssScale = drawW / Math.max(srcW, 1);
      ctx.save();
      ctx.translate(drawX, drawY);
      drawMarkers(
        ctx,
        geometry,
        markersNow,
        bakeScale,
        cssScale,
        spritesRef.current,
        originX,
        originY,
        drawW,
        drawH,
      );
      ctx.restore();

      if (bake.needsAnimation) {
        raf = window.requestAnimationFrame(paint);
      }
    };

    raf = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(raf);
  }, [
    containerWidth,
    cropToMarkers,
    error,
    fillWidth,
    fixedFrame,
    focusPadding,
    geometry,
    loading,
    markersSig,
    maxHeight,
    maxWidth,
  ]);

  const frameSx = fixedFrame
    ? {
        width: fillWidth ? "100%" : maxWidth,
        height: maxHeight,
        maxWidth: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "action.hover",
        borderRadius: 1,
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        lineHeight: 0,
        boxSizing: "border-box" as const,
      }
    : null;

  if (loading) {
    return (
      <Box
        ref={wrapRef}
        sx={
          frameSx ?? {
            maxWidth: "100%",
            minHeight: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "action.hover",
            borderRadius: 1,
          }
        }
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        ref={wrapRef}
        sx={
          frameSx ?? {
            maxWidth: "100%",
            p: 2,
            bgcolor: "action.hover",
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
          }
        }
      >
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={wrapRef}
      sx={
        frameSx ?? {
          display: "inline-block",
          maxWidth: "100%",
          lineHeight: 0,
          borderRadius: 1,
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
          bgcolor: "action.hover",
        }
      }
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          maxWidth: "100%",
          width: fixedFrame ? "100%" : undefined,
          height: fixedFrame ? "100%" : "auto",
        }}
      />
    </Box>
  );
}
