import { GMap, GNpc } from "typed-adventureland";
import { parseMaps } from "./parseMaps";
import { MapSource } from "./types";

function emptyMap(partial: Partial<GMap> & Pick<GMap, "name">): GMap {
  return {
    key: partial.name,
    doors: [],
    npcs: [],
    spawns: [[0, 0]],
    data: { min_x: 0, max_x: 0, min_y: 0, max_y: 0, tiles: [], placements: [] },
    ...partial,
  };
}

const source: MapSource = {
  maps: {
    main: emptyMap({
      name: "Town",
      outside: true,
      spawns: [
        [0, 0],
        [100, 0],
        [200, 0],
        [300, 0],
      ],
      doors: [[0, 10, 32, 40, "bank", 0, 3]],
      npcs: [{ id: "bean", position: [74, -34], boundary: [-100, -100, 100, 100] }],
      monsters: [{ type: "goo", count: 1, roam: true, boundary: [0, 0, 10, 10] }],
    }),
    bank: emptyMap({
      name: "The Bank",
      spawns: [[0, -37]],
      doors: [[0, -8, 40, 20, "main", 3, 0]],
      on_exit: ["main", 3],
    }),
  },
  geometry: {},
};

const npcDefs: Record<string, GNpc> = {
  bean: {
    id: "bean",
    name: "Bean",
    role: "events",
    skin: "lionsuit",
    moving: true,
  },
  transporter: {
    id: "transporter",
    name: "Alia",
    role: "transport",
    skin: "spell",
    places: {
      main: 1,
      winterland: 1,
      desertland: 1,
      test: 0,
      cyberland: 0,
      d_e: 0,
    },
  },
};

describe("parseMaps spawn links and roaming", () => {
  const maps = parseMaps(source, false, npcDefs);

  it("marks spawn 0 as the town skill location", () => {
    expect(maps.main.spawns[0].arrivals).toEqual([{ kind: "town", label: "Town skill location" }]);
  });

  it("records doors, exits, and transporter arrivals on the destination spawn", () => {
    expect(maps.main.spawns[3].arrivals).toEqual(
      expect.arrayContaining([
        { kind: "door", label: "The Bank" },
        { kind: "exit", label: "Exit from The Bank" },
      ]),
    );
    expect(maps.main.spawns[1].arrivals).toEqual(
      expect.arrayContaining([{ kind: "transporter", label: "Alia" }]),
    );
    expect(maps.bank.spawns[0].departures).toEqual([{ kind: "door", label: "Town" }]);
  });

  it("parses npc roam boxes and monster roam flags", () => {
    expect(maps.main.npcs[0]).toMatchObject({
      id: "bean",
      moving: true,
      roam: { x: 0, y: 0, width: 200, height: 200 },
    });
    expect(maps.main.monsters[0].roam).toBe(true);
  });
});

describe("parseMaps random-respawn boundaries", () => {
  const maps = parseMaps(
    {
      maps: {
        main: emptyMap({
          name: "Town",
          outside: true,
          monsters: [
            {
              type: "phoenix",
              count: 1,
              stype: "randomrespawn",
              boundaries: [
                ["main", 0, 0, 10, 20],
                ["main", 100, 0, 140, 40],
                ["cave", -10, -10, 10, 10],
              ],
            },
          ],
        }),
        cave: emptyMap({
          name: "Cave",
          monsters: [],
        }),
      },
      geometry: {},
    },
    false,
    {},
  );

  it("places a pack in each local boundary box", () => {
    const phoenix = maps.main.monsters.filter((monster) => monster.type === "phoenix");
    expect(phoenix).toHaveLength(2);
    expect(phoenix[0]).toMatchObject({ x: 5, y: 10, width: 10, height: 20 });
    expect(phoenix[1]).toMatchObject({ x: 120, y: 20, width: 40, height: 40 });
  });

  it("copies other-map boundary boxes onto those maps", () => {
    expect(maps.cave.monsters).toEqual([
      expect.objectContaining({ type: "phoenix", x: 0, y: 0, width: 20, height: 20 }),
    ]);
  });
});
