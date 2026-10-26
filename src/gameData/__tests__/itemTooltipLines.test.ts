import { buildItemTooltipLines } from "../itemTooltipLines";

describe("buildItemTooltipLines", () => {
  const G = {
    skills: {
      scare: { name: "Scare", explanation: "Scare away targeting monsters." },
    },
    conditions: {
      sanguine: { name: "Sanguine" },
    },
    sets: {
      fiery: { name: "Fiery Set" },
    },
    items: {},
  } as never;

  it("renders burn ability like the game client", () => {
    const lines = buildItemTooltipLines(
      {
        name: "Fire Staff",
        type: "weapon",
        damage_type: "magical",
        attack: 35,
        ability: "burn",
        attr0: 2,
        upgrade: { attr0: 0.5, attack: 5 },
        grades: [0, 8, 10, 12],
        g: 1000,
      } as never,
      { name: "firestaff", level: 0 },
      G,
    );

    const ability = lines.find((l) => l.kind === "stat" && l.label === "Ability");
    expect(ability).toMatchObject({ kind: "stat", value: "Burn" });
    expect(lines.some((l) => l.kind === "text" && /burn/i.test(l.text))).toBe(true);
    expect(lines.some((l) => l.kind === "stat" && l.label === "Damage")).toBe(true);
    expect(
      lines.some((l) => l.kind === "stat" && l.label === "Type" && l.value === "Magical"),
    ).toBe(true);
  });

  it("includes set, class, and NPC value", () => {
    const lines = buildItemTooltipLines(
      {
        name: "Silk Grips",
        type: "gloves",
        class: ["mage", "priest"],
        set: "fiery",
        armor: 12,
        g: 64000,
        explanation: "Spider silk fits like a second skin.",
      } as never,
      { name: "silkgrips" as never, level: 0 },
      G,
    );

    expect(lines.some((l) => l.kind === "stat" && l.label === "Class")).toBe(true);
    expect(
      lines.some((l) => l.kind === "stat" && l.label === "Set" && l.value === "Fiery Set"),
    ).toBe(true);
    expect(lines.some((l) => l.kind === "stat" && l.label === "NPC value")).toBe(true);
    expect(lines.some((l) => l.kind === "text" && /Spider silk/.test(l.text))).toBe(true);
  });

  it("includes class-only context bonus boxes", () => {
    const lines = buildItemTooltipLines(
      {
        name: "Helmet of the Tiger",
        type: "helmet",
        armor: 10,
        rogue: { crit: 2, upgrade: { crit: 0.25 } },
        g: 100,
      } as never,
      { name: "tigerhelmet" as never, level: 0 },
      {
        skills: {},
        conditions: {},
        sets: {},
        items: {},
        maps: {},
        classes: {},
      } as never,
    );

    const context = lines.filter((l) => l.kind === "context_bonus");
    expect(context).toHaveLength(1);
    expect(context[0]).toMatchObject({
      kind: "context_bonus",
      headers: [{ label: "Rogue" }],
      bonuses: [{ label: "Crit", value: "+2%" }],
    });
  });

  it("includes class slot modifier boxes for dagger wtype", () => {
    const lines = buildItemTooltipLines(
      {
        name: "Dagger",
        type: "weapon",
        wtype: "dagger",
        attack: 12,
        g: 100,
      } as never,
      { name: "dagger" as never, level: 0 },
      {
        skills: {},
        conditions: {},
        sets: {},
        items: {},
        classes: {
          rogue: { mainhand: { dagger: {} }, offhand: { dagger: {} }, doublehand: {} },
          ranger: { mainhand: {}, offhand: {}, doublehand: { dagger: {} } },
          merchant: { mainhand: { dagger: { speed: -3 } }, offhand: {}, doublehand: {} },
          warrior: { mainhand: {}, offhand: {}, doublehand: {} },
          paladin: { mainhand: {}, offhand: {}, doublehand: {} },
          mage: { mainhand: {}, offhand: {}, doublehand: {} },
          priest: { mainhand: {}, offhand: {}, doublehand: {} },
        },
      } as never,
    );

    const slots = lines.filter((l) => l.kind === "class_slot");
    expect(slots).toHaveLength(4);
    expect(slots.some((l) => l.kind === "class_slot" && l.classKey === "merchant")).toBe(true);
    const merchant = slots.find((l) => l.kind === "class_slot" && l.classKey === "merchant");
    expect(merchant).toMatchObject({
      kind: "class_slot",
      slotLabel: "Mainhand",
      bonuses: [{ label: "Speed", value: "-3" }],
    });
  });

  it("shows cxjar sealed cosmetic from ItemInfo.data", () => {
    const lines = buildItemTooltipLines(
      {
        name: "CX Jar",
        type: "jar",
        explanation: "An appearance liquified and stored inside a jar.",
        s: 9999,
        g: 1,
      } as never,
      { name: "cxjar" as never, data: "breyes" } as never,
      {
        skills: {},
        conditions: {},
        sets: {},
        items: {},
        cosmetics: { map: { breyes: true } },
        positions: {},
      } as never,
    );

    expect(
      lines.some((l) => l.kind === "stat" && l.label === "Contains" && l.value === "breyes"),
    ).toBe(true);
  });

  it("includes luck from festive title on item instance", () => {
    const lines = buildItemTooltipLines(
      {
        name: "Fiery Cape",
        type: "cape",
        armor: 10,
        resistance: 8,
        stat: 6,
        upgrade: { armor: 2, resistance: 2, stat: 0.1 },
        g: 16000000,
      } as never,
      { name: "fcape" as never, level: 0, p: "festive" as never },
      {
        skills: {},
        conditions: {},
        sets: {},
        items: {},
        titles: { festive: { type: "cape", title: "Festive", luck: 1 } },
      } as never,
    );

    expect(lines.some((l) => l.kind === "stat" && l.label === "Luck" && l.value === "+1%")).toBe(
      true,
    );
  });
});
