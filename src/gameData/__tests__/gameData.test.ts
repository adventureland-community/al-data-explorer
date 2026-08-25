import {
  extractDropRates,
  formatDropProbability,
  formatMonsterDropsDisplay,
  getMapDisplayName,
  mergeDropSources,
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

  it("extracts drop rates with open tables", () => {
    const rows = extractDropRates({
      monsters: {
        goo: [[1e-7, "open", "shells", 50]],
      },
    });
    expect(rows[0]?.nestedTable).toBe("shells");
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
