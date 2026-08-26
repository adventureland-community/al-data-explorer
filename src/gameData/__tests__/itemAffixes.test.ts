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

  it("listTitleOptions filters and prefers luck titles first", () => {
    const opts = listTitleOptions(titles, { type: "cape" } as never, "cape");
    expect(opts.map((o) => o.key)).toStrictEqual(["festive", "lucky"]);
  });

  it("listLuckTitleOptions keeps only luck-granting titles", () => {
    const opts = listLuckTitleOptions(titles, { type: "helmet" } as never, "helmet");
    expect(opts.map((o) => o.key)).toStrictEqual(["lucky"]);
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
