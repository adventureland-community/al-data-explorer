import { GMap } from "typed-adventureland";
import { layoutWorld, verticalDelta } from "./layoutWorld";
import { MapSource } from "./types";

function emptyMap(partial: Partial<GMap> & Pick<GMap, "name">): GMap {
  return {
    key: partial.name,
    doors: [],
    npcs: [],
    spawns: [[0, 0]],
    ...partial,
  };
}

const source: MapSource = {
  maps: {
    main: emptyMap({
      name: "Town",
      outside: true,
      doors: [[616, 610, 32, 40, "mansion", 0, 10]],
      spawns: [
        [0, 0],
        [616, 621],
      ],
    }),
    mansion: emptyMap({
      name: "The Mansion",
      doors: [
        [-1, 12, 40, 24, "main", 1, 0],
        [0, -494, 32, 47, "tomb", 0, 1],
      ],
      spawns: [
        [0, -21],
        [0, -482],
      ],
    }),
    tomb: emptyMap({
      name: "The Tomb",
      doors: [[0, -69, 33, 58, "mansion", 1, 0]],
      spawns: [[1, -54]],
    }),
  },
  geometry: {
    main: { min_x: 0, max_x: 800, min_y: 0, max_y: 800, tiles: [], placements: [] },
    mansion: { min_x: -440, max_x: 440, min_y: -688, max_y: 56, tiles: [], placements: [] },
    tomb: { min_x: -500, max_x: 500, min_y: -900, max_y: 300, tiles: [], placements: [] },
  },
};

describe("layoutWorld", () => {
  it("stacks the mansion over the mainland door so spawn and door XY match", () => {
    const layout = layoutWorld(source, 480);
    const { main, mansion } = layout.poses;
    expect(main).toEqual({ x: 0, y: 0, z: 0 });
    expect(mansion.x + 0).toBeCloseTo(main.x + 616);
    expect(mansion.y + -21).toBeCloseTo(main.y + 610);
    expect(mansion.z).toBe(480);
  });

  it("puts the tomb below the mansion", () => {
    const layout = layoutWorld(source, 480);
    expect(layout.poses.tomb.z).toBe(0);
    expect(verticalDelta(layout.maps.mansion, layout.maps.tomb)).toBe(-1);
  });

  it("marks the mansion link as two-way", () => {
    const layout = layoutWorld(source, 480);
    const link = layout.connections.find(
      (connection) => connection.fromMap === "main" && connection.toMap === "mansion",
    );
    expect(link?.twoWay).toBe(true);
  });
});
