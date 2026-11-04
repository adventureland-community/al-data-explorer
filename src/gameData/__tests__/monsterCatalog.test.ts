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
    expect(detail?.stats.some((row) => row.key === "hp" && row.value === "48,000")).toBe(true);
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

  it("surfaces abilities, slots, child spawns, and flags from monster JSON", () => {
    const G = stubG({
      monsters: {
        wolf: {
          name: "White Wolf",
          skin: "wolf",
          hp: 100,
          xp: 10,
          attack: 5,
          damage_type: "physical",
          poisonous: true,
          abilities: { weakness_aura: { aura: true, condition: "weakness", radius: 100 } },
          slots: { mainhand: { name: "leather", level: 2 } },
          spawns: [[1000, "goo"]],
          cbuff: [[60, "halloween0"]],
          s: { fullguardx: { ms: 300000 } },
          explanation: "Test wolf",
          mystery_field: "keep me",
        },
        goo: { name: "Goo", skin: "goo", hp: 1, xp: 1, attack: 1 },
      } as unknown as CustomGData["monsters"],
      maps: {
        winterland: {
          name: "Winterland",
          monsters: [{ type: "wolf", count: 1, boundary: [0, 0, 10, 10] }],
          npcs: [],
          doors: [],
          spawns: [[0, 0]],
        },
      } as unknown as CustomGData["maps"],
    });
    const detail = getMonsterDetail("wolf", G);
    expect(detail?.flags).toContain("Poisonous");
    expect(detail?.explanation).toBe("Test wolf");
    expect(detail?.abilities[0]?.key).toBe("weakness_aura");
    expect(detail?.slots[0]).toMatchObject({ slot: "mainhand", itemKey: "leather", level: 2 });
    expect(detail?.childSpawns[0]).toMatchObject({ monsterKey: "goo", interval: 1000 });
    expect(detail?.cbuffs[0]).toMatchObject({ chance: 60, condition: "halloween0" });
    expect(detail?.statuses[0]?.key).toBe("fullguardx");
    expect(
      detail?.other.some((row) => row.key === "mystery_field" && row.value === "keep me"),
    ).toBe(true);
  });

  it("returns null for unknown monsters", () => {
    const G = stubG({});
    expect(getMonsterDetail("missing", G)).toBeNull();
  });
});
