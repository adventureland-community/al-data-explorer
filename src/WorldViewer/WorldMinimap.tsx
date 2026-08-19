import { useCallback, useEffect, useRef } from "react";
import { MapBand, ParsedMap, WorldLayout } from "./types";

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const WIDTH = 180;
const HEIGHT = 120;
const PADDING = 6;

const BAND_COLORS: Record<MapBand, string> = {
  overworld: "#6fcf97",
  indoor: "#c4b5fd",
  underground: "#7dd3fc",
};

function bandColor(band: MapBand): string {
  return BAND_COLORS[band];
}

interface WorldMinimapProps {
  layout: WorldLayout;
  maps: Record<string, ParsedMap>;
  viewport: ViewportBounds | null;
}

export function WorldMinimap({ layout, maps, viewport }: WorldMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const mapIds = Object.keys(layout.poses);
    if (mapIds.length === 0) {
      return;
    }

    let worldMinX = Infinity;
    let worldMaxX = -Infinity;
    let worldMinZ = Infinity;
    let worldMaxZ = -Infinity;

    for (const id of mapIds) {
      const pose = layout.poses[id];
      const map = maps[id];
      if (!pose || !map) {
        continue;
      }
      const left = pose.x + map.artMinX;
      const right = pose.x + map.artMaxX;
      const top = pose.y + map.artMinY;
      const bottom = pose.y + map.artMaxY;
      worldMinX = Math.min(worldMinX, left);
      worldMaxX = Math.max(worldMaxX, right);
      worldMinZ = Math.min(worldMinZ, top);
      worldMaxZ = Math.max(worldMaxZ, bottom);
    }

    const worldW = worldMaxX - worldMinX || 1;
    const worldH = worldMaxZ - worldMinZ || 1;
    const drawW = WIDTH - PADDING * 2;
    const drawH = HEIGHT - PADDING * 2;
    const scale = Math.min(drawW / worldW, drawH / worldH);

    const toX = (wx: number) => PADDING + (wx - worldMinX) * scale;
    const toY = (wz: number) => PADDING + (wz - worldMinZ) * scale;

    // Connection lines
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    for (const conn of layout.connections) {
      const fp = layout.poses[conn.fromMap];
      const tp = layout.poses[conn.toMap];
      if (!fp || !tp) {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(toX(fp.x + conn.fromX), toY(fp.y + conn.fromY));
      ctx.lineTo(toX(tp.x + conn.toX), toY(tp.y + conn.toY));
      ctx.stroke();
    }

    // Map rectangles
    for (const id of mapIds) {
      const pose = layout.poses[id];
      const map = maps[id];
      if (!pose || !map) {
        continue;
      }
      const rx = toX(pose.x + map.artMinX);
      const ry = toY(pose.y + map.artMinY);
      const rw = (map.artMaxX - map.artMinX) * scale;
      const rh = (map.artMaxY - map.artMinY) * scale;
      ctx.fillStyle = bandColor(map.band);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(rx, ry, Math.max(rw, 2), Math.max(rh, 2));
      ctx.globalAlpha = 1;
    }

    // Viewport rectangle
    if (viewport) {
      const vx = toX(viewport.minX);
      const vy = toY(viewport.minZ);
      const vw = (viewport.maxX - viewport.minX) * scale;
      const vh = (viewport.maxZ - viewport.minZ) * scale;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vx, vy, vw, vh);
    }
  }, [layout, maps, viewport]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        width: WIDTH,
        height: HEIGHT,
        background: "rgba(0,0,0,0.55)",
        borderRadius: 6,
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
  );
}
