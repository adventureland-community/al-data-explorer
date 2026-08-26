import { buildEntityTooltipModel } from "../entityTooltip";

describe("buildEntityTooltipModel", () => {
  const G = {
    items: {
      firestaff: {
        name: "Fire Staff",
        type: "weapon",
        damage_type: "magical",
        attack: 35,
        ability: "burn",
        attr0: 2,
        g: 100,
      },
    },
    monsters: {
      goo: {
        name: "Goo",
        hp: 100,
        attack: 5,
        damage_type: "physical",
        xp: 100,
        skin: "goo",
      },
    },
    npcs: {
      basics: {
        name: "Gabriel",
        role: "merchant",
        says: "Blades, blades, blades",
        items: ["blade", "staff"],
        skin: "daggers",
      },
    },
    skills: {},
    conditions: {},
    sets: {},
  } as never;

  it("builds item tooltips", () => {
    const model = buildEntityTooltipModel({ kind: "item", key: "firestaff", level: 0 }, G);
    expect(model?.displayName).toBe("Fire Staff");
    expect(model?.lines.some((l) => l.kind === "stat" && l.label === "Damage")).toBe(true);
  });

  it("applies title and stat scroll on item tooltips and JSON", () => {
    const G2 = {
      items: {
        partyhat: {
          name: "Party Hat",
          type: "helmet",
          stat: 1,
          armor: 5,
          resistance: 6,
          g: 12000,
        },
      },
      titles: {
        lucky: { type: "all_items", luck: 2, title: "Lucky" },
      },
      skills: {},
      conditions: {},
      sets: {},
    } as never;
    const model = buildEntityTooltipModel(
      { kind: "item", key: "partyhat", level: 0, title: "lucky", statType: "vit" },
      G2,
    );
    expect(model).not.toBeNull();
    const json = model!.json as { itemInfo: { p?: string; stat_type?: string } };
    expect(json.itemInfo.p).toBe("lucky");
    expect(json.itemInfo.stat_type).toBe("vit");
    expect(model!.badges).toStrictEqual(expect.arrayContaining(["lucky", "vit"]));
    expect(model!.lines.some((l) => l.kind === "stat" && l.label === "Luck")).toBe(true);
    expect(model!.lines.some((l) => l.kind === "stat" && l.label === "Vitality")).toBe(true);
    expect(model!.lines.some((l) => l.kind === "stat" && l.label === "Stat")).toBe(false);
  });

  it("builds monster tooltips", () => {
    const model = buildEntityTooltipModel({ kind: "monster", key: "goo" }, G);
    expect(model?.displayName).toBe("Goo");
    expect(model?.lines.some((l) => l.kind === "stat" && l.label === "HP")).toBe(true);
  });

  it("builds npc tooltips", () => {
    const model = buildEntityTooltipModel({ kind: "npc", key: "basics" }, G);
    expect(model?.displayName).toBe("Gabriel");
    expect(model?.lines.some((l) => l.kind === "stat" && l.label === "Role")).toBe(true);
  });
});
