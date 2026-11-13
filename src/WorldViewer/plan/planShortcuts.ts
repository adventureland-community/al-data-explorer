import { PlanTool } from "./types";

export type PlanShortcutAction =
  | { type: "tool"; tool: PlanTool; zoneMode: boolean }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "delete" }
  | { type: "escape" };

/** Shortcut letter shown next to the tool (Excalidraw-style). */
export const PLAN_TOOL_SHORTCUT: Partial<Record<PlanTool | "zone", string>> = {
  select: "V",
  zone: "Z",
  rect: "Z",
  ghost: "G",
  route: "R",
  packMarker: "K",
  pin: "N",
  line: "L",
  arrow: "A",
  freehand: "D",
  ellipse: "O",
  polygon: "P",
  text: "T",
  stamp: "S",
};

const TOOL_BY_KEY: Record<string, { tool: PlanTool; zoneMode: boolean }> = {
  v: { tool: "select", zoneMode: false },
  "1": { tool: "select", zoneMode: false },
  z: { tool: "rect", zoneMode: true },
  "2": { tool: "rect", zoneMode: true },
  g: { tool: "ghost", zoneMode: false },
  "3": { tool: "ghost", zoneMode: false },
  r: { tool: "route", zoneMode: false },
  "4": { tool: "route", zoneMode: false },
  k: { tool: "packMarker", zoneMode: false },
  "5": { tool: "packMarker", zoneMode: false },
  n: { tool: "pin", zoneMode: false },
  "6": { tool: "pin", zoneMode: false },
  l: { tool: "line", zoneMode: false },
  a: { tool: "arrow", zoneMode: false },
  d: { tool: "freehand", zoneMode: false },
  o: { tool: "ellipse", zoneMode: false },
  p: { tool: "polygon", zoneMode: false },
  t: { tool: "text", zoneMode: false },
  s: { tool: "stamp", zoneMode: false },
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return target.isContentEditable;
}

/**
 * Resolve a keydown to a plan action. Returns null when the event should be
 * left for the browser / camera controls.
 */
export function resolvePlanShortcut(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}): PlanShortcutAction | null {
  if (isEditableTarget(event.target)) {
    return null;
  }

  const mod = event.ctrlKey || event.metaKey;
  const { key } = event;

  if (mod && key.toLowerCase() === "z") {
    return event.shiftKey ? { type: "redo" } : { type: "undo" };
  }
  if (mod && key.toLowerCase() === "y") {
    return { type: "redo" };
  }
  if (key === "Delete" || key === "Backspace") {
    return { type: "delete" };
  }
  if (key === "Escape") {
    return { type: "escape" };
  }
  if (mod) {
    return null;
  }

  const mapped = TOOL_BY_KEY[key.toLowerCase()];
  if (mapped) {
    return { type: "tool", tool: mapped.tool, zoneMode: mapped.zoneMode };
  }
  return null;
}

export const PLAN_SHORTCUT_HELP = [
  "V / 1 — select",
  "Z / 2 — zone",
  "G / 3 — party",
  "R / 4 — route",
  "K / 5 — pack",
  "N / 6 — note",
  "L A D O P T S — draw tools",
  "Ctrl+Z / Ctrl+Y — undo / redo",
  "Del — delete",
  "Esc — select tool",
] as const;
