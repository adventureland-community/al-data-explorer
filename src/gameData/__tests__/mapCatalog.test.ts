import { buildGameDataIndexes } from "../indexes";
import { getMapDetail, listMaps, mapDetailHref } from "../mapCatalog";
import { CustomGData } from "../../GDataContext";

function stubG(partial: Partial<CustomGData>): CustomGData {
  const base = {
    items: {},
    monsters: { goo: { name: "Goo" } },
    npcs: {},
    drops: { maps: {}, monsters: {} },
    maps: {
      main: {
        name: "Mainland",
        outside: true,
        monsters: [{ type: "goo", count: 3 }],
        npcs: [{ id: "basics", position: [10, 20] }],
        doors: [[0, 0, 20, 20, "cave", 0]],
        spawns: [
          [0, 0],
          [5, 5],
        ],
      },
      cave: {
        name: "Cave",
        monsters: [],
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

describe("mapCatalog", () => {
  it("builds map detail hrefs", () => {
    expect(mapDetailHref("spookytown")).toBe("/maps/spookytown");
    expect(mapDetailHref("winter inn")).toBe("/maps/winter%20inn");
  });

  it("lists maps by display name", () => {
    const G = stubG({});
    const rows = listMaps(G);
    expect(rows.map((r) => r.key)).toStrictEqual(["cave", "main"]);
    expect(rows[1]?.name).toBe("Mainland");
    expect(rows[1]?.monsterCount).toBe(1);
    expect(rows[1]?.npcCount).toBe(1);
  });

  it("assembles map detail with npcs, monsters, and drops", () => {
    const G = stubG({
      npcs: {
        basics: { id: "basics", name: "Basics", role: "merchant", skin: "basics" },
      } as unknown as CustomGData["npcs"],
      drops: {
        maps: {
          main: [
            [0.0007, "ringsj"],
            [0.0005, "open", "statbelt"],
          ],
        },
        monsters: {},
      },
      items: {
        ringsj: { name: "Ring of Luck", type: "ring" },
      } as unknown as CustomGData["items"],
    });

    const detail = getMapDetail("main", G);
    expect(detail).not.toBeNull();
    expect(detail?.name).toBe("Mainland");
    expect(detail?.worldHref).toContain("map=main");
    expect(detail?.npcs[0]?.name).toBe("Basics");
    expect(detail?.monsters[0]).toMatchObject({ type: "goo", count: 3 });
    expect(detail?.mapDrops).toHaveLength(2);
    expect(detail?.mapDrops[0]?.label).toBe("Ring of Luck");
    expect(detail?.mapDrops[1]?.label).toBe("open → statbelt");
    expect(detail?.outbound.some((e) => e.toMap === "cave")).toBe(true);
  });
});
