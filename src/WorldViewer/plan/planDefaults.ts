import { DEFAULT_OVERLAYS, OverlayVisibility } from "../types";

/** Farm-relevant overlays on by default in Plan mode. */
export const PLAN_DEFAULT_OVERLAYS: OverlayVisibility = {
  ...DEFAULT_OVERLAYS,
  bounds: true,
  spawns: true,
  monsters: true,
  rage: false,
  quirks: false,
  doors: false,
  npcs: false,
  market: false,
  zones: false,
  machines: false,
  animatables: false,
  traps: false,
};
