import { ParsedMap } from "./types";

export function stubParsedMap(id: string, extra: Partial<Omit<ParsedMap, "id">> = {}): ParsedMap {
  return {
    name: id,
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
    machines: [],
    animatables: [],
    traps: [],
    exitsToOverworld: false,
    ...extra,
    id,
  };
}
