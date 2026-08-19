import { overlayKindForPick, overlayTooltip } from "./overlayPick";
import { stubParsedMap } from "./parsedMapStub";

describe("overlayPick", () => {
  const maps = { mansion: stubParsedMap("mansion", { name: "The Mansion" }) };

  it("maps pick kinds onto overlay kinds", () => {
    expect(overlayKindForPick("door")).toBe("doors");
    expect(overlayKindForPick("quirk")).toBe("quirks");
    expect(overlayKindForPick("zone")).toBe("zones");
    expect(overlayKindForPick("rage")).toBe("rage");
    expect(overlayKindForPick("machine")).toBe("machines");
    expect(overlayKindForPick("animatable")).toBe("animatables");
    expect(overlayKindForPick("trap")).toBe("traps");
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
          monster: { type: "bee", x: 1, y: 2, width: 8, height: 8, count: 6, grow: false },
        },
        maps,
      ),
    ).toMatchObject({ title: "bee ×6", hint: "Click to inspect" });
    expect(
      overlayTooltip(
        {
          kind: "monster",
          mapId: "main",
          monster: { type: "bee", x: 1, y: 2, width: 8, height: 8, count: 6, grow: true },
        },
        maps,
      ),
    ).toMatchObject({
      title: "bee ×6 · grow",
      hint: "Grows when thinned · click to inspect",
    });
    expect(
      overlayTooltip(
        {
          kind: "monster",
          mapId: "main",
          monster: {
            type: "a7",
            x: 1,
            y: 2,
            width: 8,
            height: 8,
            count: 1,
            grow: false,
            roam: true,
          },
        },
        maps,
      ),
    ).toMatchObject({
      title: "a7 ×1 · roam",
      hint: "Roams this area · click to inspect",
    });
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

  it("lists spawn arrivals and npc roaming", () => {
    expect(
      overlayTooltip(
        {
          kind: "spawn",
          mapId: "main",
          spawn: {
            x: 0,
            y: 0,
            label: "0",
            index: 0,
            arrivals: [{ kind: "town", label: "Town skill location" }],
            departures: [],
          },
        },
        maps,
      ),
    ).toEqual({
      kind: "spawn",
      title: "Possible connections:\nTown skill location",
      hint: "Spawn 0",
    });
    expect(
      overlayTooltip(
        {
          kind: "spawn",
          mapId: "main",
          spawn: {
            x: 10,
            y: 20,
            label: "3",
            index: 3,
            arrivals: [{ kind: "door", label: "The Bank" }],
            departures: [{ kind: "door", label: "The Mansion" }],
          },
        },
        maps,
      ),
    ).toMatchObject({
      title: "Possible connections:\nThe Bank\nDoor to The Mansion",
      hint: "Spawn 3",
    });
    expect(
      overlayTooltip(
        {
          kind: "npc",
          mapId: "main",
          npc: {
            id: "bean",
            skin: "lionsuit",
            name: "Bean",
            x: 74,
            y: -34,
            label: "Bean",
            roam: { x: 0, y: 0, width: 200, height: 200 },
            moving: true,
          },
        },
        maps,
      ),
    ).toMatchObject({ title: "Bean", hint: "Moves around in this area" });
  });
});
