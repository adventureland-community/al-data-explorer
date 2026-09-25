import { buildGameDataIndexes } from "../indexes";
import {
  buildTravelEdges,
  findTravelPath,
  travelPathDirections,
  travelPathHowTo,
  travelPathLabels,
  travelPathToMap,
  worldFocusHref,
} from "../mapTravel";
import type { CustomGData } from "../../GDataContext";

function travelFixture(): CustomGData {
  const G = {
    items: {},
    npcs: {
      transporter: {
        id: "transporter",
        name: "Alia",
        role: "transporter",
        skin: "transporter",
        places: { main: 0, winterland: 0 },
      },
      wbartender: {
        id: "wbartender",
        name: "Warin",
        role: "merchant",
        skin: "npc63",
      },
    },
    maps: {
      main: {
        name: "Mainland",
        npcs: [{ id: "transporter", position: [-83, -441] }],
        spawns: [[0, 0]],
        doors: [],
      },
      winterland: {
        name: "Winterland",
        npcs: [{ id: "transporter", position: [-73, -393] }],
        spawns: [
          [-8, -337],
          [0, 0],
        ],
        doors: [[-280, -132, 32, 40, "winter_inn", 0, 2]],
      },
      winter_inn: {
        name: "Wanderers' Inn",
        npcs: [{ id: "wbartender", position: [-143, -220] }],
        spawns: [[0, -5]],
        doors: [[0, 29, 24, 20, "winterland", 1, 0]],
      },
    },
  } as unknown as CustomGData;
  G.indexes = buildGameDataIndexes(G);
  return G;
}

describe("mapTravel", () => {
  it("connects Mainland to Winter Inn via Alia + door", () => {
    const G = travelFixture();
    const edges = buildTravelEdges(G);
    expect(edges.some((e) => e.kind === "transporter" && e.fromMap === "main")).toBe(true);
    expect(edges.some((e) => e.kind === "door" && e.toMap === "winter_inn")).toBe(true);

    const path = travelPathToMap(G, "winter_inn");
    expect(path).not.toBeNull();
    expect(path!.maps).toStrictEqual(["main", "winterland", "winter_inn"]);
    expect(path!.hops.map((h) => h.kind)).toStrictEqual(["transporter", "door"]);
    expect(path!.hops[0]?.label).toBe("Alia");
    expect(travelPathLabels(G, path!)).toStrictEqual([
      "Mainland",
      "Alia",
      "Winterland",
      "Wanderers' Inn",
    ]);
    expect(travelPathHowTo(G, path!)).toStrictEqual([
      "Take Alia on Mainland",
      "Enter door on Winterland",
    ]);
    expect(path!.hops[0]?.viaNpcId).toBe("transporter");
    expect(worldFocusHref("winter_inn", -143, -220)).toContain("map=winter_inn");
    const directions = travelPathDirections(G, path!, { x: -143, y: -220 });
    expect(directions.map((d) => d.role)).toStrictEqual(["start", "via", "end"]);
    expect(directions.map((d) => d.mapName)).toStrictEqual([
      "Mainland",
      "Winterland",
      "Wanderers' Inn",
    ]);
    expect(directions[0]?.action?.instruction).toBe("Take Alia");
    expect(directions[1]?.action?.instruction).toBe("Enter door");
    expect(directions[1]?.action?.toMapName).toBe("Wanderers' Inn");
    expect(directions[2]?.action).toBeUndefined();
    expect(directions[0]?.worldHref).toContain("x=-83");
    expect(directions[0]?.worldHref).toContain("y=-441");
    expect(directions[1]?.worldHref).toContain("x=-280");
    expect(directions[1]?.worldHref).toContain("y=-132");
    expect(directions[2]?.worldHref).toContain("x=-143");
    expect(directions[2]?.worldHref).toContain("y=-220");
    expect(worldFocusHref("winter_inn", -143, -220)).toContain("x=-143");
  });

  it("returns a trivial path when already on the start map", () => {
    const G = travelFixture();
    const path = findTravelPath(buildTravelEdges(G), "main", "main");
    expect(path).toStrictEqual({
      startMap: "main",
      endMap: "main",
      maps: ["main"],
      hops: [],
    });
  });
});
