import * as THREE from "three";

/** World units moved per screen pixel when panning — fixed, not tied to zoom distance. */
export const WORLD_UNITS_PER_PIXEL = 1.8;

const _panRight = new THREE.Vector3();
const _panForward = new THREE.Vector3();
const _panFallback = new THREE.Vector3();

function flattenOntoMapPlane(axis: THREE.Vector3, fallback: THREE.Vector3): void {
  axis.y = 0;
  if (axis.lengthSq() > 1e-8) {
    axis.normalize();
    return;
  }
  axis.copy(fallback);
  axis.y = 0;
  if (axis.lengthSq() > 1e-8) {
    axis.normalize();
    return;
  }
  axis.set(0, 0, 1);
}

/**
 * Grab-pan on the map plane (world XZ). When the camera looks straight down,
 * the look vector has no XZ component so we pan along camera.up instead
 * (map mode uses up = -Z so PIXI Y-down matches the screen).
 */
export function panDeltaFromScreen(
  camera: THREE.PerspectiveCamera,
  deltaX: number,
  deltaY: number,
  worldPerPixel = WORLD_UNITS_PER_PIXEL,
  out: THREE.Vector3,
): THREE.Vector3 {
  _panRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  flattenOntoMapPlane(_panRight, _panFallback.set(1, 0, 0));

  _panForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  flattenOntoMapPlane(_panForward, camera.up);

  return out
    .copy(_panRight)
    .multiplyScalar(-deltaX * worldPerPixel)
    .addScaledVector(_panForward, deltaY * worldPerPixel);
}
