import type { ItemKey } from "typed-adventureland";

import {
  parseAmount,
  compareAmount,
  parseAttrSpecs,
  statsMatchAttrSpecs,
  getSearchContextProfile,
  listSearchContextIds,
} from "..";
import { parseBankSearchQuery, bankItemMatchesQuery } from "../../../Bank/bankSearchQuery";
import { parseMarketSearchQuery, marketRowMatchesQuery } from "../../../Market/marketSearchQuery";
import {
  parseItemCatalogQuery,
  itemCatalogMatchesQuery,
} from "../../../Items/itemCatalogSearchQuery";
import { parseMonsterSearchQuery, monsterMatchesQuery } from "../../../Monster/monsterSearchQuery";
import { parseNpcSearchQuery, npcMatchesQuery } from "../../../Npc/npcSearchQuery";
import type { NpcCatalogRow } from "../../../gameData/npcCatalog";

describe("querySearch shared primitives", () => {
  it("parses amounts with suffixes", () => {
    expect(parseAmount(">=1m")).toStrictEqual({ op: ">=", n: 1_000_000 });
    expect(parseAmount("500k")).toStrictEqual({ op: "=", n: 500_000 });
    expect(compareAmount(40, { op: ">=", n: 40 })).toBe(true);
  });

  it("parses attr specs", () => {
    expect(parseAttrSpecs("str>=10,crit")).toStrictEqual([
      { kind: "cmp", key: "str", op: ">=", n: 10 },
      { kind: "any", key: "crit" },
    ]);
    expect(statsMatchAttrSpecs({ str: 12, crit: 0 }, parseAttrSpecs("str>=10"))).toBe(true);
    expect(statsMatchAttrSpecs({ str: 5 }, parseAttrSpecs("str>=10"))).toBe(false);
  });

  it("isolates profiles by surface", () => {
    const ids = listSearchContextIds();
    expect(ids).toStrictEqual(
      expect.arrayContaining(["bank", "market", "catalog", "gear", "luck", "monster", "npc"]),
    );
    expect(getSearchContextProfile("monster").trailingOps).toContain("hp");
    expect(getSearchContextProfile("monster").trailingOps).not.toContain("price");
    expect(getSearchContextProfile("market").trailingOps).toContain("price");
    expect(getSearchContextProfile("market").trailingOps).not.toContain("respawn");
    expect(getSearchContextProfile("catalog").trailingOps).toContain("type");
    expect(getSearchContextProfile("catalog").trailingOps).not.toContain("merchant");
    expect(getSearchContextProfile("npc").trailingOps).toContain("role");
    expect(getSearchContextProfile("npc").trailingOps).toContain("sells");
    expect(getSearchContextProfile("npc").trailingOps).not.toContain("hp");
  });
});

describe("bank attr:", () => {
  const G = {
    items: {
      sword: {
        name: "Sword",
        type: "weapon",
        upgrade: { attack: 5 },
        attack: 20,
        str: 5,
      },
    },
  } as unknown as import("typed-adventureland").GData;

  it("parses and matches attr ranges", () => {
    const query = parseBankSearchQuery("attr:str>=5");
    expect(query.groups[0]?.[0]).toMatchObject({ kind: "attr" });
    expect(
      bankItemMatchesQuery(
        { name: "sword", level: 0, q: 1, stack: 1, category: "Weapons" },
        G,
        query,
      ),
    ).toBe(true);
  });

  it("does not treat price: as a bank field op", () => {
    const query = parseBankSearchQuery("price:>=1m");
    expect(query.groups[0]?.[0]?.kind).toBe("text");
  });
});

describe("market query", () => {
  const row = {
    itemName: "sword" as ItemKey,
    title: "" as const,
    level: 7,
    prices: {
      buying: {
        amount: 0,
        minPrice: { price: 0 },
        maxPrice: { price: 0 },
        avgPrice: 0,
        merchants: {},
      },
      selling: {
        amount: 1,
        minPrice: { price: 2_000_000, merchant: "Bob" },
        maxPrice: { price: 2_000_000 },
        avgPrice: 2_000_000,
        merchants: { Bob: { merchant: { id: "Bob", lastSeen: "" }, items: [] } },
      },
    },
  };

  it("matches price and is:sell", () => {
    expect(
      marketRowMatchesQuery(row, undefined, parseMarketSearchQuery("price:>=1m is:sell")),
    ).toBe(true);
    expect(marketRowMatchesQuery(row, undefined, parseMarketSearchQuery("is:buy"))).toBe(false);
  });
});

describe("item catalog query", () => {
  const gItem = {
    name: "Fire Staff",
    type: "weapon",
    wtype: "staff",
    tier: 3,
    upgrade: { attack: 5 },
    attack: 20,
    int: 10,
  } as unknown as import("typed-adventureland").GItem;

  it("matches type and attr", () => {
    expect(
      itemCatalogMatchesQuery(
        "firestaff" as ItemKey,
        gItem,
        undefined,
        parseItemCatalogQuery("type:weapon attr:int>=5"),
      ),
    ).toBe(true);
  });

  it("browse attr: matches if any upgrade level qualifies", () => {
    // +0 attack ≈ 20; needs several upgrades to reach 50
    expect(
      itemCatalogMatchesQuery(
        "firestaff" as ItemKey,
        gItem,
        undefined,
        parseItemCatalogQuery("attr:attack>=50"),
      ),
    ).toBe(true);
    expect(
      itemCatalogMatchesQuery(
        "firestaff" as ItemKey,
        gItem,
        undefined,
        parseItemCatalogQuery("attr:attack>=50"),
        { level: 0 },
      ),
    ).toBe(false);
  });

  it("browse level: narrows which levels attr: may use", () => {
    expect(
      itemCatalogMatchesQuery(
        "firestaff" as ItemKey,
        gItem,
        undefined,
        parseItemCatalogQuery("attr:attack>=50 level:<=2"),
      ),
    ).toBe(false);
    expect(
      itemCatalogMatchesQuery(
        "firestaff" as ItemKey,
        gItem,
        undefined,
        parseItemCatalogQuery("attr:attack>=50 level:>=9"),
      ),
    ).toBe(true);
  });

  it("ignores foreign price: as meaningful field", () => {
    const q = parseItemCatalogQuery("price:>=1m");
    expect(q.groups[0]?.[0]?.kind).toBe("text");
  });
});

describe("monster query", () => {
  const goo = {
    name: "Goo",
    hp: 100,
    respawn: 5,
    xp: 10,
    attack: 5,
    drops: "leather,helmet",
    spawns: ["main"],
    achievements: [],
  } as unknown as import("typed-adventureland").GMonster & {
    drops: string;
    spawns: string[];
    achievements: unknown[];
  };

  it("matches hp and drop", () => {
    expect(
      monsterMatchesQuery("goo" as never, goo, parseMonsterSearchQuery("hp:>=50 drop:leather")),
    ).toBe(true);
    expect(monsterMatchesQuery("goo" as never, goo, parseMonsterSearchQuery("hp:>=50000"))).toBe(
      false,
    );
  });

  it("does not parse type:weapon as monster field", () => {
    const q = parseMonsterSearchQuery("type:weapon");
    expect(q.groups[0]?.[0]?.kind).toBe("text");
  });
});

describe("npc query", () => {
  const merchant: NpcCatalogRow = {
    id: "fancypots",
    name: "Ernis",
    role: "merchant",
    skin: "fancypots",
    maps: [{ mapKey: "main", mapName: "Mainland", posX: 0, posY: 0 }],
    shopItemCount: 2,
    shopItemKeys: ["hpot0", "elixirluck"] as NpcCatalogRow["shopItemKeys"],
    token: null,
    quest: null,
    moving: false,
    ignored: false,
  };

  it("matches role and sells", () => {
    expect(npcMatchesQuery(merchant, parseNpcSearchQuery("role:merchant sells:hpot0"))).toBe(true);
    expect(npcMatchesQuery(merchant, parseNpcSearchQuery("role:transporter"))).toBe(false);
    expect(npcMatchesQuery(merchant, parseNpcSearchQuery("map:main is:shop"))).toBe(true);
  });

  it("parses type: as role alias", () => {
    const q = parseNpcSearchQuery("type:merchant");
    expect(q.groups[0]?.[0]?.kind).toBe("role");
  });
});
