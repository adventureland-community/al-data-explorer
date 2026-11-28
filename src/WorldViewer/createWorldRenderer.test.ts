import {
  createWorldGlSurface,
  createWorldRenderer,
  formatWebGlUnavailableMessage,
  probeWorldGlSurface,
  WEBGL_UNAVAILABLE_MESSAGE,
  WORLD_GL_CONTEXT_ATTEMPTS,
  WORLD_GL_CONTEXT_TYPES,
} from "./createWorldRenderer";
import { WEBGL_TROUBLESHOOTING_URL } from "./WorldWebGlUnavailable";

describe("createWorldGlSurface", () => {
  it("starts with permissive attrs before powerPreference hints", () => {
    expect(WORLD_GL_CONTEXT_ATTEMPTS[0]).toEqual({});
    expect(WORLD_GL_CONTEXT_ATTEMPTS[1]).toEqual({ failIfMajorPerformanceCaveat: false });
    expect(
      WORLD_GL_CONTEXT_ATTEMPTS.some((attrs) => attrs.powerPreference === "high-performance"),
    ).toBe(true);
  });

  it("probes WebGL2 before WebGL1", () => {
    expect(WORLD_GL_CONTEXT_TYPES[0]).toBe("webgl2");
    expect(WORLD_GL_CONTEXT_TYPES).toContain("webgl");
  });

  it("uses WebGL2 when the browser provides it", () => {
    const tried: string[] = [];
    const fakeContext = { drawArrays() {} } as unknown as WebGL2RenderingContext;
    const surface = createWorldGlSurface(() => {
      const canvas = document.createElement("canvas");
      canvas.getContext = ((type: string) => {
        tried.push(type);
        return type === "webgl2" ? fakeContext : null;
      }) as HTMLCanvasElement["getContext"];
      return canvas;
    });

    expect(surface?.context).toBe(fakeContext);
    expect(tried[0]).toBe("webgl2");
  });

  it("exhausts WebGL2 attr attempts before trying WebGL1", () => {
    const tried: Array<{ type: string; attrs: WebGLContextAttributes }> = [];
    const fakeContext = { drawArrays() {} } as unknown as WebGLRenderingContext;
    const surface = createWorldGlSurface(() => {
      const canvas = document.createElement("canvas");
      canvas.getContext = ((type: string, attrs?: WebGLContextAttributes) => {
        tried.push({ type, attrs: attrs ?? {} });
        if (type === "webgl") {
          return fakeContext;
        }
        return null;
      }) as HTMLCanvasElement["getContext"];
      return canvas;
    });

    expect(surface).not.toBeNull();
    expect(surface?.context).toBe(fakeContext);
    expect(tried[0]?.type).toBe("webgl2");
    const firstWebgl1 = tried.findIndex((entry) => entry.type === "webgl");
    expect(firstWebgl1).toBe(WORLD_GL_CONTEXT_ATTEMPTS.length);
    expect(tried.slice(0, firstWebgl1).every((entry) => entry.type === "webgl2")).toBe(true);
  });

  it("returns null when every attempt fails", () => {
    const surface = createWorldGlSurface(() => {
      const canvas = document.createElement("canvas");
      canvas.getContext = (() => null) as HTMLCanvasElement["getContext"];
      return canvas;
    });
    expect(surface).toBeNull();
  });

  it("surfaces webglcontextcreationerror statusMessage from the browser", () => {
    const probe = probeWorldGlSurface(() => {
      const canvas = document.createElement("canvas");
      canvas.getContext = (() => {
        const event = new Event("webglcontextcreationerror") as WebGLContextEvent;
        Object.defineProperty(event, "statusMessage", {
          value: "WebGL creation failed:\n* tryANGLE (FEATURE_FAILURE_EGL_NO_CONFIG)",
        });
        canvas.dispatchEvent(event);
        return null;
      }) as HTMLCanvasElement["getContext"];
      return canvas;
    });

    expect(probe.surface).toBeNull();
    expect(probe.creationError).toContain("FEATURE_FAILURE_EGL_NO_CONFIG");
    expect(formatWebGlUnavailableMessage(probe.creationError)).toContain(
      "FEATURE_FAILURE_EGL_NO_CONFIG",
    );
  });
});

describe("createWorldRenderer", () => {
  it("throws a clear message when WebGL cannot be created", () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof original;
    try {
      expect(() => createWorldRenderer()).toThrow(WEBGL_UNAVAILABLE_MESSAGE);
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  });
});

describe("WebGL troubleshooting link", () => {
  it("points at Khronos get.webgl.org/troubleshooting", () => {
    expect(WEBGL_TROUBLESHOOTING_URL).toBe("https://get.webgl.org/troubleshooting");
  });
});
