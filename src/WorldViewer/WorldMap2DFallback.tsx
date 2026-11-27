import { useEffect, useRef, useState } from "react";
import { MapArtBake, presentMapArt } from "./renderMapCanvas";
import { MapFocus, ParsedMap } from "./types";

interface WorldMap2DFallbackProps {
  map: ParsedMap | null;
  bake: MapArtBake | null;
  focus: MapFocus | null;
  message: string;
}

/**
 * Canvas2D view of already-baked map art when WebGL cannot start.
 * Covers Firefox Troubleshoot Mode / GPU blocklist / webgl.disabled cases where
 * no Three.js context can be created at all.
 */
export function WorldMap2DFallback({ map, bake, focus, message }: WorldMap2DFallbackProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const viewRef = useRef({ scale: 1, offset: { x: 0, y: 0 } });
  viewRef.current = { scale, offset };

  useEffect(() => {
    if (!map || !bake) {
      return;
    }
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const artW = map.artMaxX - map.artMinX || 1;
    const artH = map.artMaxY - map.artMinY || 1;
    const fit = Math.min(host.clientWidth / artW, host.clientHeight / artH) * 0.92;
    const nextScale = Number.isFinite(fit) && fit > 0 ? fit : 1;
    const focusOnMap = focus && focus.mapId === map.id ? focus : null;
    const focusX = focusOnMap ? focusOnMap.x : (map.artMinX + map.artMaxX) / 2;
    const focusY = focusOnMap ? focusOnMap.y : (map.artMinY + map.artMaxY) / 2;
    const cx = (focusX - map.artMinX) * nextScale;
    const cy = (focusY - map.artMinY) * nextScale;
    setScale(nextScale);
    setOffset({
      x: host.clientWidth / 2 - cx,
      y: host.clientHeight / 2 - cy,
    });
  }, [bake, focus, map]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host || !bake || !map) {
      return undefined;
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(host.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(host.clientHeight * dpr));
      canvas.style.width = `${host.clientWidth}px`;
      canvas.style.height = `${host.clientHeight}px`;
    };
    resize();

    let frame = 0;
    const inception = performance.now();
    const paint = () => {
      frame = requestAnimationFrame(paint);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      presentMapArt(bake, performance.now() - inception);
      const { scale: s, offset: o } = viewRef.current;
      const dpr = canvas.width / Math.max(1, host.clientWidth);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#101218";
      ctx.fillRect(0, 0, host.clientWidth, host.clientHeight);
      const artW = map.artMaxX - map.artMinX;
      const artH = map.artMaxY - map.artMinY;
      ctx.drawImage(bake.displayCanvas, o.x, o.y, artW * s, artH * s);
    };
    paint();

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = host.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const { scale: prev, offset: off } = viewRef.current;
      const next = Math.min(8, Math.max(0.15, prev * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
      const worldX = (mx - off.x) / prev;
      const worldY = (my - off.y) / prev;
      setScale(next);
      setOffset({ x: mx - worldX * next, y: my - worldY * next });
    };
    const onPointerDown = (event: PointerEvent) => {
      dragRef.current = {
        px: event.clientX,
        py: event.clientY,
        ox: viewRef.current.offset.x,
        oy: viewRef.current.offset.y,
      };
      host.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      setOffset({
        x: drag.ox + (event.clientX - drag.px),
        y: drag.oy + (event.clientY - drag.py),
      });
    };
    const onPointerUp = () => {
      dragRef.current = null;
    };

    host.addEventListener("wheel", onWheel, { passive: false });
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", resize);
    };
  }, [bake, map]);

  return (
    <div
      ref={hostRef}
      data-testid="world-map-2d-fallback"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#101218",
        cursor: "grab",
        touchAction: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
      <div
        role="status"
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          top: 12,
          maxWidth: 520,
          padding: "8px 12px",
          borderRadius: 6,
          background: "rgba(0,0,0,0.78)",
          color: "#e8eaed",
          fontSize: 13,
          lineHeight: 1.4,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <div style={{ fontWeight: 600 }}>2D map fallback</div>
        <div style={{ opacity: 0.85, marginTop: 2 }}>{message}</div>
        {!bake && (
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            Waiting for map art… If this stays empty, pick a map or run <code>npm run update</code>{" "}
            for local tilesets.
          </div>
        )}
      </div>
    </div>
  );
}
