import { parseCsvParam, parseNumberCsvParam } from "../useItemsUrlParams";
import { queryItems, sortItemKeysByTier } from "../../gameData/itemFilters";

describe("useItemsUrlParams", () => {
  it("parses multi-value csv filter params", () => {
    expect(parseCsvParam("weapon,amulet")).toStrictEqual(["weapon", "amulet"]);
    expect(parseCsvParam("weapon, weapon")).toStrictEqual(["weapon"]);
    expect(parseNumberCsvParam("1,2.5,2.5")).toStrictEqual([1, 2.5]);
  });
});

describe("queryItems", () => {
  const items = {
    staff: { name: "Staff", type: "weapon", wtype: "staff", tier: 1 },
    bow: { name: "Bow", type: "weapon", wtype: "bow", tier: 1 },
    ring: { name: "Ring", type: "ring", tier: 2 },
    fury: { name: "Fury", type: "helmet", tier: 3, class: ["rogue", "warrior"] },
  } as unknown as import("../../GDataContext").GItems;

  it("matches facets and type/wtype in search without attrs", () => {
    const filtered = queryItems(items, {
      types: ["weapon", "ring"],
      wtypes: ["staff"],
      tiers: [1],
      matchAttributes: false,
    });
    expect(filtered.map(([k]) => k)).toStrictEqual(["staff"]);
  });

  it("matches wtype via search text", () => {
    const filtered = queryItems(items, { search: "staff", sort: "name" });
    expect(filtered.map(([k]) => k)).toStrictEqual(["staff"]);
  });

  it("keeps unrestricted items when filtering by class", () => {
    const filtered = queryItems(items, { classes: ["mage"], sort: "name" });
    expect(filtered.map(([k]) => k)).toStrictEqual(["bow", "ring", "staff"]);
  });

  it("includes class-restricted items that match", () => {
    const filtered = queryItems(items, { classes: ["rogue"], sort: "name" });
    expect(filtered.map(([k]) => k)).toContain("fury");
  });
});

describe("sortItemKeysByTier", () => {
  it("orders by tier then name", () => {
    const items = {
      thistle: { name: "Thistle Quiver", tier: 1.5 },
      alloy: { name: "Alloy Quiver", tier: 2 },
      quiver: { name: "Quiver", tier: 1 },
      storm: { name: "Storm Quiver", tier: 2.25 },
    } as unknown as import("../../GDataContext").GItems;

    expect(
      sortItemKeysByTier(["storm", "thistle", "alloy", "quiver"] as never[], items),
    ).toStrictEqual(["quiver", "thistle", "alloy", "storm"]);
  });
});
