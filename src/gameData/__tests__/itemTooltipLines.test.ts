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
