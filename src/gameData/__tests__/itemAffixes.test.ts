import type { GItem } from "typed-adventureland";

import {
  titleAppliesToItem,
  listTitleOptions,
  listLuckTitleOptions,
  listStatScrollOptions,
  itemAcceptsStatScroll,
} from "../itemAffixes";

describe("itemAffixes titles", () => {
  const titles = {
    lucky: { type: "all_items", luck: 2, title: "Lucky" },
    festive: { type: "cape", luck: 1, title: "Festive" },
    sniper: { type: "mainhand", attack: 2, title: "Sniper's" },
    stomped: { type: "helmet", for: 1, title: "Stomped" },
    firehazard: { type: "mainhand", critdamage: 4, title: "Hazardous" },
    legacy: { type: "all_items", misc: true, title: "Legacy" },
    cavefound: { type: "all_items", misc: true, stackable: true, title: "Cave" },
    fast: { type: "weapon", misc: true, frequency: 10, title: "Fast" },
  };

  it("lucky applies to any item", () => {
    expect(titleAppliesToItem(titles.lucky, { type: "ring" } as never, "ring1")).toBe(true);
  });

  it("festive applies to cape type / cape slot", () => {
    expect(titleAppliesToItem(titles.festive, { type: "cape" } as never, "cape")).toBe(true);
    expect(titleAppliesToItem(titles.festive, { type: "ring" } as never, "ring1")).toBe(false);
    expect(titleAppliesToItem(titles.festive, undefined, "cape")).toBe(true);
  });

  it("sniper is for weapons (mainhand type), including dual-wield offhand", () => {
    expect(titleAppliesToItem(titles.sniper, { type: "weapon" } as never, "mainhand")).toBe(true);
    expect(titleAppliesToItem(titles.sniper, { type: "weapon" } as never, "offhand")).toBe(true);
    expect(titleAppliesToItem(titles.sniper, { type: "shield" } as never, "offhand")).toBe(false);
  });

  it("listTitleOptions lists natural titles first, luck-preferring within each group", () => {
    const opts = listTitleOptions(titles, { type: "cape" } as never, "cape");
    expect(opts.map((o) => o.key)).toStrictEqual([
      "festive",
      "lucky",
      "cavefound",
      "legacy",
      "firehazard",
      "sniper",
      "stomped",
    ]);
    expect(opts.filter((o) => o.source === "natural").map((o) => o.key)).toStrictEqual([
      "festive",
      "lucky",
      "cavefound",
      "legacy",
    ]);
    expect(opts.find((o) => o.key === "festive")?.source).toBe("natural");
    expect(opts.filter((o) => o.source === "transfer").map((o) => o.key)).toStrictEqual([
      "firehazard",
      "sniper",
      "stomped",
    ]);
  });

  it("slot-only matching still lists all_items naturals before transfers", () => {
    const opts = listTitleOptions(titles, undefined, "ring1");
    expect(opts.filter((o) => o.source === "natural").map((o) => o.key)).toStrictEqual([
      "lucky",
      "cavefound",
      "legacy",
    ]);
    expect(opts.find((o) => o.key === "firehazard")?.source).toBe("transfer");
  });

  it("firehazard is transfer on a ring and natural on a weapon", () => {
    const onRing = listTitleOptions(titles, { type: "ring" } as never, "ring1");
    expect(onRing.find((o) => o.key === "firehazard")).toMatchObject({
      source: "transfer",
      label: "Hazardous",
    });

    const onWeapon = listTitleOptions(titles, { type: "weapon" } as never, "mainhand");
    expect(onWeapon.find((o) => o.key === "firehazard")).toMatchObject({
      source: "natural",
      label: "Hazardous",
    });
  });

  it("misc titles never appear in the transfer group", () => {
    const opts = listTitleOptions(titles, { type: "ring" } as never, "ring1");
    const transferKeys = opts.filter((o) => o.source === "transfer").map((o) => o.key);
    expect(transferKeys).not.toContain("legacy");
    expect(transferKeys).not.toContain("cavefound");
    expect(transferKeys).not.toContain("fast");
    // misc all_items still list as natural when type matches
    expect(opts.find((o) => o.key === "legacy")?.source).toBe("natural");
    expect(opts.find((o) => o.key === "fast")).toBeUndefined();
  });

  it("listLuckTitleOptions keeps luck-granting natural and transfer titles", () => {
    const opts = listLuckTitleOptions(titles, { type: "helmet" } as never, "helmet");
    expect(opts.map((o) => ({ key: o.key, source: o.source }))).toStrictEqual([
      { key: "lucky", source: "natural" },
      { key: "festive", source: "transfer" },
    ]);
  });
});

describe("itemAffixes stat scrolls", () => {
  it("listStatScrollOptions maps pscroll items by .stat", () => {
    const items = {
      strscroll: { type: "pscroll", stat: "str", name: "Strength Scroll" } as GItem,
      luckscroll: { type: "pscroll", stat: "luck", name: "Luck Scroll" } as GItem,
      coat: { type: "chest", name: "Coat" } as GItem,
    };
    const opts = listStatScrollOptions(items);
    expect(opts).toStrictEqual([
      { stat: "luck", itemKey: "luckscroll", name: "Luck Scroll" },
      { stat: "str", itemKey: "strscroll", name: "Strength Scroll" },
    ]);
  });

  it("itemAcceptsStatScroll is true when item has numeric stat points", () => {
    expect(itemAcceptsStatScroll({ type: "cape", stat: 4 } as GItem)).toBe(true);
    expect(itemAcceptsStatScroll({ type: "ring" } as GItem)).toBe(false);
    expect(itemAcceptsStatScroll(undefined)).toBe(false);
  });
});
