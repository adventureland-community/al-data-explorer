import { parseDropSimParams } from "../useDropSimParams";

describe("parseDropSimParams share", () => {
  it("accepts decimal shares including zero", () => {
    expect(parseDropSimParams(new URLSearchParams("share=0.1")).share).toBe(0.1);
    expect(parseDropSimParams(new URLSearchParams("share=0")).share).toBe(0);
    expect(parseDropSimParams(new URLSearchParams("share=0.05")).share).toBe(0.05);
  });

  it("clamps share to unit interval", () => {
    expect(parseDropSimParams(new URLSearchParams("share=1.5")).share).toBe(1);
    expect(parseDropSimParams(new URLSearchParams("share=-0.1")).share).toBe(0);
  });
});
