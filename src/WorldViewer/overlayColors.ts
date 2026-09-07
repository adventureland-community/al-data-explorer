import { OverlayKind } from "./types";

/**
 * Colors from in-game `border_mode` (`?borders=true` / `js/game.js` create_map).
 * Doors/quirks: feature/border-mode-door-quirk-viz.
 */
const BORDER_MODE: Record<OverlayKind, number> = {
  doors: 0x007fff,
  quirks: 0x00ff00,
  spawns: 0xfd7188,
  monsters: 0xfc5f39,
  rage: 0x916bbd,
  bounds: 0xff2335,
  npcs: 0x84d5ff,
  market: 0xf0b742,
  machines: 0xfeb222,
  animatables: 0xfeb222,
  zones: 0x9966ff,
  traps: 0xd94f70,
};

export function overlayColor(kind: OverlayKind): number {
  return BORDER_MODE[kind];
}

export function overlayHex(kind: OverlayKind): string {
  return `#${overlayColor(kind).toString(16).padStart(6, "0")}`;
}

export const EXTRA_PACK_BOUNDS_COLOR = 0x5294ff;
/** NPC map `boundary` roam box — same family as border_mode npcs. */
export const NPC_ROAM_COLOR = BORDER_MODE.npcs;
/** Market patron patrol boxes (`G.npcs[].market.areas`) — merchant gold. */
export const MARKET_AREA_COLOR = BORDER_MODE.market;
/** Market patron waypoints (`G.npcs[].market.stops`). */
export const MARKET_STOP_COLOR = 0xff7a3d;
export const TWO_WAY_CONNECTION_COLOR = 0x33ff66;
export const ONE_WAY_CONNECTION_COLOR = 0xffaa33;
export const FLOOR_OUTSIDE_COLOR = 0x1b3d2a;
export const FLOOR_INDOOR_COLOR = 0x2a2438;
export const FLOOR_UNDERGROUND_COLOR = 0x1a2230;
export const SELECTED_FLOOR_COLOR = 0x3d5a80;
/** Packs with `grow` — extra monsters spawn if the pack is thinned. */
export const GROW_PACK_LINE_COLOR = 0xfff1a8;
