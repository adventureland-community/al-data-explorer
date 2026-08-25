import { buildDismantlesByIngredient } from "../dismantle";
import { getItemBadges, getItemFacts, itemMatchesClasses } from "../itemMeta";

describe("buildDismantlesByIngredient", () => {
  it("indexes outputs by each dismantle product", () => {
    const map = buildDismantlesByIngredient({
      firestaff: { cost: 40, items: [[1, "essenceoffire"]] },
      fireblade: { cost: 40, items: [[1, "essenceoffire"]] },
      goldenegg: {
        cost: 10,
        items: [
          [3, "egg0"],
          [1, "goldingot"],
        ],
      },
    });

    expect(map.get("essenceoffire" as never)).toStrictEqual(["firestaff", "fireblade"]);
    expect(map.get("egg0" as never)).toStrictEqual(["goldenegg"]);
  });
});

describe("itemMeta", () => {
  it("surfaces exchange / event / exclusive badges", () => {
    const badges = getItemBadges({
      name: "Cupid",
      type: "ring",
      event: true,
      exclusive: true,
      e: 1,
    } as never);
    const labels = badges.map((b) => b.label);
    expect(labels).toStrictEqual(expect.arrayContaining(["Event", "Exclusive", "Exchangeable"]));
  });

  it("builds opens fact with world link when map exists", () => {
    const facts = getItemFacts({ name: "Crypt Key", type: "key", opens: "crypt" } as never, {
      maps: { crypt: { name: "The Crypt" } },
    });
    const opens = facts.find((f) => f.key === "opens");
    expect(opens?.value).toBe("The Crypt");
    expect(opens?.href).toContain("map=crypt");
  });

  it("matches class filter including unrestricted gear", () => {
    expect(itemMatchesClasses({ name: "Staff", type: "weapon" } as never, ["mage"])).toBe(true);
    expect(
      itemMatchesClasses({ name: "Fury", type: "helmet", class: ["rogue"] } as never, ["mage"]),
    ).toBe(false);
    expect(
      itemMatchesClasses({ name: "Fury", type: "helmet", class: ["rogue", "mage"] } as never, [
        "mage",
      ]),
    ).toBe(true);
  });
});
