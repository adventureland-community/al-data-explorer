import { EXTRA_PACK_BOUNDS_COLOR, overlayColor, overlayHex } from "./overlayColors";

describe("overlayColors", () => {
  it("matches in-game border_mode colors", () => {
    expect(overlayColor("doors")).toBe(0x007fff);
    expect(overlayColor("quirks")).toBe(0x00ff00);
    expect(overlayColor("spawns")).toBe(0xfd7188);
    expect(overlayColor("monsters")).toBe(0xfc5f39);
    expect(overlayColor("rage")).toBe(0x916bbd);
    expect(EXTRA_PACK_BOUNDS_COLOR).toBe(0x5294ff);
    expect(overlayColor("bounds")).toBe(0xff2335);
    expect(overlayColor("npcs")).toBe(0x84d5ff);
    expect(overlayColor("machines")).toBe(0xfeb222);
    expect(overlayColor("animatables")).toBe(0xfeb222);
  });

  it("pads hex strings to six digits", () => {
    expect(overlayHex("doors")).toBe("#007fff");
    expect(overlayHex("quirks")).toBe("#00ff00");
  });
});
