/** Label for an AL facing row (0..3), from the viewer's perspective. */
export function facingLabel(facing: number): string {
  switch (facing) {
    case 1:
      return "Right"; // left-facing sprite = viewer's right profile
    case 2:
      return "Left"; // right-facing sprite = viewer's left profile
    case 3:
      return "Back";
    default:
      return "Front";
  }
}

/** Full revolution duration while the turntable is spinning. */
export const TURNTABLE_REV_MS = 4000;

/** Duration of a single ±90° nudge from the arrow buttons / keys. */
export const TURNTABLE_STEP_MS = 480;

/**
 * Half-width (degrees of sector-local yaw) of the edge-on crossfade.
 * Swap happens near ±90° tilt where the card is a thin line, so the blend
 * only needs to hide the last bit of silhouette pop.
 */
export const CROSSFADE_HALF_DEG = 7;

/**
 * Turn-right order of AL facing rows as continuous yaw increases:
 * front (0) → right profile / AL left (1) → back (3) → left profile / AL right (2).
 */
export const YAW_FACING_ORDER = [0, 1, 3, 2] as const;

/**
 * Map continuous yaw (degrees) → AL facing row.
 * 0° = front. Increasing yaw = character turns right.
 */
export function facingFromYaw(yawDeg: number): number {
  const a = ((yawDeg % 360) + 360) % 360;
  if (a < 45 || a >= 315) return 0;
  if (a < 135) return 1;
  if (a < 225) return 3;
  return 2;
}

export function yawFromFacing(facing: number): number {
  switch (facing) {
    case 1:
      return 90;
    case 3:
      return 180;
    case 2:
      return 270;
    default:
      return 0;
  }
}

export function normalizeYaw(yawDeg: number): number {
  return ((yawDeg % 360) + 360) % 360;
}

/** Shortest signed delta from `fromDeg` to `toDeg` (−180..180]. */
export function shortestYawDelta(fromDeg: number, toDeg: number): number {
  let d = normalizeYaw(toDeg) - normalizeYaw(fromDeg);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Snap continuous yaw to the nearest cardinal (0 / 90 / 180 / 270). */
export function snapYawToCardinal(yawDeg: number): number {
  const a = normalizeYaw(yawDeg);
  const snapped = Math.round(a / 90) * 90;
  return normalizeYaw(snapped);
}

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export type TurntableFaceView = {
  alFacing: number;
  /** Card tilt relative to the camera (deg). ±90 ≈ edge-on. */
  tiltDeg: number;
  visible: boolean;
  opacity: number;
};

/**
 * Single-card flip turntable.
 *
 * Within each 90° sector the card rotates toward edge-on, swaps to the next
 * facing at the thin edge, then opens again. A short opacity crossfade only
 * runs while both cards are near edge-on — that hides the facing snap the
 * old X-cross showed at mid-corner (where both arms were still wide).
 */
export function turntableFaceViews(yawDeg: number): TurntableFaceView[] {
  const yaw = normalizeYaw(yawDeg);
  const sector = Math.floor(yaw / 90) % 4;
  const local = yaw - sector * 90;
  const fromFacing = YAW_FACING_ORDER[sector] ?? 0;
  const toFacing = YAW_FACING_ORDER[(sector + 1) % 4] ?? 0;

  // Map sector-local yaw → tilt that hits ±90° at the mid-corner.
  const fromTilt = local * 2;
  const toTilt = (local - 90) * 2;

  if (local <= 45 - CROSSFADE_HALF_DEG) {
    return [{ alFacing: fromFacing, tiltDeg: fromTilt, visible: true, opacity: 1 }];
  }
  if (local >= 45 + CROSSFADE_HALF_DEG) {
    return [{ alFacing: toFacing, tiltDeg: toTilt, visible: true, opacity: 1 }];
  }

  const u = smoothstep01((local - (45 - CROSSFADE_HALF_DEG)) / (2 * CROSSFADE_HALF_DEG));
  return [
    { alFacing: fromFacing, tiltDeg: fromTilt, visible: true, opacity: 1 - u },
    { alFacing: toFacing, tiltDeg: toTilt, visible: u > 0.02, opacity: u },
  ];
}
