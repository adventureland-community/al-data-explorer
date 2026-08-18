import { readFileSync } from "fs";
import { join } from "path";
import { GMap, GNpc } from "typed-adventureland";
import { layoutWorld, pickComponentRoot, verticalDelta } from "./layoutWorld";
import { countSameSlabOverlaps, mapArtRect, rectsOverlap } from "./rectLayout";
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
  it("door-aligns mansion above main at the hub", () => {
    const layout = layoutWorld(source, 480);
    const { main, mansion } = layout.poses;
    expect(main).toEqual({ x: 0, y: 0, z: 0 });
    expect(mansion.x).toBeCloseTo(616);
    expect(mansion.y).toBeCloseTo(631);
    expect(mansion.z).toBe(480);
  });

  it("places tomb underground and door-aligned to mansion", () => {
    const layout = layoutWorld(source, 480);
    const { mansion, tomb } = layout.poses;
    const edge = layout.connections.find(
      (connection) => connection.fromMap === "mansion" && connection.toMap === "tomb",
    );
    expect(tomb.z).toBeLessThan(mansion.z);
    expect(edge).toBeDefined();
    if (edge) {
      expect(tomb.x + edge.toX).toBeCloseTo(mansion.x + edge.fromX);
      expect(tomb.y + edge.toY).toBeCloseTo(mansion.y + edge.fromY);
    }
  });

  it("stacks dungeon levels downward on underground-to-underground doors", () => {
    const dungeonSource: MapSource = {
      maps: {
        main: {
          key: "main",
          name: "Town",
          outside: true,
          doors: [[160, 1370, 24, 32, "cave", 0, 4]],
          npcs: [],
          spawns: [
            [0, 0],
            [160, 1381],
          ],
        },
        cave: {
          key: "cave",
          name: "Cave",
          doors: [[0, 0, 16, 16, "level1", 0, 0]],
          npcs: [],
          spawns: [[0, 0]],
        },
        level1: {
          key: "level1",
          name: "Level 1",
          doors: [[0, 0, 16, 16, "level2", 0, 0]],
          npcs: [],
          spawns: [[0, 0]],
        },
        level2: {
          key: "level2",
          name: "Level 2",
          doors: [[0, 0, 16, 16, "level1", 0, 0]],
          npcs: [],
          spawns: [[0, 0]],
        },
      },
      geometry: {
        main: { min_x: 0, max_x: 800, min_y: 0, max_y: 800, tiles: [], placements: [] },
        cave: { min_x: 0, max_x: 100, min_y: 0, max_y: 100, tiles: [], placements: [] },
        level1: { min_x: 0, max_x: 100, min_y: 0, max_y: 100, tiles: [], placements: [] },
        level2: { min_x: 0, max_x: 100, min_y: 0, max_y: 100, tiles: [], placements: [] },
      },
    };
    const layout = layoutWorld(dungeonSource, 480);
    expect(layout.poses.main.z).toBe(0);
    expect(layout.poses.level2.z).toBeLessThan(layout.poses.level1.z);
    expect(layout.poses.level1.z).toBeLessThan(layout.poses.main.z);
  });

  it("clears same-layer art overlaps after size-aware slab separation", () => {
    const layout = layoutWorld(source, 480);
    expect(countSameSlabOverlaps(layout.maps, layout.poses)).toBe(0);
  });

  it("uses the highest-degree map as the component root", () => {
    const layout = layoutWorld(source, 480);
    expect(pickComponentRoot(["main", "mansion", "tomb"], layout.connections, layout.maps)).toBe(
      "mansion",
    );
  });

  it("puts indoor and overworld maps on different layers", () => {
    const layout = layoutWorld(source, 480);
    expect(layout.poses.mansion.z).not.toBe(layout.poses.main.z);
  });

  it("puts the tomb on a different layer than the mansion", () => {
    const layout = layoutWorld(source, 480);
    expect(layout.poses.tomb.z).not.toBe(layout.poses.mansion.z);
    expect(verticalDelta(layout.maps.mansion, layout.maps.tomb)).toBe(-1);
  });

  it("places winter cove beside winter cave on the same underground layer", () => {
    const winterSource: MapSource = {
      maps: {
        winterland: emptyMap({
          name: "Winterland",
          outside: true,
          doors: [[0, 0, 16, 16, "winter_cave", 0, 0]],
          spawns: [
            [0, 0],
            [0, 0],
            [0, 0],
            [100, 100],
          ],
        }),
        winter_cave: emptyMap({
          name: "Frozen Cave",
          doors: [
            [0, 0, 16, 16, "winterland", 0, 3],
            [50, 50, 16, 16, "winter_cove", 0, 0],
          ],
          spawns: [
            [0, 0],
            [50, 50],
          ],
        }),
        winter_cove: emptyMap({
          name: "Frozen Cove",
          doors: [[0, 0, 16, 16, "winter_cave", 0, 1]],
          spawns: [[0, 0]],
        }),
      },
      geometry: {
        winterland: { min_x: 0, max_x: 100, min_y: 0, max_y: 100, tiles: [], placements: [] },
        winter_cave: { min_x: 0, max_x: 100, min_y: 0, max_y: 100, tiles: [], placements: [] },
        winter_cove: { min_x: 0, max_x: 100, min_y: 0, max_y: 100, tiles: [], placements: [] },
      },
    };
    const layout = layoutWorld(winterSource, 480);
    expect(layout.maps.winter_cove.band).toBe("underground");
    expect(layout.poses.winter_cave.z).toBeLessThan(layout.poses.winterland.z);
    expect(layout.poses.winter_cove.z).toBe(layout.poses.winter_cave.z);
    expect(layout.poses.winter_cove.z).toBeLessThan(layout.poses.winterland.z);
  });

  it("keeps overworld door neighbors aligned and separated after slab passes", () => {
    const forestSource: MapSource = {
      maps: {
        halloween: emptyMap({
          name: "Spooky Forest",
          outside: true,
          doors: [[100, 200, 40, 40, "spookytown", 1, 0]],
          spawns: [
            [0, 0],
            [100, 210],
          ],
        }),
        spookytown: emptyMap({
          name: "Spooky Town",
          outside: true,
          doors: [[50, 300, 40, 40, "halloween", 0, 0]],
          spawns: [
            [50, 310],
            [0, 0],
          ],
        }),
      },
      geometry: {
        halloween: { min_x: 0, max_x: 400, min_y: 0, max_y: 400, tiles: [], placements: [] },
        spookytown: { min_x: 0, max_x: 400, min_y: 0, max_y: 400, tiles: [], placements: [] },
      },
    };
    const layout = layoutWorld(forestSource, 480);
    const edge = layout.connections.find(
      (connection) => connection.fromMap === "halloween" && connection.toMap === "spookytown",
    );
    expect(edge).toBeDefined();
    if (!edge) {
      return;
    }
    const hp = layout.poses.halloween;
    const sp = layout.poses.spookytown;
    expect(sp.z).toBe(hp.z);
    expect(countSameSlabOverlaps(layout.maps, layout.poses, 240)).toBe(0);
    const doorAx = hp.x + edge.fromX;
    const doorAy = hp.y + edge.fromY;
    const doorBx = sp.x + edge.toX;
    const doorBy = sp.y + edge.toY;
    expect(Math.hypot(doorBx - doorAx, doorBy - doorAy)).toBeGreaterThan(0);
  });

  it("separates a large overworld neighbor from main using map sizes", () => {
    const forestSource: MapSource = {
      maps: {
        main: emptyMap({
          name: "Town",
          outside: true,
          doors: [[100, 100, 32, 40, "halloween", 0, 0]],
          spawns: [[0, 0]],
        }),
        halloween: emptyMap({
          name: "Spooky Forest",
          outside: true,
          doors: [[50, 50, 40, 40, "main", 0, 0]],
          spawns: [[50, 50]],
        }),
      },
      geometry: {
        main: { min_x: 0, max_x: 800, min_y: 0, max_y: 800, tiles: [], placements: [] },
        halloween: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
      },
    };
    const layout = layoutWorld(forestSource, 480);
    expect(layout.poses.halloween.z).toBe(layout.poses.main.z);
    expect(countSameSlabOverlaps(layout.maps, layout.poses, 0)).toBe(0);
    const mainEdge = layout.connections.find(
      (connection) => connection.fromMap === "main" && connection.toMap === "halloween",
    );
    expect(mainEdge).toBeDefined();
    if (mainEdge) {
      const mp = layout.poses.main;
      const hp = layout.poses.halloween;
      const doorAx = mp.x + mainEdge.fromX;
      const doorAy = mp.y + mainEdge.fromY;
      const doorBx = hp.x + mainEdge.toX;
      const doorBy = hp.y + mainEdge.toY;
      expect(Math.hypot(doorBx - doorAx, doorBy - doorAy)).toBeLessThan(3000);
    }
  });

  it("places doorless overworld maps further from main than connected satellites", () => {
    const worldSource: MapSource = {
      maps: {
        main: emptyMap({
          name: "main",
          outside: true,
          doors: [[100, 100, 32, 40, "winter_inn", 0, 0]],
          spawns: [
            [0, 0],
            [100, 110],
          ],
        }),
        winter_inn: emptyMap({
          name: "winter_inn",
          doors: [
            [50, 50, 32, 40, "main", 0, 0],
            [50, 100, 32, 40, "winterland", 0, 0],
          ],
          spawns: [
            [50, 60],
            [50, 110],
          ],
        }),
        winterland: emptyMap({
          name: "winterland",
          outside: true,
          doors: [[50, 50, 32, 40, "winter_inn", 0, 0]],
          spawns: [[50, 60]],
        }),
        desertland: emptyMap({
          name: "desertland",
          outside: true,
          doors: [],
          spawns: [[0, 0]],
        }),
      },
      geometry: {
        main: { min_x: 0, max_x: 800, min_y: 0, max_y: 800, tiles: [], placements: [] },
        winter_inn: { min_x: 0, max_x: 400, min_y: 0, max_y: 400, tiles: [], placements: [] },
        winterland: { min_x: 0, max_x: 1200, min_y: 0, max_y: 1200, tiles: [], placements: [] },
        desertland: { min_x: 0, max_x: 1200, min_y: 0, max_y: 1200, tiles: [], placements: [] },
      },
    };
    const layout = layoutWorld(worldSource, 480);
    const mp = layout.poses.main!;
    const wp = layout.poses.winterland!;
    const dp = layout.poses.desertland!;
    const winterDist = Math.hypot(wp.x - mp.x, wp.y - mp.y);
    const desertDist = Math.hypot(dp.x - mp.x, dp.y - mp.y);
    expect(desertDist).toBeGreaterThan(winterDist);
  });

  it("keeps winterland off halloween on the overworld slab", () => {
    const worldSource: MapSource = {
      maps: {
        main: emptyMap({
          name: "main",
          outside: true,
          doors: [
            [100, 100, 32, 40, "halloween", 0, 0],
            [200, 200, 32, 40, "winter_inn", 0, 0],
          ],
          spawns: [
            [0, 0],
            [100, 110],
            [200, 210],
          ],
        }),
        halloween: emptyMap({
          name: "halloween",
          outside: true,
          doors: [[50, 50, 40, 40, "main", 0, 0]],
          spawns: [[50, 50]],
        }),
        winter_inn: emptyMap({
          name: "winter_inn",
          doors: [
            [50, 50, 32, 40, "main", 0, 0],
            [50, 100, 32, 40, "winterland", 0, 0],
          ],
          spawns: [
            [50, 60],
            [50, 110],
          ],
        }),
        winterland: emptyMap({
          name: "winterland",
          outside: true,
          doors: [[50, 50, 32, 40, "winter_inn", 0, 0]],
          spawns: [[50, 60]],
        }),
      },
      geometry: {
        main: { min_x: 0, max_x: 800, min_y: 0, max_y: 800, tiles: [], placements: [] },
        halloween: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
        winter_inn: { min_x: 0, max_x: 400, min_y: 0, max_y: 400, tiles: [], placements: [] },
        winterland: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
      },
    };
    const layout = layoutWorld(worldSource, 480);
    expect(layout.poses.winterland.z).toBe(layout.poses.halloween.z);
    expect(countSameSlabOverlaps(layout.maps, layout.poses, 240)).toBe(0);
  });

  it("places a one-way indoor exit beside main instead of stacking on it", () => {
    const duelSource: MapSource = {
      maps: {
        main: emptyMap({
          name: "main",
          outside: true,
          doors: [],
          spawns: [
            [0, 0],
            [300, 500],
          ],
        }),
        duelland: emptyMap({
          name: "duelland",
          instance: true,
          doors: [[0, 16, 32, 20, "main", 1, 0]],
          spawns: [[0, 0]],
        }),
      },
      geometry: {
        main: { min_x: 0, max_x: 800, min_y: 0, max_y: 800, tiles: [], placements: [] },
        duelland: { min_x: -800, max_x: 800, min_y: -800, max_y: 200, tiles: [], placements: [] },
      },
    };
    const layout = layoutWorld(duelSource, 480);
    expect(layout.maps.duelland.band).toBe("indoor");
    expect(layout.poses.duelland.z).toBe(480);
    expect(layout.poses.duelland.z).not.toBe(layout.poses.main.z);
    const overlap = rectsOverlap(
      mapArtRect(layout.maps.main, layout.poses.main),
      mapArtRect(layout.maps.duelland, layout.poses.duelland),
      240,
    );
    expect(overlap).toBe(false);
    const edge = layout.connections.find(
      (connection) => connection.fromMap === "duelland" && connection.toMap === "main",
    );
    expect(edge).toBeDefined();
    expect(edge?.twoWay).toBe(false);
  });

  it("separates same-depth dungeon branches on one underground slab", () => {
    const branchSource: MapSource = {
      maps: {
        main: {
          key: "main",
          name: "Town",
          outside: true,
          doors: [[160, 1370, 24, 32, "cave", 0, 4]],
          npcs: [],
          spawns: [
            [0, 0],
            [160, 1381],
          ],
        },
        cave: {
          key: "cave",
          name: "Cave",
          doors: [[0, 0, 16, 16, "level1", 0, 0]],
          npcs: [],
          spawns: [[0, 0]],
        },
        level1: {
          key: "level1",
          name: "Level 1",
          doors: [[0, 0, 16, 16, "level2", 0, 0]],
          npcs: [],
          spawns: [[0, 0]],
        },
        level2: {
          key: "level2",
          name: "Level 2",
          doors: [
            [0, 0, 16, 16, "level2n", 0, 0],
            [50, 0, 16, 16, "level2w", 0, 0],
          ],
          npcs: [],
          spawns: [
            [0, 0],
            [50, 0],
          ],
        },
        level2n: {
          key: "level2n",
          name: "Level 2N",
          doors: [[0, 0, 16, 16, "level2", 0, 0]],
          npcs: [],
          spawns: [[0, 0]],
        },
        level2w: {
          key: "level2w",
          name: "Level 2W",
          doors: [[0, 0, 16, 16, "level2", 0, 1]],
          npcs: [],
          spawns: [[0, 0]],
        },
      },
      geometry: {
        main: { min_x: 0, max_x: 800, min_y: 0, max_y: 800, tiles: [], placements: [] },
        cave: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
        level1: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
        level2: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
        level2n: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
        level2w: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
      },
    };
    const layout = layoutWorld(branchSource, 480);
    expect(layout.poses.level2n.z).toBe(layout.poses.level2w.z);
    expect(countSameSlabOverlaps(layout.maps, layout.poses)).toBe(0);
  });

  it("marks the mansion link as two-way", () => {
    const layout = layoutWorld(source, 480);
    const link = layout.connections.find(
      (connection) => connection.fromMap === "main" && connection.toMap === "mansion",
    );
    expect(link?.twoWay).toBe(true);
  });

  it("keeps overworld maps separated on the production map set", () => {
    const dataPath = join(process.cwd(), "public/data.json");
    const gameData = JSON.parse(readFileSync(dataPath, "utf8")) as MapSource & {
      npcs?: Record<string, unknown>;
    };
    const layout = layoutWorld(
      { maps: gameData.maps, geometry: gameData.geometry },
      480,
      false,
      (gameData.npcs ?? {}) as Record<string, GNpc>,
    );
    const overworldIds = Object.keys(layout.maps).filter(
      (id) => layout.maps[id].band === "overworld",
    );
    const overworldMaps = Object.fromEntries(overworldIds.map((id) => [id, layout.maps[id]]));
    const overworldPoses = Object.fromEntries(overworldIds.map((id) => [id, layout.poses[id]]));
    expect(countSameSlabOverlaps(overworldMaps, overworldPoses, 240)).toBe(0);
  });
});
