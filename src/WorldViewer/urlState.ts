import { DEFAULT_LAYER_HEIGHT } from "./layoutWorld";
import { MapFocus, ViewerMode } from "./types";

export function parseHash(): Record<string, string> {
  const raw = window.location.hash.replace(/^#/, "");
  const result: Record<string, string> = {};
  for (const part of raw.split("&")) {
    const [key, value] = part.split("=");
    if (key && value !== undefined) {
      result[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return result;
}

export function writeHash(params: Record<string, string | undefined>): void {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  const hash = parts.length > 0 ? `#${parts.join("&")}` : "";
  window.history.replaceState(null, "", hash || window.location.pathname);
}

export function syncHashFromState(
  selectedMap: string | null,
  focus: MapFocus | null,
  viewMode: ViewerMode,
  layerHeight: number,
): void {
  writeHash({
    map: selectedMap ?? undefined,
    x: focus?.x !== undefined ? String(Math.round(focus.x)) : undefined,
    y: focus?.y !== undefined ? String(Math.round(focus.y)) : undefined,
    mode: viewMode,
    layers: layerHeight !== DEFAULT_LAYER_HEIGHT ? String(layerHeight) : undefined,
  });
}
