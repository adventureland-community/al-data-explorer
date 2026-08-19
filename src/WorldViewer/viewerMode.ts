import { MapPose, ViewerMode, WorldLayout } from "./types";

/** Place the only visible map at the origin so the camera stays local. */
export const SINGLE_MAP_POSE: MapPose = { x: 0, y: 0, z: 0 };

/**
 * Layout actually drawn in the canvas. Map mode keeps one map at the origin
 * and drops world connection lines.
 */
export function visibleWorldLayout(
  layout: WorldLayout,
  mode: ViewerMode,
  selectedMap: string | null,
): WorldLayout {
  switch (mode) {
    case "world":
      return layout;
    case "map": {
      if (!selectedMap) {
        return { maps: {}, poses: {}, connections: [] };
      }
      const map = layout.maps[selectedMap];
      if (!map) {
        return { maps: {}, poses: {}, connections: [] };
      }
      return {
        maps: { [selectedMap]: map },
        poses: { [selectedMap]: SINGLE_MAP_POSE },
        connections: [],
      };
    }
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

/** Map mode always keeps a map selected; ignore clear-selection. */
export function nextSelectedMap(
  mode: ViewerMode,
  current: string | null,
  next: string | null,
): string | null {
  switch (mode) {
    case "map":
      return next ?? current;
    case "world":
      return next;
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

/** Map mode fills in main (or the first map) when selection is empty. */
export function selectedMapForMode(
  mode: ViewerMode,
  current: string | null,
  maps: Record<string, { id?: string }>,
): string | null {
  if (current && maps[current]) {
    return current;
  }
  switch (mode) {
    case "map":
      return maps.main ? "main" : Object.keys(maps)[0] || null;
    case "world":
      return null;
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}
