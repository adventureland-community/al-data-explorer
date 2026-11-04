import { buildGameDataIndexes } from "../indexes";
import {
  getMonsterDetail,
  listMonsterSpawns,
  monsterDetailHref,
  monsterWorldHref,
} from "../monsterCatalog";
import { CustomGData } from "../../GDataContext";

function stubG(partial: Partial<CustomGData>): CustomGData {
  const base = {
    items: {
      leather: { name: "Leather" },
    },
    monsters: {
      wolf: {
        name: "White Wolf",
        skin: "wolf",
        hp: 48000,
        xp: 48800,
        attack: 480,
        damage_type: "physical",
        respawn: 12,
        armor: 300,
        resistance: 200,
        achievements: [[1, "stat", "hp", 20]],
      },
    },
    npcs: {},
    geometry: {
      winterland: { min_x: -100, max_x: 900, min_y: -3000, max_y: -2000, tiles: [] },
    },
    tilesets: {},
    sprites: {},
    images: {},
    dimensions: {},
    drops: {
      maps: {},
      monsters: {
        wolf: [100, [0.001, "leather"]],
      },
      monsters_home_server: {
        wolf: [[0.01, "leather"]],
      },
    },
    base_gold: {
      wolf: { winterland: 1200 },
    },
    maps: {
      winterland: {
        name: "Winterland",
        monsters: [{ type: "wolf", count: 4, boundary: [30, -2954, 836, -2536], grow: true }],
        npcs: [],
        doors: [],
        spawns: [[0, 0]],
      },
    },
    ...partial,
  } as unknown as CustomGData;
  base.indexes = buildGameDataIndexes(base);
  return base;
}

describe("monsterCatalog", () => {
  it("builds monster detail hrefs", () => {
    expect(monsterDetailHref("wolf")).toBe("/monsters/wolf");
    expect(monsterDetailHref("mr green")).toBe("/monsters/mr%20green");
  });

  it("builds world href from first spawn zone", () => {
    expect(
      monsterWorldHref([{ mapKey: "winterland", zones: [{ x: 100, y: -2700 }] as never }]),
    ).toContain("x=100");
    expect(monsterWorldHref([])).toBeNull();
  });

  it("lists spawn zones with pack geometry", () => {
    const G = stubG({});
    const spawns = listMonsterSpawns("wolf", G);
    expect(spawns).toHaveLength(1);
    expect(spawns[0]?.zones[0]).toMatchObject({
      x: (30 + 836) / 2,
      y: (-2954 + -2536) / 2,
      width: 806,
      height: 418,
      count: 4,
      grow: true,
    });
  });

  it("assembles monster detail with spawns, drops, and gold", () => {
    const G = stubG({});
    const detail = getMonsterDetail("wolf", G);
    expect(detail).not.toBeNull();
    expect(detail?.name).toBe("White Wolf");
    expect(detail?.key).toBe("wolf");
    expect(detail?.damageType).toBe("physical");
    expect(detail?.spawns[0]).toMatchObject({ mapKey: "winterland", mapName: "Winterland" });
    expect(detail?.spawns[0]?.zones).toHaveLength(1);
    expect(detail?.drops[0]?.label).toBe("Leather");
    expect(detail?.homeDrops).toHaveLength(1);
    expect(detail?.goldByMap[0]).toMatchObject({ mapKey: "winterland", gold: 1200 });
    expect(detail?.achievements[0]?.reward).toBe("hp 20");
    expect(detail?.dropsSimHref).toBe("/drops?monster=wolf");
    expect(detail?.worldHref).toContain("map=winterland");
    expect(detail?.worldHref).toContain("x=");
  });

  it("returns null for unknown monsters", () => {
    const G = stubG({});
    expect(getMonsterDetail("missing", G)).toBeNull();
  });
});
