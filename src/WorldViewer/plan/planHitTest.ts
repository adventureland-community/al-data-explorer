import { PlanDocument, PlanObject, PlanPoint } from "./types";

const HIT_PAD = 6;

function dist2(a: PlanPoint, b: PlanPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function pointNearSegment(point: PlanPoint, a: PlanPoint, b: PlanPoint, pad: number): boolean {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const length2 = abx * abx + aby * aby;
  if (length2 < 1e-6) {
    return dist2(point, a) <= pad * pad;
  }
  let t = ((point.x - a.x) * abx + (point.y - a.y) * aby) / length2;
  t = Math.max(0, Math.min(1, t));
  const closest = { x: a.x + abx * t, y: a.y + aby * t };
  return dist2(point, closest) <= pad * pad;
}

function pointInPolygon(point: PlanPoint, polygon: PlanPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersect =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + Number.EPSILON) + pi.x;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

export function planObjectContainsPoint(
  object: PlanObject,
  point: PlanPoint,
  packCenters?: ReadonlyMap<number, PlanPoint>,
): boolean {
  switch (object.kind) {
    case "path": {
      for (let i = 1; i < object.points.length; i += 1) {
        if (pointNearSegment(point, object.points[i - 1], object.points[i], HIT_PAD)) {
          return true;
        }
      }
      return false;
    }
    case "arrow":
      return pointNearSegment(point, object.from, object.to, HIT_PAD);
    case "rect": {
      const hw = Math.abs(object.width) / 2;
      const hh = Math.abs(object.height) / 2;
      return (
        point.x >= object.x - hw - HIT_PAD &&
        point.x <= object.x + hw + HIT_PAD &&
        point.y >= object.y - hh - HIT_PAD &&
        point.y <= object.y + hh + HIT_PAD
      );
    }
    case "ellipse": {
      const rx = Math.max(Math.abs(object.radiusX), 1);
      const ry = Math.max(Math.abs(object.radiusY), 1);
      const dx = (point.x - object.x) / (rx + HIT_PAD);
      const dy = (point.y - object.y) / (ry + HIT_PAD);
      return dx * dx + dy * dy <= 1;
    }
    case "polygon":
      return object.points.length >= 3 && pointInPolygon(point, object.points);
    case "text":
    case "stamp":
    case "ghost":
    case "pin":
      return dist2(point, { x: object.x, y: object.y }) <= HIT_PAD * 2 * (HIT_PAD * 2);
    case "route": {
      for (let i = 1; i < object.waypoints.length; i += 1) {
        if (pointNearSegment(point, object.waypoints[i - 1], object.waypoints[i], HIT_PAD)) {
          return true;
        }
      }
      for (const waypoint of object.waypoints) {
        if (dist2(point, waypoint) <= HIT_PAD * HIT_PAD) {
          return true;
        }
      }
      return false;
    }
    case "packMarker": {
      const center = packCenters?.get(object.packIndex);
      if (!center) {
        return false;
      }
      return dist2(point, center) <= HIT_PAD * 3 * (HIT_PAD * 3);
    }
    default: {
      const exhaustive: never = object;
      return exhaustive;
    }
  }
}

/** Top-most (last drawn) hit wins. */
export function hitTestPlan(
  doc: PlanDocument,
  point: PlanPoint,
  packCenters?: ReadonlyMap<number, PlanPoint>,
): PlanObject | null {
  for (let i = doc.objects.length - 1; i >= 0; i -= 1) {
    const object = doc.objects[i];
    if (planObjectContainsPoint(object, point, packCenters)) {
      return object;
    }
  }
  return null;
}
