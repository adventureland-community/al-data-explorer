import {
  aggregateBankData,
  compareBankItems,
  formatBankItemChange,
  getUniqueItemKey,
  AggregatedBankItem,
} from "../bankItems";

const hpot: AggregatedBankItem = { name: "hpot0", level: 0, q: 10, stack: 1, category: "Potions" };
const sword: AggregatedBankItem = { name: "sword", level: 5, q: 1, stack: 1, category: "Weapons" };
const shield: AggregatedBankItem = {
  name: "shield",
  level: 0,
  q: 1,
  stack: 1,
  category: "Shields",
};

describe("aggregateBankData", () => {
  it("includes custom tab items but excludes them from bank slot counts", () => {
    const aggregated = aggregateBankData({
      items0: [{ name: "hpot0", q: 5 }, null],
      earthMer: [
        { name: "blade", level: 7, q: 1 },
        { name: "hpot0", q: 3 },
      ],
    });

    expect(aggregated.items).toHaveLength(2);
    expect(aggregated.usedSlots).toBe(1);
    expect(aggregated.usedPackSlots).toBe(3);
    expect(aggregated.totalSlots).toBe(42);
    expect(aggregated.items.find((item) => item.name === "blade")?.q).toBe(1);
    expect(aggregated.items.find((item) => item.name === "hpot0")?.q).toBe(8);
  });
});

describe("compareBankItems", () => {
  it("detects added, removed, and changed items", () => {
    const prev = [hpot, sword];
    const next = [{ ...hpot, q: 15, stack: 2 }, shield];

    const summary = compareBankItems(prev, next, {
      prevGold: 100,
      nextGold: 150,
      prevUsedSlots: 2,
      nextUsedSlots: 3,
    });

    expect(summary.hasChanges).toBe(true);
    expect(summary.goldDelta).toBe(50);
    expect(summary.usedSlotsDelta).toBe(1);
    expect(summary.changes).toHaveLength(3);
    expect(summary.changes.find((change) => change.kind === "removed")?.item.name).toBe("sword");
    expect(summary.changes.find((change) => change.kind === "added")?.item.name).toBe("shield");
    expect(summary.changes.find((change) => change.kind === "changed")?.deltaQ).toBe(5);
  });

  it("reports no changes when data matches", () => {
    const items = [hpot];
    const summary = compareBankItems(items, items, {
      prevGold: 100,
      nextGold: 100,
      prevUsedSlots: 1,
      nextUsedSlots: 1,
    });
    expect(summary.hasChanges).toBe(false);
    expect(summary.changes).toHaveLength(0);
  });
});

describe("getUniqueItemKey", () => {
  it("includes title, level, and name", () => {
    expect(getUniqueItemKey({ p: "lucky", level: 7, name: "sword" })).toBe("lucky7sword");
    expect(getUniqueItemKey({ level: 0, name: "hpot0" })).toBe("0hpot0");
  });
});

describe("formatBankItemChange", () => {
  it("formats quantity and stack deltas", () => {
    const text = formatBankItemChange({
      kind: "changed",
      item: { ...hpot, q: 15, stack: 2 },
      deltaQ: 5,
      deltaStack: 1,
    });
    expect(text).toContain("+5 qty");
    expect(text).toContain("+1 stacks");
  });
});
