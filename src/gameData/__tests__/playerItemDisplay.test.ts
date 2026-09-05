import { abilityBlurb, getItemEffects } from "../itemEffects";
import { buildPlayerStatRows, getItemGrade, gradeLabel } from "../playerItemDisplay";
import { dropSourceSortKey } from "../drops";

describe("itemEffects", () => {
  it("resolves burn with chance summary", () => {
    const effects = getItemEffects(
      {
        type: "weapon",
        ability: "burn",
        attr0: 2,
        upgrade: { attr0: 0.5 },
      } as never,
      0,
    );
    expect(effects[0]?.title).toMatch(/burn/i);
    expect(effects[0]?.summary).toMatch(/2%/);
  });

  it("uses skill names and explanations when provided", () => {
    const effects = getItemEffects({ type: "orb", ability: "scare" } as never, 0, {
      skills: {
        scare: {
          name: "Scare",
          explanation: "Activate your Jack-o Lantern to scare away monsters targeting you!",
        },
      },
    });
    expect(effects[0]?.title).toBe("Scare");
    expect(effects[0]?.detail).toMatch(/Jack-o/);
    expect(effects[0]?.href).toBe("/skills/scare");
  });

  it("formats potion gives as use effects", () => {
    const effects = getItemEffects({ type: "pot", gives: [["hp", 200]] } as never, 0);
    expect(effects[0]?.title).toBe("Use");
    expect(effects[0]?.summary).toMatch(/200 HP/);
  });

  it("includes aura effects from conditions", () => {
    const effects = getItemEffects(
      { type: "source", aura: "sanguine", attr0: 12 } as never,
      0,
      {
        conditions: {
          sanguine: {
            name: "Sanguine",
            explanation: "Nearby allies gain lifesteal.",
            skin: "sanguine",
          },
        },
      },
      "sanguine",
    );
    const aura = effects.find((e) => e.key === "aura-sanguine");
    expect(aura?.kindLabel).toBe("Aura");
    expect(aura?.title).toBe("Sanguine");
    expect(aura?.skin).toBe("sanguine");
  });

  it("resolves fanofknives skill skin", () => {
    const effects = getItemEffects(
      { type: "belt", ability: "fanofknives" } as never,
      0,
      {
        skills: {
          fanofknives: { name: "Fan of Knives", skin: "fanofknives", explanation: "Knives." },
        },
      },
      "knifebelt",
    );
    expect(effects[0]?.skin).toBe("fanofknives");
    expect(effects[0]?.kindLabel).toBe("Ability");
  });

  it("describes burn ability one-liner", () => {
    expect(abilityBlurb("burn", 6)).toMatch(/6%/);
  });
});

describe("playerItemDisplay", () => {
  const firestaff = {
    type: "weapon",
    wtype: "staff",
    name: "Fiery Staff",
    attack: 35,
    range: 56,
    damage_type: "magical",
    ability: "burn",
    attr0: 2,
    tier: 2,
    g: 189000,
    grades: [0, 8, 10, 12],
    upgrade: { attr0: 0.5, range: 3.5, attack: 5.5 },
  } as never;

  it("maps grades like the game", () => {
    expect(getItemGrade(firestaff, 0)).toBe(1);
    expect(getItemGrade(firestaff, 8)).toBe(2);
    expect(gradeLabel(2)).toBe("Rare");
  });

  it("builds player-facing combat stat rows", () => {
    const rows = buildPlayerStatRows(firestaff, 8);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.attack.label).toBe("Damage");
    expect(byKey.damage_type.value).toBe("Magical");
    expect(byKey["ability-burn"]).toBeUndefined();
    expect(byKey.grade).toBeUndefined();
    expect(rows.some((r) => r.key === "g")).toBe(false);
  });
});

describe("dropSourceSortKey", () => {
  it("sorts debug loot tables last", () => {
    expect(dropSourceSortKey("monster", "phoenix")).toBeLessThan(
      dropSourceSortKey("table", "glitch"),
    );
  });
});
