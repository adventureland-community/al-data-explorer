import { MonsterFeature } from "./types";

/** Vogel sunflower angle — evenly fills a disk without a rigid grid. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Keep sprites inside the pack instead of sitting on the boundary. */
const PACK_INSET = 0.72;
const MIN_SPREAD = 12;

export interface PackSpriteSlot {
  x: number;
  y: number;
}

export function packCountValue(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.floor(value);
}

function packCount(monster: MonsterFeature): number {
  return packCountValue(monster.count);
}

export function packTypeHash(type: string): number {
  let hash = 0;
  for (let i = 0; i < type.length; i += 1) {
    hash = Math.imul(hash, 31) + type.charCodeAt(i);
  }
  return Math.abs(hash);
}

/** Rotate the sunflower so two overlapping pack types do not share slot XY. */
function typePhase(type: string): number {
  return (packTypeHash(type) % 360) * (Math.PI / 180);
}

function sunflowerOffsets(count: number, phase: number): Array<{ u: number; v: number }> {
  if (count <= 1) {
    return [{ u: 0, v: 0 }];
  }
  const offsets: Array<{ u: number; v: number }> = [];
  for (let i = 0; i < count; i += 1) {
    const t = i + 0.5;
    const radius = Math.sqrt(t / count);
    const theta = t * GOLDEN_ANGLE + phase;
    offsets.push({ u: radius * Math.cos(theta), v: radius * Math.sin(theta) });
  }
  return offsets;
}

export function pointInPolygon(x: number, y: number, polygon: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const crosses =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

function pullIntoPolygon(
  x: number,
  y: number,
  polygon: Array<[number, number]>,
  cx: number,
  cy: number,
): PackSpriteSlot {
  if (pointInPolygon(x, y, polygon)) {
    return { x, y };
  }
  let px = x;
  let py = y;
  for (let step = 0; step < 8; step += 1) {
    px = px * 0.55 + cx * 0.45;
    py = py * 0.55 + cy * 0.45;
    if (pointInPolygon(px, py, polygon)) {
      return { x: px, y: py };
    }
  }
  return { x: cx, y: cy };
}

function spreadAxes(monster: MonsterFeature): { rx: number; ry: number } {
  if (monster.radius) {
    const radius = Math.max(monster.radius * PACK_INSET, MIN_SPREAD / 2);
    return { rx: radius, ry: radius };
  }
  const rx = Math.max((monster.width / 2) * PACK_INSET, MIN_SPREAD / 2);
  const ry = Math.max((monster.height / 2) * PACK_INSET, MIN_SPREAD / 2);
  return { rx, ry };
}

/** Deterministic sprite positions for a pack, one per spawn `count`. */
export function packSpriteSlots(monster: MonsterFeature): PackSpriteSlot[] {
  const count = packCount(monster);
  const { rx, ry } = spreadAxes(monster);
  const offsets = sunflowerOffsets(count, typePhase(monster.type));
  const slots: PackSpriteSlot[] = [];
  for (const offset of offsets) {
    const x = monster.x + offset.u * rx;
    const y = monster.y + offset.v * ry;
    if (monster.polygon && monster.polygon.length >= 3) {
      slots.push(pullIntoPolygon(x, y, monster.polygon, monster.x, monster.y));
    } else {
      slots.push({ x, y });
    }
  }
  return slots;
}

export function packOverlayLabel(monster: MonsterFeature): string {
  const qty = `${monster.type} ×${packCount(monster)}`;
  const grow = monster.grow ? " · grow" : "";
  const roam = monster.roam ? " · roam" : "";
  return `${qty}${grow}${roam}`;
}
