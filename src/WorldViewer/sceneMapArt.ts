import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer";
import {
  MapArtBake,
  createDefaultPatternSvg,
  setDefaultPatternFrame,
  tileAnimFrame,
} from "./renderMapCanvas";

function styleLayer(element: HTMLElement, width: number, height: number): void {
  element.style.position = "absolute";
  element.style.left = "0";
  element.style.top = "0";
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.pointerEvents = "none";
  if (element instanceof HTMLCanvasElement) {
    element.style.imageRendering = "pixelated";
    element.style.display = "block";
  }
}

export function mapArtOf(floor: THREE.Object3D): CSS3DObject | undefined {
  const found = floor.children.find((child) => child.userData.isMapArt);
  return found instanceof CSS3DObject ? found : undefined;
}

function makeMapArt(
  floor: THREE.Mesh,
  mapId: string,
  bake: MapArtBake,
  elapsedMs: number,
): CSS3DObject {
  const geometry = floor.geometry as THREE.PlaneGeometry;
  const { width, height } = geometry.parameters;
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  wrap.style.width = `${width}px`;
  wrap.style.height = `${height}px`;
  wrap.style.pointerEvents = "none";

  if (bake.animatedDefault) {
    const svg = createDefaultPatternSvg(mapId, bake.animatedDefault, width, height);
    const defaultFrame = tileAnimFrame(bake.animatedDefault.def, elapsedMs, { kind: "water" });
    setDefaultPatternFrame(svg, bake.animatedDefault.def, defaultFrame);
    wrap.appendChild(svg);
  }

  styleLayer(bake.staticCanvas, width, height);
  wrap.appendChild(bake.staticCanvas);

  if (bake.overlay) {
    styleLayer(bake.overlay, width, height);
    wrap.appendChild(bake.overlay);
    bake.paintOverlay?.(elapsedMs);
  }

  const art = new CSS3DObject(wrap);
  art.userData.isMapArt = true;
  art.userData.mapArt = bake;
  art.userData.lastDefaultFrame = bake.animatedDefault
    ? tileAnimFrame(bake.animatedDefault.def, elapsedMs, { kind: "water" })
    : -1;
  // Match floor plane (XZ): canvas Y-down maps to +Z, same as geometry coords.
  art.rotation.x = -Math.PI / 2;
  art.position.set(0, 0.02, 0);
  return art;
}

/**
 * Official tileset images have no CORS headers, so they cannot become WebGL
 * textures. Baked canvases are shown with CSS3D instead (display-only is allowed).
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
    const { parent } = object;
    if (!parent) {
      return;
    }
    const material = object.material as THREE.MeshBasicMaterial;
    const mapId = object.userData.mapId as string | undefined;
    const bake = mapId && enabled ? artByMap[mapId] : undefined;
    let art = mapArtOf(object);

    if (bake) {
      if (!art) {
        art = makeMapArt(object, mapId || "map", bake, elapsedMs);
        object.add(art);
      } else if (art.userData.mapArt !== bake) {
        object.remove(art);
        art = makeMapArt(object, mapId || "map", bake, elapsedMs);
        object.add(art);
      }
      art.visible = true;
      material.opacity = 0;
      material.needsUpdate = true;
      return;
    }

    if (art) {
      art.visible = false;
    }
    material.needsUpdate = true;
  });
}

export function applyMapAnimation(root: THREE.Object3D, elapsedMs: number): void {
  root.traverse((object) => {
    if (!object.userData.isMapArt || !(object instanceof CSS3DObject)) {
      return;
    }
    const bake = object.userData.mapArt as MapArtBake | undefined;
    if (!bake?.needsAnimation) {
      return;
    }
    if (bake.animatedDefault) {
      const frame = tileAnimFrame(bake.animatedDefault.def, elapsedMs, { kind: "water" });
      if (object.userData.lastDefaultFrame !== frame) {
        object.userData.lastDefaultFrame = frame;
        const svg = object.element.querySelector("svg");
        if (svg) {
          setDefaultPatternFrame(svg, bake.animatedDefault.def, frame);
        }
      }
    }
    bake.paintOverlay?.(elapsedMs);
  });
}
