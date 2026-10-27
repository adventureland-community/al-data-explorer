import {
  extractDropRates,
  formatDropProbability,
  formatHomeServerDropsDisplay,
  formatMonsterDropsDisplay,
  formatMonsterDropsWithHome,
  getMapDisplayName,
  getMonsterDropDisplayParts,
  mergeDropSources,
  parseHomeServerDropTable,
  parseMonsterDropTable,
} from "../drops";
import { getSetBonusTiers } from "../itemSets";
import { itemMatchesSearch, matchesItemSearch } from "../itemFilters";
import { getRelatedItemGroups } from "../related-items";

describe("drops", () => {
  it("parses monster drop table tuples", () => {
    const parsed = parseMonsterDropTable("goo", [100, [0.5, "leather"], "gold"]);
    expect(parsed).toStrictEqual([
      {
        sourceType: "monster",
        sourceKey: "goo",
        itemKey: "leather",
        probability: 0.5,
        quantity: null,
        title: "",
        nestedTable: "",
      },
      {
        sourceType: "monster",
        sourceKey: "goo",
        itemKey: "gold",
        probability: null,
        quantity: null,
        title: "",
        nestedTable: "",
      },
    ]);
  });

  it("formats monster drops via the shared parser", () => {
    expect(formatMonsterDropsDisplay([100, [0.5, "leather"], "gold"])).toBe(
      "leather (50.00%), gold",
    );
  });

  it("parses home-server tables without skipping the first entry", () => {
    const parsed = parseHomeServerDropTable("mrgreen", [
      [0.01, "fallen"],
      [1, "candy0", 7],
    ]);
    expect(parsed).toStrictEqual([
      {
        sourceType: "monster_home",
        sourceKey: "mrgreen",
        itemKey: "fallen",
        probability: 0.01,
        quantity: null,
        title: "",
        nestedTable: "",
      },
      {
        sourceType: "monster_home",
        sourceKey: "mrgreen",
        itemKey: "candy0",
        probability: 1,
        quantity: 7,
        title: "",
        nestedTable: "",
      },
    ]);
    expect(formatHomeServerDropsDisplay([[0.01, "fallen"], [1, "candy0", 7]])).toBe(
      "fallen (1.00%), candy0 (1 / 1)",
    );
  });

  it("splits home-server bonus drops for monster browse formatting", () => {
    const parts = getMonsterDropDisplayParts("mrgreen", {
      monsters: { mrgreen: [100, [0.001, "base"]] },
      monsters_home_server: { mrgreen: [[0.01, "fallen"]] },
    });
    expect(parts.regular).toBe("base (0.1000%)");
    expect(parts.home).toBe("fallen (1.00%)");
    expect(parts.searchText).toBe("base (0.1000%); homeserver fallen (1.00%)");
    expect(
      formatMonsterDropsWithHome("mrgreen", {
        monsters: { mrgreen: [100, [0.001, "base"]] },
        monsters_home_server: { mrgreen: [[0.01, "fallen"]] },
      }),
    ).toBe(parts.searchText);
  });

  it("includes monsters_home_server rows in acquisition extraction", () => {
    const rows = extractDropRates({
      monsters: { mrgreen: [[0.001, "base"]] },
      monsters_home_server: { mrgreen: [[0.01, "fallen"], [1, "candy0", 7]] },
    });
    const home = rows.filter((r) => r.sourceType === "monster_home");
    expect(home).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "monster_home",
          sourceKey: "mrgreen",
          itemKey: "fallen",
          probability: 0.01,
        }),
        expect.objectContaining({
          sourceType: "monster_home",
          sourceKey: "mrgreen",
          itemKey: "candy0",
          probability: 1,
          quantity: 7,
        }),
      ]),
    );
  });

  it("formats tiny probabilities as 1-in-N", () => {
    expect(formatDropProbability(0.000001)).toBe("1 in 1,000,000");
    expect(formatDropProbability(1e-7)).toBe("1 in 10,000,000");
  });

  it("formats guaranteed rolls like the game (≥1 → N / 1)", () => {
    expect(formatDropProbability(50)).toBe("50 / 1");
    expect(formatDropProbability(1)).toBe("1 / 1");
  });

  it("prefers human map names", () => {
    expect(getMapDisplayName("main", { main: { name: "Mainland" } })).toBe("Mainland");
    expect(getMapDisplayName("main")).toBe("main");
  });

  it("merges repeated rolls from the same monster", () => {
    const merged = mergeDropSources([
      {
        sourceType: "monster",
        sourceKey: "dragold",
        itemKey: "essenceoffire",
        probability: 50,
        quantity: null,
        title: "",
        nestedTable: "",
      },
      {
        sourceType: "monster",
        sourceKey: "dragold",
        itemKey: "essenceoffire",
        probability: 40,
        quantity: null,
        title: "",
        nestedTable: "",
      },
      {
        sourceType: "monster",
        sourceKey: "fireroamer",
        itemKey: "essenceoffire",
        probability: 0.015625,
        quantity: null,
        title: "",
        nestedTable: "",
      },
    ]);
    expect(merged).toHaveLength(2);
    const dragold = merged.find((d) => d.sourceKey === "dragold");
    expect(dragold?.oddsLabel).toBe("90 / 1");
  });

  it("extracts drop rates with open tables expanded to absolute odds", () => {
    const rows = extractDropRates({
      monsters: {
        goo: [[0.5, "open", "shells"]],
      },
      shells: [
        [1, "seashell"],
        [1, "helmet"],
      ],
    });
    const fromMonster = rows.find((r) => r.itemKey === "seashell" && r.sourceType === "monster");
    expect(fromMonster).toMatchObject({
      sourceType: "monster",
      sourceKey: "goo",
      probability: 0.25,
    });
    // Nested table still listed (within-table weight) so UI can explain auto-open.
    const fromTable = rows.find((r) => r.itemKey === "seashell" && r.sourceType === "table");
    expect(fromTable).toMatchObject({
      sourceType: "table",
      sourceKey: "shells",
      probability: 0.5,
    });
  });

  it("keeps open loot tables like statbelt alongside expanded map odds", () => {
    const rows = extractDropRates({
      maps: {
        spookytown: [[0.0007, "open", "statbelt"]],
      },
      statbelt: [
        [1, "intbelt"],
        [1, "strbelt"],
        [1, "dexbelt"],
      ],
    });
    const dexbelt = rows.filter((r) => r.itemKey === "dexbelt");
    expect(dexbelt).toHaveLength(2);
    expect(dexbelt.find((r) => r.sourceType === "map")).toMatchObject({
      sourceKey: "spookytown",
      probability: 0.0007 / 3,
    });
    expect(dexbelt.find((r) => r.sourceType === "table")).toMatchObject({
      sourceKey: "statbelt",
      probability: 1 / 3,
    });
  });

  it("normalizes weighted exchange/glitch table odds by table total", () => {
    // Grounded in server_functions.js: Math.random() * total, then walk weights.
    const rows = extractDropRates({
      glitch: [
        [0.1, "rare"],
        [1, "common"],
        [5, "glitch", 2],
      ],
    });
    const total = 0.1 + 1 + 5;
    const common = rows.find((r) => r.itemKey === "common" && r.sourceKey === "glitch");
    const rare = rows.find((r) => r.itemKey === "rare" && r.sourceKey === "glitch");
    expect(common?.probability).toBeCloseTo(1 / total, 10);
    expect(rare?.probability).toBeCloseTo(0.1 / total, 10);
    expect(formatDropProbability(common?.probability)).not.toBe("1 / 1");
  });

  it("maps official G.drops `cx` shorthand to cxjar with cosmetic title", () => {
    // Server drop_item_logic: name=="cx" → name="cxjar", data = cosmetic id.
    const rows = extractDropRates({
      cosmo0: [
        [0.5, "cx", "marmor10a"],
        [1, "cxjar", 1, "breyes"],
      ],
    });
    const fromCx = rows.find((r) => r.title === "marmor10a");
    expect(fromCx).toMatchObject({
      itemKey: "cxjar",
      sourceType: "table",
      sourceKey: "cosmo0",
      title: "marmor10a",
    });
    expect(rows.every((r) => r.itemKey !== "cx")).toBe(true);
    expect(rows.filter((r) => r.itemKey === "cxjar")).toHaveLength(2);
  });
});

describe("itemSets", () => {
  it("lists non-empty set bonus tiers", () => {
    const tiers = getSetBonusTiers({
      name: "Swift Judgement",
      items: ["wingedboots", "fierygloves"],
      1: {},
      2: { dex: 1 },
    } as import("typed-adventureland").GSet);
    expect(tiers).toStrictEqual([
      { count: 2, label: "2", stats: [{ key: "dex", label: "Dexterity", value: "1" }] },
    ]);
  });
});

describe("itemFilters", () => {
  it("matches set bonus attribute names when matchAttributes + sets", () => {
    const match = itemMatchesSearch(
      "ring1",
      { name: "Ring", type: "ring", set: "wt4" } as unknown as import("typed-adventureland").GItem,
      "dex",
      { matchAttributes: true, sets: { wt4: { "2": { dex: 10 } } } },
    );
    expect(match).toBe(true);
  });

  it("does not match attrs without matchAttributes", () => {
    const match = itemMatchesSearch(
      "ring1",
      {
        name: "Ring",
        type: "ring",
        upgrade: { dex: 1 },
      } as unknown as import("typed-adventureland").GItem,
      "dex",
      { matchAttributes: false },
    );
    expect(match).toBe(false);
  });

  it("matches type and wtype", () => {
    const staff = {
      name: "Fiery Staff",
      type: "weapon",
      wtype: "staff",
    } as unknown as import("typed-adventureland").GItem;
    expect(itemMatchesSearch("firestaff", staff, "staff")).toBe(true);
    expect(itemMatchesSearch("firestaff", staff, "weapon")).toBe(true);
    expect(itemMatchesSearch("firestaff", staff, "bow")).toBe(false);
    expect(matchesItemSearch("firestaff", staff, "staff")).toBe(true);
  });
});

describe("related-items", () => {
  it("includes numbered craft-tier siblings without craft recipes", () => {
    const groups = getRelatedItemGroups("ingot1", {
      items: {
        ingot1: { type: "material" },
        ingot2: { type: "material" },
        nugget1: { type: "material" },
      },
    });
    expect(groups.some((g) => g.id.startsWith("series:"))).toBe(true);
    expect(groups.some((g) => g.id.startsWith("craft:"))).toBe(false);
  });
});
