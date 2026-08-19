import { findShortestPath } from "./pathFinder";
import { DoorConnection } from "./types";

function conn(from: string, to: string, twoWay = true): DoorConnection {
  return { fromMap: from, toMap: to, fromX: 0, fromY: 0, toX: 0, toY: 0, twoWay };
}

describe("findShortestPath", () => {
  it("returns single-element path for same source and target", () => {
    expect(findShortestPath("a", "a", [])).toEqual(["a"]);
  });

  it("finds a direct two-way connection", () => {
    const connections = [conn("a", "b")];
    expect(findShortestPath("a", "b", connections)).toEqual(["a", "b"]);
    expect(findShortestPath("b", "a", connections)).toEqual(["b", "a"]);
  });

  it("finds shortest path across multiple hops", () => {
    const connections = [conn("a", "b"), conn("b", "c"), conn("c", "d"), conn("a", "d", false)];
    // a→d is one-way so a→d is 1 hop, but b→d needs b→c→d or b→a→d
    expect(findShortestPath("a", "d", connections)).toEqual(["a", "d"]);
    expect(findShortestPath("a", "c", connections)).toEqual(["a", "b", "c"]);
  });

  it("returns null when unreachable", () => {
    const connections = [conn("a", "b"), conn("c", "d")];
    expect(findShortestPath("a", "d", connections)).toBeNull();
  });

  it("respects one-way connections", () => {
    const connections = [conn("a", "b", false), conn("b", "c", false)];
    expect(findShortestPath("a", "c", connections)).toEqual(["a", "b", "c"]);
    expect(findShortestPath("c", "a", connections)).toBeNull();
  });

  it("returns null when source has no connections", () => {
    const connections = [conn("x", "y")];
    expect(findShortestPath("z", "x", connections)).toBeNull();
  });

  it("picks the shorter of two possible paths", () => {
    const connections = [conn("a", "b"), conn("b", "c"), conn("c", "d"), conn("a", "c")];
    const path = findShortestPath("a", "d", connections);
    expect(path).toEqual(["a", "c", "d"]);
  });
});
