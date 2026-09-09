import {
  advancedSearchFormFromQuery,
  parseBankSearchQuery,
  serializeAdvancedSearchForm,
  serializeBankSearchQuery,
  bankItemMatchesQuery,
  EMPTY_BANK_ADVANCED_SEARCH,
  BankSearchableItem,
} from "../bankSearchQuery";

const hpot: BankSearchableItem = {
  name: "hpot0",
  level: 0,
  q: 120,
  stack: 2,
  category: "Potions",
};
const mpot: BankSearchableItem = {
  name: "mpot0",
  level: 0,
  q: 5,
  stack: 1,
  category: "Potions",
};
const sword: BankSearchableItem = {
  name: "sword",
  level: 9,
  q: 1,
  stack: 1,
  category: "Weapons",
  p: "lucky",
};

const G = {
  items: {
    hpot0: { name: "HP Potion", type: "pot" },
    mpot0: { name: "MP Potion", type: "pot" },
    sword: { name: "Sword", type: "weapon", upgrade: {} },
  },
} as unknown as import("typed-adventureland").GData;

describe("parseBankSearchQuery", () => {
  it("treats comma lists as OR alternatives", () => {
    expect(parseBankSearchQuery("hpot, mpot")).toStrictEqual({
      groups: [[{ kind: "text", value: "hpot" }], [{ kind: "text", value: "mpot" }]],
    });
  });

  it("parses OR groups and field operators", () => {
    const query = parseBankSearchQuery("hpot OR mpot type:pot q>=10");
    expect(query.groups).toHaveLength(2);
    expect(query.groups[0]).toStrictEqual([{ kind: "text", value: "hpot" }]);
    expect(query.groups[1]).toStrictEqual([
      { kind: "text", value: "mpot" },
      { kind: "type", value: "pot" },
      { kind: "q", op: ">=", value: 10 },
    ]);
  });

  it("parses exclusions and phrases", () => {
    expect(parseBankSearchQuery('scroll -cscroll "fire staff"')).toStrictEqual({
      groups: [
        [
          { kind: "text", value: "scroll" },
          { kind: "text", value: "cscroll", negated: true },
          { kind: "text", value: "fire staff" },
        ],
      ],
    });
  });

  it("parses is: and grade operators", () => {
    expect(parseBankSearchQuery("is:upgrade grade>=2")).toStrictEqual({
      groups: [
        [
          { kind: "is", value: "upgrade" },
          { kind: "grade", op: ">=", value: 2 },
        ],
      ],
    });
  });
});

describe("serializeBankSearchQuery", () => {
  it("round-trips simple OR queries", () => {
    const raw = "hpot OR mpot type:pot";
    expect(serializeBankSearchQuery(parseBankSearchQuery(raw))).toBe(raw);
  });
});

describe("serializeAdvancedSearchForm", () => {
  it("writes OR for any-words and attaches filters", () => {
    const query = serializeAdvancedSearchForm({
      ...EMPTY_BANK_ADVANCED_SEARCH,
      anyWords: "hpot mpot",
      types: ["pot"],
      minQ: "10",
    });
    expect(query).toBe("hpot type:pot q>=10 OR mpot type:pot q>=10");
  });

  it("expands multi-select types as OR groups", () => {
    expect(
      serializeAdvancedSearchForm({
        ...EMPTY_BANK_ADVANCED_SEARCH,
        types: ["weapon", "shield"],
        titles: ["lucky"],
      }),
    ).toBe("type:weapon title:lucky OR type:shield title:lucky");
  });

  it("writes AND terms from all-words", () => {
    expect(
      serializeAdvancedSearchForm({
        ...EMPTY_BANK_ADVANCED_SEARCH,
        allWords: "fire blade",
        flags: { upgrade: true },
      }),
    ).toBe("fire blade is:upgrade");
  });
});

describe("advancedSearchFormFromQuery", () => {
  it("recovers any-words from OR text groups", () => {
    const form = advancedSearchFormFromQuery(parseBankSearchQuery("hpot, mpot"));
    expect(form.anyWords).toBe("hpot mpot");
  });

  it("recovers multi type selections from OR groups", () => {
    const form = advancedSearchFormFromQuery(
      parseBankSearchQuery("type:weapon title:lucky OR type:shield title:lucky"),
    );
    expect(form.types).toStrictEqual(["weapon", "shield"]);
    expect(form.titles).toStrictEqual(["lucky"]);
  });
});

describe("bankItemMatchesQuery", () => {
  it("matches multi-item OR queries", () => {
    const query = parseBankSearchQuery("hpot, mpot");
    expect(bankItemMatchesQuery(hpot, G, query)).toBe(true);
    expect(bankItemMatchesQuery(mpot, G, query)).toBe(true);
    expect(bankItemMatchesQuery(sword, G, query)).toBe(false);
  });

  it("ANDs operators within a group", () => {
    const query = parseBankSearchQuery("type:pot q>=50");
    expect(bankItemMatchesQuery(hpot, G, query)).toBe(true);
    expect(bankItemMatchesQuery(mpot, G, query)).toBe(false);
  });

  it("ORs repeated field operators within a group", () => {
    const query = parseBankSearchQuery("type:weapon type:pot");
    expect(bankItemMatchesQuery(sword, G, query)).toBe(true);
    expect(bankItemMatchesQuery(hpot, G, query)).toBe(true);
    expect(bankItemMatchesQuery(mpot, G, query)).toBe(true);
  });

  it("supports exclusions and title filters", () => {
    expect(bankItemMatchesQuery(sword, G, parseBankSearchQuery("title:lucky"))).toBe(true);
    expect(bankItemMatchesQuery(sword, G, parseBankSearchQuery("sword -lucky"))).toBe(false);
    expect(bankItemMatchesQuery(hpot, G, parseBankSearchQuery("is:upgrade"))).toBe(false);
    expect(bankItemMatchesQuery(sword, G, parseBankSearchQuery("is:upgrade"))).toBe(true);
  });
});
