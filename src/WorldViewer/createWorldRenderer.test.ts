import {
  createWorldGlSurface,
  createWorldRenderer,
  WEBGL_UNAVAILABLE_MESSAGE,
  WORLD_GL_CONTEXT_ATTEMPTS,
  WORLD_GL_CONTEXT_TYPES,
} from "./createWorldRenderer";

describe("createWorldGlSurface", () => {
  it("prefers default powerPreference before high-performance", () => {
    expect(WORLD_GL_CONTEXT_ATTEMPTS[0]?.powerPreference).toBe("default");
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

  it("falls back to WebGL1 when WebGL2 is null", () => {
    const tried: Array<{ type: string; attrs: WebGLContextAttributes }> = [];
    const fakeContext = { drawArrays() {} } as unknown as WebGLRenderingContext;
    const surface = createWorldGlSurface(() => {
      const canvas = document.createElement("canvas");
      canvas.getContext = ((type: string, attrs?: WebGLContextAttributes) => {
        if (attrs) {
          tried.push({ type, attrs });
        }
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
    expect(tried.some((entry) => entry.type === "webgl")).toBe(true);
  });

  it("returns null when every attempt fails", () => {
    const surface = createWorldGlSurface(() => {
      const canvas = document.createElement("canvas");
      canvas.getContext = (() => null) as HTMLCanvasElement["getContext"];
      return canvas;
    });
    expect(surface).toBeNull();
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
