import { overlayInspect, overlayKindForPick, overlayTooltip } from "./overlayPick";
import { ParsedMap } from "./types";

function stubMap(id: string, name: string): ParsedMap {
  return {
    id,
    name,
    ignore: false,
    outside: true,
    band: "overworld",
    minX: 0,
    maxX: 10,
    minY: 0,
    maxY: 10,
    artMinX: 0,
    artMaxX: 10,
    artMinY: 0,
    artMaxY: 10,
    xLines: [],
    yLines: [],
    doors: [],
    spawns: [],
    quirks: [],
    npcs: [],
    monsters: [],
    zones: [],
  };
}

describe("overlayPick", () => {
  const maps = { mansion: stubMap("mansion", "The Mansion") };

  it("maps pick kinds onto overlay kinds", () => {
    expect(overlayKindForPick("door")).toBe("doors");
    expect(overlayKindForPick("quirk")).toBe("quirks");
    expect(overlayKindForPick("zone")).toBe("zones");
  });

  it("builds door and overlay tooltips", () => {
    expect(
      overlayTooltip(
        {
          kind: "door",
          mapId: "main",
          door: {
            fromMap: "main",
            toMap: "mansion",
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            destSpawn: 0,
          },
        },
        maps,
      ),
    ).toEqual({
      kind: "door",
      title: "Door to The Mansion",
      hint: "Click to enter",
    });
    expect(
      overlayTooltip(
        {
          kind: "monster",
          mapId: "main",
          monster: { type: "bee", x: 1, y: 2, width: 8, height: 8 },
        },
        maps,
      ),
    ).toMatchObject({ title: "bee pack", hint: "Click to inspect" });
    expect(
      overlayTooltip(
        {
          kind: "quirk",
          mapId: "main",
          quirk: { x: 0, y: 0, width: 4, height: 4, kind: "info", text: "Welcome" },
        },
        maps,
      ),
    ).toMatchObject({ title: "Welcome", hint: "info" });
  });

  it("inspects quirks, zones, and packs but not doors", () => {
    expect(
      overlayInspect({
        kind: "door",
        mapId: "main",
        door: {
          fromMap: "main",
          toMap: "mansion",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          destSpawn: 0,
        },
      }),
    ).toBeNull();
    expect(
      overlayInspect({
        kind: "quirk",
        mapId: "main",
        quirk: { x: 1, y: 2, width: 8, height: 12, kind: "note", text: "Hi" },
      }),
    ).toEqual({
      kind: "quirk",
      mapId: "main",
      quirkKind: "note",
      text: "Hi",
      x: 1,
      y: 2,
      width: 8,
      height: 12,
    });
    expect(
      overlayInspect({
        kind: "zone",
        mapId: "main",
        zone: { type: "fishing", polygon: [] },
      }),
    ).toEqual({
      kind: "zone",
      mapId: "main",
      type: "fishing",
    });
  });
});
