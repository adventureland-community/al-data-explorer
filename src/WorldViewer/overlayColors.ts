import { OverlayKind } from "./types";

export function overlayColor(kind: OverlayKind): number {
  switch (kind) {
    case "bounds":
      return 0xff4d4d;
    case "spawns":
      return 0x66ccff;
    case "quirks":
      return 0xffcc33;
    case "doors":
      return 0x33ff66;
    case "npcs":
      return 0xff66cc;
    case "zones":
      return 0x9966ff;
    case "monsters":
      return 0xff8833;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function overlayHex(kind: OverlayKind): string {
  return `#${overlayColor(kind).toString(16).padStart(6, "0")}`;
}

export const TWO_WAY_CONNECTION_COLOR = 0x33ff66;
export const ONE_WAY_CONNECTION_COLOR = 0xffaa33;
export const FLOOR_OUTSIDE_COLOR = 0x1b3d2a;
export const FLOOR_INDOOR_COLOR = 0x2a2438;
export const FLOOR_UNDERGROUND_COLOR = 0x1a2230;
export const SELECTED_FLOOR_COLOR = 0x3d5a80;
