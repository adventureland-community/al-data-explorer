import * as THREE from "three";

/** Softest → preferred context attributes. Firefox often rejects high-performance / antialias. */
export const WORLD_GL_CONTEXT_ATTEMPTS: readonly WebGLContextAttributes[] = [
  { antialias: true, alpha: false, depth: true, powerPreference: "high-performance" },
  { antialias: true, alpha: false, depth: true, powerPreference: "default" },
  { antialias: false, alpha: false, depth: true, powerPreference: "default" },
  { antialias: false, alpha: false, depth: true },
];

export const WEBGL_UNAVAILABLE_MESSAGE =
  "WebGL is unavailable. Enable hardware acceleration (or allow WebGL) in your browser, then reload.";

type GlContext = WebGLRenderingContext | WebGL2RenderingContext;

export interface WorldGlSurface {
  canvas: HTMLCanvasElement;
  context: GlContext;
  attrs: WebGLContextAttributes;
}

/**
 * Try several WebGL attribute sets on fresh canvases.
 * Returning null (instead of throwing) lets callers show an in-app fallback.
 */
export function createWorldGlSurface(
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas"),
): WorldGlSurface | null {
  for (const attrs of WORLD_GL_CONTEXT_ATTEMPTS) {
    const canvas = createCanvas();
    const context =
      (canvas.getContext("webgl2", attrs) as GlContext | null) ||
      (canvas.getContext("webgl", attrs) as GlContext | null) ||
      (canvas.getContext("experimental-webgl", attrs) as GlContext | null);
    if (context) {
      return { canvas, context, attrs };
    }
  }
  return null;
}

/** Build a Three renderer, or throw a clear message when no WebGL context can be created. */
export function createWorldRenderer(): THREE.WebGLRenderer {
  const surface = createWorldGlSurface();
  if (!surface) {
    throw new Error(WEBGL_UNAVAILABLE_MESSAGE);
  }
  return new THREE.WebGLRenderer({
    canvas: surface.canvas,
    context: surface.context,
    antialias: Boolean(surface.attrs.antialias),
    alpha: false,
    logarithmicDepthBuffer: true,
    powerPreference: surface.attrs.powerPreference ?? "default",
  });
}

/** Release the GPU context promptly — Firefox is strict about leftover contexts on remount. */
export function disposeWorldRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.forceContextLoss();
  renderer.dispose();
}
