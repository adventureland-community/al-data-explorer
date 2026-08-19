import { WorldLayout } from "./types";
import { stubParsedMap } from "./parsedMapStub";
import {
  nextSelectedMap,
  selectedMapForMode,
  SINGLE_MAP_POSE,
  visibleWorldLayout,
} from "./viewerMode";

describe("viewerMode", () => {
  const layout: WorldLayout = {
    maps: {
      main: stubParsedMap("main", { maxX: 100, maxY: 80, artMaxX: 100, artMaxY: 80 }),
      winterland: stubParsedMap("winterland", {
        maxX: 100,
        maxY: 80,
        artMaxX: 100,
        artMaxY: 80,
      }),
    },
    poses: {
      main: { x: 10, y: 20, z: 0 },
      winterland: { x: 400, y: 80, z: 480 },
    },
    connections: [
      {
        fromMap: "main",
        toMap: "winterland",
        fromX: 1,
        fromY: 2,
        toX: 3,
        toY: 4,
        twoWay: true,
      },
    ],
  };

  it("keeps the full layout in world mode", () => {
    expect(visibleWorldLayout(layout, "world", "main")).toBe(layout);
  });

  it("renders one map at the origin in map mode", () => {
    const visible = visibleWorldLayout(layout, "map", "winterland");
    expect(Object.keys(visible.maps)).toEqual(["winterland"]);
    expect(visible.poses.winterland).toEqual(SINGLE_MAP_POSE);
    expect(visible.connections).toEqual([]);
  });

  it("drops an unknown selected map in map mode", () => {
    const visible = visibleWorldLayout(layout, "map", "missing");
    expect(visible.maps).toEqual({});
    expect(visible.poses).toEqual({});
  });

  it("keeps the current map when map mode tries to clear selection", () => {
    expect(nextSelectedMap("map", "main", null)).toBe("main");
    expect(nextSelectedMap("world", "main", null)).toBeNull();
    expect(nextSelectedMap("map", "main", "winterland")).toBe("winterland");
  });

  it("fills map-mode selection when none is valid", () => {
    expect(selectedMapForMode("map", null, layout.maps)).toBe("main");
    expect(selectedMapForMode("map", "missing", layout.maps)).toBe("main");
    expect(selectedMapForMode("world", null, layout.maps)).toBeNull();
    expect(selectedMapForMode("world", "main", layout.maps)).toBe("main");
  });
});
