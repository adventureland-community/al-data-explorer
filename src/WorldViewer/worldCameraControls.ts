import * as THREE from "three";
import { MOUSE, TOUCH } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { cameraMode } from "./cameraMode";
import { ViewerMode } from "./types";
import { CameraPose, WorldBounds, worldFocusDirection } from "./worldCameraBounds";
import { panDeltaFromScreen, WORLD_UNITS_PER_PIXEL } from "./worldCameraPan";

export {
  computeMapFocusDistance,
  computeOverviewPose,
  computeTopDownPose,
  computeWorldBounds,
  computeWorldFocusPose,
  computeWorldFocusPoseAtPoint,
  mapCenterWorld,
  mapPointToWorld,
  worldFocusDirection,
} from "./worldCameraBounds";
export type { CameraPose, WorldBounds } from "./worldCameraBounds";
export { panDeltaFromScreen, WORLD_UNITS_PER_PIXEL } from "./worldCameraPan";

export interface WorldCameraControls {
  controls: OrbitControls;
  focusOnPoint: (point: THREE.Vector3, distance?: number) => void;
  focusOnPose: (pose: CameraPose) => void;
  resetView: () => void;
  saveDefaultView: () => void;
  setViewMode: (mode: ViewerMode, bounds: WorldBounds, options?: { resetCamera?: boolean }) => void;
  isDragging: () => boolean;
  dispose: () => void;
}

/** World units moved per keyboard pan step. */
const KEYBOARD_PAN_STEP = 48;
/** World units moved per wheel notch / +/- key. */
const ZOOM_STEP = 140;
const MAP_ZOOM_MIN_HEIGHT = 80;

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

export function clearWorldCameraDistanceLimits(controls: OrbitControls): void {
  controls.minDistance = 0;
  controls.maxDistance = Infinity;
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

function mapZoomHeightLimits(bounds: WorldBounds): { min: number; max: number } {
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 240);
  return { min: MAP_ZOOM_MIN_HEIGHT, max: Math.max(span * 3, MAP_ZOOM_MIN_HEIGHT * 4) };
}

function zoomMapHeight(controls: OrbitControls, wheelDelta: number, bounds: WorldBounds): void {
  const camera = controls.object as THREE.PerspectiveCamera;
  const { min, max } = mapZoomHeightLimits(bounds);
  const height = camera.position.y - controls.target.y;
  const sign = wheelDelta > 0 ? 1 : wheelDelta < 0 ? -1 : 0;
  if (sign === 0) {
    return;
  }
  const next = Math.min(max, Math.max(min, height + sign * ZOOM_STEP));
  camera.position.y = controls.target.y + next;
  controls.update();
}

function zoomForMode(
  mode: ViewerMode,
  controls: OrbitControls,
  wheelDelta: number,
  bounds: WorldBounds,
): void {
  switch (mode) {
    case "map":
      zoomMapHeight(controls, wheelDelta, bounds);
      return;
    case "world":
      linearZoom(controls, wheelDelta);
      return;
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

function applyCameraUp(camera: THREE.PerspectiveCamera, mode: ViewerMode): void {
  camera.up.set(...cameraMode(mode).up);
}

function applyOrbitLimits(controls: OrbitControls, mode: ViewerMode): void {
  const next = cameraMode(mode);
  controls.enableRotate = next.enableRotate;
  controls.minPolarAngle = next.minPolarAngle;
  controls.maxPolarAngle = next.maxPolarAngle;
  controls.minAzimuthAngle = next.minAzimuthAngle;
  controls.maxAzimuthAngle = next.maxAzimuthAngle;
}

function applyResetPose(controls: OrbitControls, mode: ViewerMode, bounds: WorldBounds): void {
  clearWorldCameraDistanceLimits(controls);
  const pose = cameraMode(mode).pose(bounds);
  controls.target0.set(pose.target.x, pose.target.y, pose.target.z);
  controls.position0.set(pose.position.x, pose.position.y, pose.position.z);
}

/** Pan in world XZ using screen-pixel delta — speed does not scale with zoom distance. */
export function panFromScreenDelta(
  controls: OrbitControls,
  camera: THREE.PerspectiveCamera,
  deltaX: number,
  deltaY: number,
  worldPerPixel = WORLD_UNITS_PER_PIXEL,
): void {
  panDeltaFromScreen(camera, deltaX, deltaY, worldPerPixel, _panDelta);
  panCamera(controls, _panDelta);
}

export function updateWorldCameraResetPose(
  controls: OrbitControls,
  bounds: WorldBounds,
  mode: ViewerMode,
): void {
  applyResetPose(controls, mode, bounds);
}

export function createWorldCameraControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  bounds: WorldBounds,
  onFocusSelection: () => void,
  initialMode: ViewerMode,
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

  const modeRef = { current: initialMode };
  const boundsRef = { current: bounds };

  applyOrbitLimits(controls, initialMode);
  applyCameraUp(camera, initialMode);

  domElement.tabIndex = 0;
  domElement.style.outline = "none";

  const start = cameraMode(initialMode).pose(bounds);
  camera.position.set(start.position.x, start.position.y, start.position.z);
  controls.target.set(start.target.x, start.target.y, start.target.z);
  controls.update();
  controls.saveState();

  const focusOnPose = (pose: CameraPose) => {
    controls.enableDamping = false;
    applyCameraUp(camera, modeRef.current);
    controls.target.set(pose.target.x, pose.target.y, pose.target.z);
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    controls.update();
    controls.enableDamping = true;
  };

  const focusOnPoint = (point: THREE.Vector3, distance?: number) => {
    controls.enableDamping = false;
    const mode = cameraMode(modeRef.current);
    const currentHeight = Math.abs(camera.position.y - controls.target.y);
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    applyCameraUp(camera, modeRef.current);
    controls.target.copy(point);
    if (mode.keepFocusHeight) {
      camera.position.set(point.x, point.y + (distance ?? currentHeight), point.z);
    } else {
      const currentDistance = offset.length() || boundsRef.current.radius * 1.4;
      const nextDistance = distance ?? currentDistance;
      if (offset.lengthSq() < 1e-6) {
        const focusDir = worldFocusDirection();
        offset.set(focusDir.x, focusDir.y, focusDir.z);
      } else {
        offset.normalize();
      }
      camera.position.copy(point).addScaledVector(offset, nextDistance);
    }
    controls.update();
    controls.enableDamping = true;
  };

  const resetView = () => {
    applyCameraUp(camera, modeRef.current);
    controls.reset();
    applyCameraUp(camera, modeRef.current);
    controls.update();
  };

  const saveDefaultView = () => {
    controls.saveState();
  };

  const setViewMode = (
    mode: ViewerMode,
    nextBounds: WorldBounds,
    options: { resetCamera?: boolean } = {},
  ) => {
    modeRef.current = mode;
    boundsRef.current = nextBounds;
    applyOrbitLimits(controls, mode);
    applyCameraUp(camera, mode);
    applyResetPose(controls, mode, nextBounds);
    if (options.resetCamera !== false) {
      controls.reset();
      applyCameraUp(camera, mode);
      controls.update();
      controls.saveState();
    }
  };

  let panning = false;
  let panDragActive = false;
  let panDragOccurred = false;
  let panStartX = 0;
  let panStartY = 0;
  const PAN_DRAG_THRESHOLD_PX = 4;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    panning = true;
    panDragActive = false;
    panDragOccurred = false;
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
      panDragOccurred = true;
    }
    panFromScreenDelta(controls, camera, deltaX, deltaY);
    panStartX = event.clientX;
    panStartY = event.clientY;
  };

  const endPan = () => {
    panning = false;
    panDragActive = false;
  };

  const isDragging = () => panDragActive || panDragOccurred;

  const onWheel = (event: WheelEvent) => {
    if (!controls.enabled) {
      return;
    }
    zoomForMode(modeRef.current, controls, event.deltaY, boundsRef.current);
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
    const { allowVerticalPan } = cameraMode(modeRef.current);

    switch (key) {
      case "w":
      case "arrowup":
        panDeltaFromScreen(camera, 0, -step, 1, _panDelta);
        panCamera(controls, _panDelta);
        event.preventDefault();
        break;
      case "s":
      case "arrowdown":
        panDeltaFromScreen(camera, 0, step, 1, _panDelta);
        panCamera(controls, _panDelta);
        event.preventDefault();
        break;
      case "a":
      case "arrowleft":
        panDeltaFromScreen(camera, -step, 0, 1, _panDelta);
        panCamera(controls, _panDelta);
        event.preventDefault();
        break;
      case "d":
      case "arrowright":
        panDeltaFromScreen(camera, step, 0, 1, _panDelta);
        panCamera(controls, _panDelta);
        event.preventDefault();
        break;
      case "q":
      case "pageup":
        if (allowVerticalPan) {
          panCamera(controls, new THREE.Vector3(0, step, 0));
          event.preventDefault();
        }
        break;
      case "e":
      case "pagedown":
        if (allowVerticalPan) {
          panCamera(controls, new THREE.Vector3(0, -step, 0));
          event.preventDefault();
        }
        break;
      case "+":
      case "=":
        zoomForMode(modeRef.current, controls, -100, boundsRef.current);
        event.preventDefault();
        break;
      case "-":
      case "_":
        zoomForMode(modeRef.current, controls, 100, boundsRef.current);
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
        onFocusSelection();
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
    focusOnPose,
    resetView,
    saveDefaultView,
    setViewMode,
    isDragging,
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
