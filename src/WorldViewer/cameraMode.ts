import * as THREE from "three";
import { ViewerMode } from "./types";
import {
  CameraPose,
  WorldBounds,
  computeOverviewPose,
  computeTopDownPose,
} from "./worldCameraBounds";

export const MAP_CONTROLS_HELP = [
  "Left drag — pan",
  "Scroll — zoom",
  "WASD / arrows — pan",
  "+ / − — zoom",
  "Home — reset view",
  "F — focus map",
  "Double-click — focus point",
] as const;

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

const WORLD_ORBIT_MIN_POLAR = 0.08;

export interface CameraMode {
  up: readonly [number, number, number];
  enableRotate: boolean;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
  allowVerticalPan: boolean;
  useFog: boolean;
  keepFocusHeight: boolean;
  allowClearSelection: boolean;
  showLayerSlider: boolean;
  showConnectionLegend: boolean;
  pose: (bounds: WorldBounds) => CameraPose;
  help: readonly string[];
}

const CAMERA_MODE: Record<ViewerMode, CameraMode> = {
  map: {
    up: [0, 0, -1],
    enableRotate: false,
    // OrbitControls caches object.up when constructed (still +Y). Polar 0 is
    // straight down in that space; π/2 would look at the horizon.
    minPolarAngle: 0,
    maxPolarAngle: 0,
    minAzimuthAngle: 0,
    maxAzimuthAngle: 0,
    allowVerticalPan: false,
    useFog: false,
    keepFocusHeight: true,
    allowClearSelection: false,
    showLayerSlider: false,
    showConnectionLegend: false,
    pose: computeTopDownPose,
    help: MAP_CONTROLS_HELP,
  },
  world: {
    up: [0, 1, 0],
    enableRotate: true,
    minPolarAngle: WORLD_ORBIT_MIN_POLAR,
    maxPolarAngle: Math.PI - WORLD_ORBIT_MIN_POLAR,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
    allowVerticalPan: true,
    useFog: true,
    keepFocusHeight: false,
    allowClearSelection: true,
    showLayerSlider: true,
    showConnectionLegend: true,
    pose: computeOverviewPose,
    help: WORLD_CONTROLS_HELP,
  },
};

export function cameraMode(mode: ViewerMode): CameraMode {
  return CAMERA_MODE[mode];
}

export function controlsHelpForMode(mode: ViewerMode): readonly string[] {
  return cameraMode(mode).help;
}

const FOG_COLOR = 0x101218;

/**
 * Apply fog settings to a scene. Reuses an existing FogExp2 instance when
 * possible, mutating only the density, to avoid allocating on every slider tick.
 */
export function applyFog(scene: THREE.Scene, mode: ViewerMode, density: number): void {
  if (!cameraMode(mode).useFog || density <= 0) {
    scene.fog = null;
    return;
  }
  const existing = scene.fog;
  if (existing instanceof THREE.FogExp2) {
    existing.density = density;
  } else {
    scene.fog = new THREE.FogExp2(FOG_COLOR, density);
  }
}
