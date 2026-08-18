import { analyzeWorldLayout } from "./layoutAnalysis";
import { layoutWorld } from "./layoutWorld";
import { MapSource, WorldLayout } from "./types";

const source: MapSource = {
  maps: {
    main: {
      key: "main",
      name: "Town",
      outside: true,
      doors: [[616, 610, 32, 40, "mansion", 0, 10]],
      npcs: [],
      spawns: [
        [0, 0],
        [616, 621],
      ],
    },
    mansion: {
      key: "mansion",
      name: "The Mansion",
      doors: [
        [-1, 12, 40, 24, "main", 1, 0],
        [0, -494, 32, 47, "tomb", 0, 1],
      ],
      npcs: [],
      spawns: [
        [0, -21],
        [0, -482],
      ],
    },
    tomb: {
      key: "tomb",
      name: "The Tomb",
      doors: [[0, -69, 33, 58, "mansion", 1, 0]],
      npcs: [],
      spawns: [[1, -54]],
    },
  },
  geometry: {
    main: { min_x: 0, max_x: 800, min_y: 0, max_y: 800, tiles: [], placements: [] },
    mansion: { min_x: -440, max_x: 440, min_y: -688, max_y: 56, tiles: [], placements: [] },
    tomb: { min_x: -500, max_x: 500, min_y: -900, max_y: 300, tiles: [], placements: [] },
  },
};

describe("analyzeWorldLayout", () => {
  it("reports one connected component for the main hub chain", () => {
    const layout = layoutWorld(source, 480);
    const report = analyzeWorldLayout(layout);
    expect(report.mapCount).toBe(3);
    expect(report.placedCount).toBe(3);
    expect(report.components).toHaveLength(1);
    expect(report.components[0].rootId).toBe("mansion");
    expect(report.components[0].maxDepth).toBeGreaterThan(0);
  });

  it("finds no same-layer art overlaps for door-aligned poses", () => {
    const layout = layoutWorld(source, 480);
    const report = analyzeWorldLayout(layout);
    expect(report.artOverlapsSameZ).toBe(0);
    expect(report.exactPoseStacks).toHaveLength(0);
  });

  it("lists maps near the component root", () => {
    const layout = layoutWorld(source, 480);
    const report = analyzeWorldLayout(layout);
    expect(report.nearOriginMaps).toContain("main");
    expect(report.nearOriginMaps).toContain("mansion");
  });

  it("handles empty layouts", () => {
    const empty: WorldLayout = { maps: {}, poses: {}, connections: [] };
    const report = analyzeWorldLayout(empty);
    expect(report.mapCount).toBe(0);
    expect(report.placedCount).toBe(0);
    expect(report.components).toHaveLength(0);
  });
});
