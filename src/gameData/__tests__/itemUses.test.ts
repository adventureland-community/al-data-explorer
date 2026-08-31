import { ItemKey } from "typed-adventureland";

import { getItemUses } from "../itemUses";
import { buildGameDataIndexes } from "../indexes";
import { CustomGData } from "../../GDataContext";

function stubG(partial: Partial<CustomGData> & { items: CustomGData["items"] }): CustomGData {
  const base = {
    ...partial,
    monsters: partial.monsters ?? { goo: { name: "Goo" } },
    maps: partial.maps ?? { main: { name: "Mainland" } },
    npcs: partial.npcs ?? {},
    drops: partial.drops ?? { monsters: {} },
    craft: partial.craft ?? {},
    tokens: partial.tokens ?? {},
  } as unknown as CustomGData;
  base.indexes = buildGameDataIndexes(base);
  return base;
}

describe("getItemUses", () => {
  it("lists token shop purchases sorted by cost with vendor label", () => {
    const G = stubG({
      items: {
        funtoken: { name: "Fun Token", type: "token" },
        confetti: { name: "Confetti", type: "material" },
        rabbitsfoot: { name: "Rabbit's Foot", type: "orb" },
        partyhat: { name: "Party Hat", type: "helmet" },
      } as unknown as CustomGData["items"],
      npcs: {
        funtokens: {
          id: "funtokens",
          role: "funtokens",
          name: "Tricksy",
          token: "funtoken",
          items: [],
        },
      } as unknown as CustomGData["npcs"],
      tokens: {
        funtoken: { confetti: 0.01, partyhat: 2, rabbitsfoot: 120 },
      } as unknown as CustomGData["tokens"],
    });

    const uses = getItemUses("funtoken" as ItemKey, G);
    expect(uses.hasUses).toBe(true);
    expect(uses.tokenSpends.map((s) => s.itemKey)).toStrictEqual([
      "confetti",
      "partyhat",
      "rabbitsfoot",
    ]);
    expect(uses.tokenSpends[0]?.tokenCost).toBe(1);
    expect(uses.tokenSpends[0]?.quantity).toBe(100);
    expect(uses.tokenSpends[0]?.costLabel).toBe("1 × Fun Token");
    expect(uses.tokenSpends[0]?.npcLabel).toBe("Tricksy");
    expect(uses.tokenSpends[1]?.tokenCost).toBe(2);
    expect(uses.tokenSpends[1]?.quantity).toBe(1);
    expect(uses.tokenSpends[2]?.tokenCost).toBe(120);
    expect(uses.tokenSpends[2]?.costLabel).toBe("120 × Fun Token");
    expect(uses.tokenVendors).toHaveLength(1);
    expect(uses.tokenVendors[0]?.npcId).toBe("funtokens");
    expect(uses.tokenVendors[0]?.npcLabel).toBe("Tricksy");
    expect(uses.tokenVendors[0]?.spends).toHaveLength(3);
    expect(uses.exchangeRewards).toHaveLength(0);
  });

  it("lists exchange rewards for exchangeable inputs", () => {
    const G = stubG({
      items: {
        gem0: { name: "Raw Emerald", type: "gem", e: 1 },
        armorbox: { name: "Armor Box", type: "box" },
        helmet: { name: "Helmet", type: "helmet" },
      } as unknown as CustomGData["items"],
      npcs: {
        exchange: { id: "exchange", role: "exchange", name: "Xyn", items: [] },
      } as unknown as CustomGData["npcs"],
      drops: {
        monsters: {},
        gem0: [
          [1, "armorbox"],
          [1, "helmet"],
        ],
      },
    });

    const uses = getItemUses("gem0" as ItemKey, G);
    expect(uses.hasUses).toBe(true);
    expect(uses.tokenSpends).toHaveLength(0);
    expect(uses.exchangeNpc).toStrictEqual({ npcId: "exchange", npcLabel: "Xyn" });
    expect(uses.exchangeRewards).toHaveLength(2);
    expect(uses.exchangeRewards.map((r) => r.itemKey)).toStrictEqual(["armorbox", "helmet"]);
    expect(uses.exchangeRewards[0]?.oddsLabel).toBe("50.00%");
  });

  it("returns empty when the item has no spends or exchange table", () => {
    const G = stubG({
      items: {
        leather: { name: "Leather", type: "material" },
      } as unknown as CustomGData["items"],
    });

    const uses = getItemUses("leather" as ItemKey, G);
    expect(uses.hasUses).toBe(false);
    expect(uses.tokenSpends).toHaveLength(0);
    expect(uses.exchangeRewards).toHaveLength(0);
  });
});
