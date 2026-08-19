import { groupNeighborsByBand, summarizeNeighbors } from "./linkedMaps";
import { stubParsedMap } from "./parsedMapStub";
import { DoorConnection, MapPose, ParsedMap } from "./types";

function stubMap(id: string, band: ParsedMap["band"], name = id): ParsedMap {
  return stubParsedMap(id, { band, name, outside: band === "overworld" });
}

function edge(fromMap: string, toMap: string, twoWay = true): DoorConnection {
  return { fromMap, toMap, fromX: 0, fromY: 0, toX: 0, toY: 0, twoWay };
}

describe("summarizeNeighbors", () => {
  const maps: Record<string, ParsedMap> = {
    main: stubMap("main", "overworld", "Town"),
    mansion: stubMap("mansion", "indoor", "The Mansion"),
    tomb: stubMap("tomb", "underground", "The Tomb"),
  };
  const poses: Record<string, MapPose> = {
    main: { x: 0, y: 0, z: 0 },
    mansion: { x: 10, y: 0, z: 480 },
    tomb: { x: 10, y: 0, z: -480 },
  };

  it("merges doors to the same neighbor and groups by band", () => {
    const connections = [
      edge("main", "mansion"),
      edge("main", "mansion"),
      edge("tomb", "main", false),
    ];
    const neighbors = summarizeNeighbors("main", 0, connections, maps, poses);
    expect(neighbors).toHaveLength(2);
    const mansion = neighbors.find((neighbor) => neighbor.id === "mansion");
    const tomb = neighbors.find((neighbor) => neighbor.id === "tomb");
    expect(mansion?.doors).toBe(2);
    expect(mansion?.twoWay).toBe(true);
    expect(mansion?.layerLabel).toBe("above");
    expect(tomb?.inbound).toBe(true);
    expect(tomb?.outbound).toBe(false);
    expect(tomb?.oneWay).toBe(true);
    expect(groupNeighborsByBand(neighbors).map((group) => group.band)).toEqual([
      "indoor",
      "underground",
    ]);
  });
});
