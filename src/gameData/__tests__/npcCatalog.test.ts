import { buildGameDataIndexes } from "../indexes";
import {
  filterNpcCatalog,
  getNpcDetail,
  listNpcCatalog,
  npcHref,
  npcWorldHref,
} from "../npcCatalog";
import type { CustomGData } from "../../GDataContext";

function fakeG(): CustomGData {
  const G = {
    items: {
      elixirluck: { name: "Elixir of Luck", g: 24000 },
      hpot0: { name: "HP Potion", g: 20 },
    },
    npcs: {
      fancypots: {
        id: "fancypots",
        name: "Ernis",
        role: "merchant",
        skin: "fancypots",
        items: ["elixirluck", "hpot0"],
      },
      ignoredguy: {
        id: "ignoredguy",
        name: "Nope",
        role: "tease",
        skin: "x",
        ignore: true,
        items: [],
      },
    },
    maps: {
      main: {
        name: "Mainland",
        npcs: [{ id: "fancypots", position: [40, -100] }],
      },
    },
    geometry: {},
    tilesets: {},
  } as unknown as CustomGData;
  G.indexes = buildGameDataIndexes(G);
  return G;
}

describe("npcCatalog", () => {
  it("lists and filters NPCs", () => {
    const G = fakeG();
    const all = listNpcCatalog(G);
    expect(all.some((r) => r.id === "fancypots")).toBe(true);
    expect(filterNpcCatalog(all, {}).map((r) => r.id)).toStrictEqual(["fancypots"]);
    expect(filterNpcCatalog(all, { search: "ernis" })[0]?.id).toBe("fancypots");
    expect(filterNpcCatalog(all, { roles: ["merchant"] })).toHaveLength(1);
    expect(filterNpcCatalog(all, { mapKeys: ["main"] })).toHaveLength(1);
  });

  it("builds detail with shop + world href", () => {
    const G = fakeG();
    const detail = getNpcDetail("fancypots", G);
    expect(detail?.name).toBe("Ernis");
    expect(detail?.shopItems.map((i) => i.itemKey)).toStrictEqual(["elixirluck", "hpot0"]);
    expect(detail?.maps[0]?.mapKey).toBe("main");
    expect(detail?.worldHref).toContain("map=main");
    expect(npcHref("fancypots")).toBe("/npcs/fancypots");
    expect(npcWorldHref(detail!.maps)).toContain("x=40");
  });
});
