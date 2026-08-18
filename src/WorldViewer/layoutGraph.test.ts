import {
  buildAdjacency,
  doorGraphDepth,
  findComponents,
  isDoorStackPin,
  isLateralCaveLink,
  isPortalDoorAlign,
  isSequentialDungeonDescent,
  pickLayerZ,
} from "./layoutGraph";
import { DoorConnection, MapPose, ParsedMap } from "./types";

function mapBand(band: ParsedMap["band"]): ParsedMap {
  return {
    id: "x",
    name: "X",
    ignore: false,
    outside: band === "overworld",
    band,
    minX: 0,
    maxX: 100,
    minY: 0,
    maxY: 100,
    artMinX: 0,
    artMaxX: 100,
    artMinY: 0,
    artMaxY: 100,
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

describe("pickLayerZ", () => {
  const layerHeight = 480;
  const origin: MapPose = { x: 0, y: 0, z: 0 };

  it("uses band layers when bands differ", () => {
    expect(pickLayerZ(mapBand("overworld"), mapBand("indoor"), origin, layerHeight)).toBe(480);
    expect(pickLayerZ(mapBand("overworld"), mapBand("underground"), origin, layerHeight)).toBe(
      -480,
    );
  });

  it("stacks sequential dungeon levels downward", () => {
    const undergroundPose = { x: 0, y: 0, z: -480 };
    expect(
      pickLayerZ(mapBand("underground"), mapBand("underground"), undergroundPose, layerHeight),
    ).toBe(-480);
    const level1 = mapBand("underground");
    level1.id = "level1";
    const level2 = mapBand("underground");
    level2.id = "level2";
    expect(pickLayerZ(level1, level2, undergroundPose, layerHeight)).toBe(-960);
  });

  it("stacks nested indoor maps above their door", () => {
    const indoorPose = { x: 0, y: 0, z: 480 };
    expect(pickLayerZ(mapBand("indoor"), mapBand("indoor"), indoorPose, layerHeight)).toBe(960);
  });
  it("keeps cave and cove on the same underground layer", () => {
    const undergroundPose = { x: 0, y: 0, z: -480 };
    const winterCave = mapBand("underground");
    winterCave.id = "winter_cave";
    const winterCove = mapBand("underground");
    winterCove.id = "winter_cove";
    expect(isLateralCaveLink(winterCave, winterCove)).toBe(true);
    expect(pickLayerZ(winterCave, winterCove, undergroundPose, layerHeight)).toBe(-480);
  });
});

describe("isDoorStackPin", () => {
  it("locks lateral cave to cove doors", () => {
    const winterCave = mapBand("underground");
    winterCave.id = "winter_cave";
    const winterCove = mapBand("underground");
    winterCove.id = "winter_cove";
    expect(isDoorStackPin(winterCave, winterCove)).toBe(true);
  });

  it("aligns overworld portal doors but does not slab-pin them", () => {
    const forest = mapBand("overworld");
    forest.id = "halloween";
    const town = mapBand("overworld");
    town.id = "spookytown";
    expect(isPortalDoorAlign(forest, town)).toBe(true);
    expect(isDoorStackPin(forest, town)).toBe(false);
  });

  it("does not stack-pin a one-way exit onto its destination", () => {
    const town = mapBand("overworld");
    const arena = mapBand("indoor");
    expect(isDoorStackPin(town, arena, true)).toBe(true);
    expect(isDoorStackPin(town, arena, false)).toBe(false);
  });

  it("locks sequential dungeon descent but not same-depth branches", () => {
    const level1 = mapBand("underground");
    level1.id = "level1";
    const level2 = mapBand("underground");
    level2.id = "level2";
    const level2n = mapBand("underground");
    level2n.id = "level2n";
    expect(isSequentialDungeonDescent(level1, level2)).toBe(true);
    expect(isDoorStackPin(level1, level2)).toBe(true);
    expect(isDoorStackPin(level2, level2n)).toBe(false);
  });
});

function edge(fromMap: string, toMap: string): DoorConnection {
  return { fromMap, toMap, fromX: 0, fromY: 0, toX: 0, toY: 0, twoWay: true };
}

describe("door graph helpers", () => {
  it("finds one component and BFS depth from the root", () => {
    const connections = [edge("main", "mansion"), edge("mansion", "tomb")];
    const adj = buildAdjacency(connections);
    const components = findComponents(["tomb", "main", "mansion"], adj);
    expect(components).toHaveLength(1);
    expect(components[0].sort()).toEqual(["main", "mansion", "tomb"]);
    expect(doorGraphDepth("main", components[0], connections)).toBe(2);
  });

  it("keeps disconnected maps in separate components", () => {
    const connections = [edge("main", "mansion")];
    const adj = buildAdjacency(connections);
    const components = findComponents(["main", "mansion", "duelland"], adj);
    expect(components).toHaveLength(2);
  });
});
