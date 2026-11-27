import * as THREE from "three";

/**
 * Context attribute ladder.
 *
 * Three.js throws "Error creating WebGL context with your selected attributes."
 * when a context exists only without our attrs, and plain "Error creating WebGL
 * context." when no context can be created at all (Firefox GPU blocklist,
 * webgl.disabled, Troubleshoot Mode, etc.). Soft attrs only help the first case.
 *
 * Prefer `default` powerPreference first: `high-performance` is a dual-GPU hint
 * that does not unblock creation, and Firefox is more likely to later lose those
 * contexts (WebGL spec).
 */
export const WORLD_GL_CONTEXT_ATTEMPTS: readonly WebGLContextAttributes[] = [
  { antialias: true, alpha: false, depth: true, powerPreference: "default" },
  { antialias: false, alpha: false, depth: true, powerPreference: "default" },
  { antialias: false, alpha: false, depth: true, powerPreference: "low-power" },
  { antialias: false, alpha: false, depth: true },
  { antialias: true, alpha: false, depth: true, powerPreference: "high-performance" },
];

/** Context type order: WebGL1 first — Firefox often blocks WebGL2 while WebGL1 works. */
export const WORLD_GL_CONTEXT_TYPES = ["webgl", "experimental-webgl", "webgl2"] as const;

export const WEBGL_UNAVAILABLE_MESSAGE =
  "WebGL is unavailable in this browser. Showing a 2D map instead when possible.";

type GlContext = WebGLRenderingContext | WebGL2RenderingContext;

export interface WorldGlSurface {
  canvas: HTMLCanvasElement;
  context: GlContext;
  attrs: WebGLContextAttributes;
}

function readGlContext(
  canvas: HTMLCanvasElement,
  type: typeof WORLD_GL_CONTEXT_TYPES[number],
  attrs: WebGLContextAttributes,
): GlContext | null {
  const context = canvas.getContext(type, attrs);
  if (!context) {
    return null;
  }
  // experimental-webgl is typed as RenderingContext in DOM libs.
  if ("drawArrays" in context) {
    return context;
  }
  return null;
}

/**
 * Try several WebGL attribute / type sets on fresh canvases.
 * Returning null (instead of throwing) lets callers show a 2D fallback.
 */
export function createWorldGlSurface(
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas"),
): WorldGlSurface | null {
  for (const attrs of WORLD_GL_CONTEXT_ATTEMPTS) {
    for (const type of WORLD_GL_CONTEXT_TYPES) {
      // Fresh canvas per attempt: a failed getContext can still leave the element
      // unusable for a different context type on some Firefox builds.
      const canvas = createCanvas();
      const context = readGlContext(canvas, type, attrs);
      if (context) {
        return { canvas, context, attrs };
      }
    }
  }
  return null;
}

/** Build a Three renderer, or throw when no WebGL context can be created. */
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

/**
 * Dispose renderer resources without forceContextLoss.
 * loseContext() permanently poisons the canvas for remount (React StrictMode /
 * route revisit); Firefox already releases GPU memory on dispose + DOM remove.
 */
export function disposeWorldRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.dispose();
}
