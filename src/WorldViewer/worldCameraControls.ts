import * as THREE from "three";
import { MOUSE, TOUCH } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { computeOverviewPose, WorldBounds } from "./worldCameraBounds";

export {
  computeMapFocusDistance,
  computeOverviewPose,
  computeWorldBounds,
  mapCenterWorld,
  mapPointToWorld,
} from "./worldCameraBounds";
export type { CameraPose, WorldBounds } from "./worldCameraBounds";

export interface WorldCameraControls {
  controls: OrbitControls;
  focusOnPoint: (point: THREE.Vector3, distance?: number) => void;
  resetView: () => void;
  saveDefaultView: () => void;
  dispose: () => void;
}

/** World units moved per screen pixel when panning — fixed, not tied to zoom distance. */
const WORLD_UNITS_PER_PIXEL = 1.8;
/** World units moved per keyboard pan step. */
const KEYBOARD_PAN_STEP = 48;
/** World units moved per wheel notch / +/- key. */
const ZOOM_STEP = 140;

const _panRight = new THREE.Vector3();
const _panForward = new THREE.Vector3();
const _panDelta = new THREE.Vector3();
const _zoomDirection = new THREE.Vector3();

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function panCamera(controls: OrbitControls, delta: THREE.Vector3): void {
  controls.target.add(delta);
  controls.object.position.add(delta);
  controls.update();
}

/** Pan in world XZ using screen-pixel delta — speed does not scale with zoom distance. */
export function panFromScreenDelta(
  controls: OrbitControls,
  camera: THREE.PerspectiveCamera,
  deltaX: number,
  deltaY: number,
  worldPerPixel = WORLD_UNITS_PER_PIXEL,
): void {
  _panRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  _panRight.y = 0;
  if (_panRight.lengthSq() > 1e-8) {
    _panRight.normalize();
  } else {
    _panRight.set(1, 0, 0);
  }

  _panForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  _panForward.y = 0;
  if (_panForward.lengthSq() > 1e-8) {
    _panForward.normalize();
  } else {
    _panForward.set(0, 0, 1);
  }

  _panDelta
    .copy(_panRight)
    .multiplyScalar(-deltaX * worldPerPixel)
    .addScaledVector(_panForward, deltaY * worldPerPixel);
  panCamera(controls, _panDelta);
}

/**
 * Linear zoom — fixed step per wheel tick. When dollying in past the pivot, carry the
 * target forward so you can fly through a map layer and keep going.
 */
export function linearZoom(controls: OrbitControls, wheelDelta: number, step = ZOOM_STEP): void {
  const camera = controls.object as THREE.PerspectiveCamera;
  _zoomDirection.subVectors(controls.target, camera.position);
  const distance = _zoomDirection.length();
  if (distance < 1e-6) {
    _zoomDirection.set(0, -1, 0);
  } else {
    _zoomDirection.divideScalar(distance);
  }

  const sign = wheelDelta > 0 ? -1 : wheelDelta < 0 ? 1 : 0;
  if (sign === 0) {
    return;
  }
  const amount = sign * step;

  if (amount > 0 && distance <= amount) {
    const carry = amount - distance;
    camera.position.copy(controls.target);
    controls.target.addScaledVector(_zoomDirection, carry);
    camera.position.addScaledVector(_zoomDirection, carry);
  } else {
    camera.position.addScaledVector(_zoomDirection, amount);
  }
  controls.update();
}

export function clearWorldCameraDistanceLimits(controls: OrbitControls): void {
  controls.minDistance = 0;
  controls.maxDistance = Infinity;
}

export function updateWorldCameraResetPose(controls: OrbitControls, bounds: WorldBounds): void {
  clearWorldCameraDistanceLimits(controls);
  const overview = computeOverviewPose(bounds);
  controls.target0.set(overview.target.x, overview.target.y, overview.target.z);
  controls.position0.set(overview.position.x, overview.position.y, overview.position.z);
}

export function createWorldCameraControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  bounds: WorldBounds,
  onFocusSelection?: () => void,
): WorldCameraControls {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.rotateSpeed = 0.85;
  controls.screenSpacePanning = false;
  controls.enablePan = false;
  controls.enableZoom = false;
  clearWorldCameraDistanceLimits(controls);
  // Map/GIS convention: left pan (custom), right/middle orbit.
  controls.mouseButtons = {
    LEFT: MOUSE.PAN,
    MIDDLE: MOUSE.ROTATE,
    RIGHT: MOUSE.ROTATE,
  };
  controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN };
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = Math.PI - 0.08;

  domElement.tabIndex = 0;
  domElement.style.outline = "none";

  const overview = computeOverviewPose(bounds);
  camera.position.set(overview.position.x, overview.position.y, overview.position.z);
  controls.target.set(overview.target.x, overview.target.y, overview.target.z);
  controls.update();
  controls.saveState();

  const focusOnPoint = (point: THREE.Vector3, distance?: number) => {
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const currentDistance = offset.length() || bounds.radius * 1.4;
    const nextDistance = distance ?? currentDistance;
    if (offset.lengthSq() < 1e-6) {
      offset.set(0.55, 0.82, 0.62).normalize();
    } else {
      offset.normalize();
    }
    controls.enableDamping = false;
    controls.target.copy(point);
    camera.position.copy(point).addScaledVector(offset, nextDistance);
    controls.update();
    controls.enableDamping = true;
  };

  const resetView = () => {
    controls.reset();
  };

  const saveDefaultView = () => {
    controls.saveState();
  };

  let panning = false;
  let panDragActive = false;
  let panStartX = 0;
  let panStartY = 0;
  const PAN_DRAG_THRESHOLD_PX = 4;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    panning = true;
    panDragActive = false;
    panStartX = event.clientX;
    panStartY = event.clientY;
    domElement.focus({ preventScroll: true });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!panning) {
      return;
    }
    const deltaX = event.clientX - panStartX;
    const deltaY = event.clientY - panStartY;
    if (!panDragActive) {
      if (Math.hypot(deltaX, deltaY) < PAN_DRAG_THRESHOLD_PX) {
        return;
      }
      panDragActive = true;
    }
    panFromScreenDelta(controls, camera, deltaX, deltaY);
    panStartX = event.clientX;
    panStartY = event.clientY;
  };

  const endPan = () => {
    panning = false;
    panDragActive = false;
  };

  const onWheel = (event: WheelEvent) => {
    if (!controls.enabled) {
      return;
    }
    linearZoom(controls, event.deltaY);
    event.preventDefault();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    if (!controls.enabled) {
      return;
    }

    const key = event.key.toLowerCase();
    const step = (event.shiftKey ? 2.4 : 1) * KEYBOARD_PAN_STEP;

    switch (key) {
      case "w":
      case "arrowup":
        panCamera(controls, new THREE.Vector3(0, 0, -step));
        event.preventDefault();
        break;
      case "s":
      case "arrowdown":
        panCamera(controls, new THREE.Vector3(0, 0, step));
        event.preventDefault();
        break;
      case "a":
      case "arrowleft":
        panCamera(controls, new THREE.Vector3(-step, 0, 0));
        event.preventDefault();
        break;
      case "d":
      case "arrowright":
        panCamera(controls, new THREE.Vector3(step, 0, 0));
        event.preventDefault();
        break;
      case "q":
      case "pageup":
        panCamera(controls, new THREE.Vector3(0, step, 0));
        event.preventDefault();
        break;
      case "e":
      case "pagedown":
        panCamera(controls, new THREE.Vector3(0, -step, 0));
        event.preventDefault();
        break;
      case "+":
      case "=":
        linearZoom(controls, -100);
        event.preventDefault();
        break;
      case "-":
      case "_":
        linearZoom(controls, 100);
        event.preventDefault();
        break;
      case "home":
      case "0":
        resetView();
        event.preventDefault();
        break;
      case "f":
        if (event.ctrlKey || event.metaKey || event.altKey) {
          break;
        }
        onFocusSelection?.();
        event.preventDefault();
        break;
      default:
        break;
    }
  };

  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  domElement.addEventListener("pointerdown", onPointerDown);
  domElement.addEventListener("pointermove", onPointerMove);
  domElement.addEventListener("pointerup", endPan);
  domElement.addEventListener("pointercancel", endPan);
  domElement.addEventListener("pointerleave", endPan);
  domElement.addEventListener("wheel", onWheel, { passive: false });
  domElement.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);

  return {
    controls,
    focusOnPoint,
    resetView,
    saveDefaultView,
    dispose: () => {
      domElement.removeEventListener("pointerdown", onPointerDown);
      domElement.removeEventListener("pointermove", onPointerMove);
      domElement.removeEventListener("pointerup", endPan);
      domElement.removeEventListener("pointercancel", endPan);
      domElement.removeEventListener("pointerleave", endPan);
      domElement.removeEventListener("wheel", onWheel);
      domElement.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      controls.dispose();
    },
  };
}

export const WORLD_CONTROLS_HELP = [
  "Left drag — pan (fixed speed)",
  "Right / middle drag — orbit",
  "Scroll — zoom (linear, fly-through layers)",
  "WASD / arrows — pan",
  "Q / E — up / down layers",
  "+ / − — zoom",
  "Home — reset view",
  "F — focus selection",
  "Double-click map — focus point",
] as const;
