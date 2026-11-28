import * as THREE from "three";

/**
 * Context attribute ladder — most permissive first.
 *
 * Soft attrs only help when the browser can create *some* context but not with
 * our preferred options. They cannot recover hard failures (GPU/ANGLE refuse,
 * webgl.disabled, Troubleshoot Mode). Prefer `default` powerPreference:
 * `high-performance` does not unblock creation.
 *
 * Capture `webglcontextcreationerror` for the real statusMessage (MDN). On total
 * failure, the UI links to https://get.webgl.org/troubleshooting (Khronos).
 */
export const WORLD_GL_CONTEXT_ATTEMPTS: readonly WebGLContextAttributes[] = [
  {},
  { failIfMajorPerformanceCaveat: false },
  { antialias: false, alpha: false, depth: true, powerPreference: "default" },
  { antialias: true, alpha: false, depth: true, powerPreference: "default" },
  { antialias: false, alpha: false, depth: true, powerPreference: "low-power" },
  { antialias: false, alpha: false, depth: true },
  { antialias: true, alpha: false, depth: true, powerPreference: "high-performance" },
];

/**
 * Probe highest capability first, then fall back.
 * Firefox supports WebGL2; we only use WebGL1 when webgl2 getContext returns null.
 */
export const WORLD_GL_CONTEXT_TYPES = ["webgl2", "webgl", "experimental-webgl"] as const;

export const WEBGL_UNAVAILABLE_MESSAGE = "Couldn't create a WebGL context on this device.";

type GlContext = WebGLRenderingContext | WebGL2RenderingContext;

export interface WorldGlSurface {
  canvas: HTMLCanvasElement;
  context: GlContext;
  attrs: WebGLContextAttributes;
}

export interface WorldGlProbeResult {
  surface: WorldGlSurface | null;
  /** Browser `webglcontextcreationerror` statusMessage, when fired. */
  creationError: string | null;
}

function readGlContext(
  canvas: HTMLCanvasElement,
  type: typeof WORLD_GL_CONTEXT_TYPES[number],
  attrs: WebGLContextAttributes,
): { context: GlContext | null; creationError: string | null } {
  let creationError: string | null = null;
  const onError = (event: Event) => {
    const status = (event as WebGLContextEvent).statusMessage;
    if (typeof status === "string" && status.trim()) {
      creationError = status.trim();
    }
  };
  canvas.addEventListener("webglcontextcreationerror", onError);
  try {
    const context = canvas.getContext(type, attrs);
    if (!context) {
      return { context: null, creationError };
    }
    // experimental-webgl is typed as RenderingContext in DOM libs.
    if ("drawArrays" in context) {
      return { context, creationError: null };
    }
    return { context: null, creationError };
  } finally {
    canvas.removeEventListener("webglcontextcreationerror", onError);
  }
}

/**
 * Try context types outer, attribute sets inner.
 * Exhaust WebGL2 with the full attr ladder before falling back to WebGL1.
 */
export function probeWorldGlSurface(
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas"),
): WorldGlProbeResult {
  let creationError: string | null = null;
  for (const type of WORLD_GL_CONTEXT_TYPES) {
    for (const attrs of WORLD_GL_CONTEXT_ATTEMPTS) {
      // Fresh canvas per attempt: a failed getContext can still leave the element
      // unusable for a different context type on some Firefox builds.
      const canvas = createCanvas();
      const attempt = readGlContext(canvas, type, attrs);
      if (attempt.creationError) {
        creationError = attempt.creationError;
      }
      if (attempt.context) {
        return {
          surface: { canvas, context: attempt.context, attrs },
          creationError: null,
        };
      }
    }
  }
  return { surface: null, creationError };
}

export function createWorldGlSurface(
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas"),
): WorldGlSurface | null {
  return probeWorldGlSurface(createCanvas).surface;
}

export function formatWebGlUnavailableMessage(creationError: string | null): string {
  if (!creationError) {
    return WEBGL_UNAVAILABLE_MESSAGE;
  }
  return `${WEBGL_UNAVAILABLE_MESSAGE} (${creationError})`;
}

/** Build a Three renderer, or throw when no WebGL context can be created. */
export function createWorldRenderer(): THREE.WebGLRenderer {
  const probe = probeWorldGlSurface();
  if (!probe.surface) {
    throw new Error(formatWebGlUnavailableMessage(probe.creationError));
  }
  return new THREE.WebGLRenderer({
    canvas: probe.surface.canvas,
    context: probe.surface.context,
    antialias: Boolean(probe.surface.attrs.antialias),
    alpha: false,
    logarithmicDepthBuffer: true,
    powerPreference: probe.surface.attrs.powerPreference ?? "default",
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
