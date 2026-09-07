import {
  EXTRA_PACK_BOUNDS_COLOR,
  MARKET_AREA_COLOR,
  MARKET_STOP_COLOR,
  NPC_ROAM_COLOR,
  overlayColor,
  overlayHex,
} from "./overlayColors";

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

  it("keeps roam cyan and market gold/orange distinct", () => {
    expect(NPC_ROAM_COLOR).toBe(0x84d5ff);
    expect(overlayColor("market")).toBe(0xf0b742);
    expect(MARKET_AREA_COLOR).toBe(0xf0b742);
    expect(MARKET_STOP_COLOR).toBe(0xff7a3d);
    expect(MARKET_AREA_COLOR).not.toBe(NPC_ROAM_COLOR);
    expect(MARKET_STOP_COLOR).not.toBe(MARKET_AREA_COLOR);
  });

  it("pads hex strings to six digits", () => {
    expect(overlayHex("doors")).toBe("#007fff");
    expect(overlayHex("quirks")).toBe("#00ff00");
  });
});
