import {
  createWorldGlSurface,
  createWorldRenderer,
  WEBGL_UNAVAILABLE_MESSAGE,
  WORLD_GL_CONTEXT_ATTEMPTS,
} from "./createWorldRenderer";

describe("createWorldGlSurface", () => {
  it("walks attribute attempts until a context is returned", () => {
    const tried: WebGLContextAttributes[] = [];
    const fakeContext = { drawArrays() {} } as unknown as WebGLRenderingContext;
    const surface = createWorldGlSurface(() => {
      const canvas = document.createElement("canvas");
      canvas.getContext = ((type: string, attrs?: WebGLContextAttributes) => {
        if (attrs) {
          tried.push(attrs);
        }
        if (type === "webgl" && tried.length >= 3) {
          return fakeContext;
        }
        return null;
      }) as HTMLCanvasElement["getContext"];
      return canvas;
    });

    expect(surface).not.toBeNull();
    expect(surface?.context).toBe(fakeContext);
    expect(tried.length).toBeGreaterThanOrEqual(3);
    expect(tried[0]).toEqual(WORLD_GL_CONTEXT_ATTEMPTS[0]);
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
