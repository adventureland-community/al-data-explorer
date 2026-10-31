import { PlanPoint, PlanRouteObject } from "./types";

function segmentLength(a: PlanPoint, b: PlanPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function routePolylineLength(route: PlanRouteObject): number {
  if (route.waypoints.length < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 1; i < route.waypoints.length; i += 1) {
    total += segmentLength(route.waypoints[i - 1], route.waypoints[i]);
  }
  if (route.loop) {
    total += segmentLength(route.waypoints[route.waypoints.length - 1], route.waypoints[0]);
  }
  return total;
}

/** t in [0,1] along the route (loop wraps). */
export function pointAlongRoute(route: PlanRouteObject, t: number): PlanPoint | null {
  if (route.waypoints.length === 0) {
    return null;
  }
  if (route.waypoints.length === 1) {
    return route.waypoints[0];
  }
  const total = routePolylineLength(route);
  if (total <= 0) {
    return route.waypoints[0];
  }
  let distance = (((t % 1) + 1) % 1) * total;
  const segments: Array<[PlanPoint, PlanPoint]> = [];
  for (let i = 1; i < route.waypoints.length; i += 1) {
    segments.push([route.waypoints[i - 1], route.waypoints[i]]);
  }
  if (route.loop) {
    segments.push([route.waypoints[route.waypoints.length - 1], route.waypoints[0]]);
  }
  for (const [a, b] of segments) {
    const length = segmentLength(a, b);
    if (distance <= length) {
      const u = length === 0 ? 0 : distance / length;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }
    distance -= length;
  }
  return route.waypoints[route.waypoints.length - 1];
}

/** Advance playback by dt seconds given speed (px/s) and multiplier. */
export function advanceRouteT(args: {
  route: PlanRouteObject;
  t: number;
  dtSeconds: number;
  speedPx: number;
  speedMul: number;
  loop: boolean;
}): { t: number; done: boolean } {
  const length = routePolylineLength(args.route);
  if (length <= 0) {
    return { t: args.t, done: true };
  }
  const delta = (args.speedPx * args.speedMul * args.dtSeconds) / length;
  const next = args.t + delta;
  if (args.loop) {
    return { t: next % 1, done: false };
  }
  if (next >= 1) {
    return { t: 1, done: true };
  }
  return { t: next, done: false };
}
