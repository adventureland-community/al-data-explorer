import * as THREE from "three";
import { presentMapArt, MapArtBake } from "./renderMapCanvas";

const SELECTED_ART_TINT = 0xffffff;
const UNSELECTED_ART_TINT = 0xd0d0d0;

/**
 * Nearest when magnified (crisp pixels). Trilinear mipmaps when minified so
 * perspective zoom does not moiré. Matches PIXI NEAREST up close, without the
 * striped aliasing you get from a single unfiltered lod in 3D.
 */
export function nearestCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function disposeMaterialMap(material: THREE.MeshBasicMaterial): void {
  if (material.map) {
    material.map.dispose();
    material.map = null;
  }
}

export function floorHasMapArt(floor: THREE.Object3D): boolean {
  return Boolean(floor.userData.hasMapArt);
}

function applyBakeToFloor(floor: THREE.Mesh, bake: MapArtBake, elapsedMs: number): void {
  const material = floor.material as THREE.MeshBasicMaterial;
  presentMapArt(bake, elapsedMs);
  disposeMaterialMap(material);
  material.map = nearestCanvasTexture(bake.displayCanvas);
  material.transparent = true;
  material.opacity = 1;
  material.depthWrite = true;
  material.alphaTest = 0.02;
  material.fog = false;
  material.color.setHex(UNSELECTED_ART_TINT);
  material.needsUpdate = true;
  floor.userData.mapArt = bake;
  floor.userData.hasMapArt = true;
}

function clearFloorArt(floor: THREE.Mesh): void {
  const material = floor.material as THREE.MeshBasicMaterial;
  disposeMaterialMap(material);
  material.transparent = true;
  material.depthWrite = false;
  material.alphaTest = 0;
  material.fog = true;
  material.opacity = 0.55;
  floor.userData.mapArt = undefined;
  floor.userData.hasMapArt = false;
  material.needsUpdate = true;
}

/**
 * Official tilesets are fetched into public/images (same origin), so baked
 * canvases can be WebGL textures. Water and land share one bitmap per water
 * frame (game.js rtextures), so animated river tiles cannot cover the bridge.
 */
export function applyFloorCanvases(
  root: THREE.Object3D,
  artByMap: Record<string, MapArtBake>,
  enabled: boolean,
  elapsedMs: number,
): void {
  root.traverse((object) => {
    if (!object.userData.isFloor || !(object instanceof THREE.Mesh)) {
      return;
    }
    const mapId = object.userData.mapId as string | undefined;
    const bake = mapId && enabled ? artByMap[mapId] : undefined;

    if (bake) {
      if (object.userData.mapArt !== bake) {
        applyBakeToFloor(object, bake, elapsedMs);
      } else {
        object.userData.hasMapArt = true;
      }
      return;
    }

    if (object.userData.hasMapArt || object.userData.mapArt) {
      clearFloorArt(object);
    }
  });
}

export function applyMapAnimation(root: THREE.Object3D, elapsedMs: number): void {
  root.traverse((object) => {
    if (!object.userData.isFloor || !(object instanceof THREE.Mesh)) {
      return;
    }
    const bake = object.userData.mapArt as MapArtBake | undefined;
    if (!bake?.needsAnimation) {
      return;
    }
    if (!presentMapArt(bake, elapsedMs)) {
      return;
    }
    const material = object.material as THREE.MeshBasicMaterial;
    if (material.map) {
      material.map.needsUpdate = true;
    }
  });
}

export function tintFloorArt(floor: THREE.Mesh, selected: boolean): void {
  const material = floor.material as THREE.MeshBasicMaterial;
  material.color.setHex(selected ? SELECTED_ART_TINT : UNSELECTED_ART_TINT);
}
