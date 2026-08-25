import { ItemKey } from "typed-adventureland";

import { getItemAcquisition } from "../itemAcquisition";
import { buildGameDataIndexes } from "../indexes";
import { CustomGData } from "../../GDataContext";

function stubG(partial: Partial<CustomGData> & { items: CustomGData["items"] }): CustomGData {
  const base = {
    ...partial,
    monsters: partial.monsters ?? { goo: { name: "Goo" } },
    maps: partial.maps ?? { main: { name: "Mainland" } },
    npcs: partial.npcs ?? {},
    drops: partial.drops ?? {
      monsters: {
        goo: [[100], [50, "leather"], [40, "leather"]],
      },
    },
    craft: partial.craft ?? {},
    tokens: partial.tokens ?? {},
  } as unknown as CustomGData;
  base.indexes = buildGameDataIndexes(base);
  return base;
}

describe("getItemAcquisition", () => {
  it("merges repeated drops and resolves display labels", () => {
    const G = stubG({
      items: {
        leather: { name: "Leather", type: "material" },
      } as unknown as CustomGData["items"],
    });

    const acq = getItemAcquisition("leather" as ItemKey, G);
    expect(acq.hasSources).toBe(true);
    expect(acq.drops).toHaveLength(1);
    expect(acq.drops[0]?.label).toBe("Goo");
    expect(acq.drops[0]?.oddsLabel).toBe("90 / 1");
    expect(acq.drops[0]?.icon.kind).toBe("monster");
  });

  it("lists NPC buyers with gold price and icon key", () => {
    const G = stubG({
      items: {
        softstepgloves: { name: "Softstep Gloves", type: "gloves", g: 420000 },
      } as unknown as CustomGData["items"],
      npcs: {
        thief: { id: "thief", role: "merchant", name: "Crun", items: ["softstepgloves"] },
      } as unknown as CustomGData["npcs"],
      maps: {
        main: { name: "Mainland", npcs: [{ id: "thief", position: [100, 200] }] },
      } as unknown as CustomGData["maps"],
    });

    const acq = getItemAcquisition("softstepgloves" as ItemKey, G);
    expect(acq.shops).toHaveLength(1);
    expect(acq.shops[0]?.npcId).toBe("thief");
    expect(acq.shops[0]?.label).toBe("Crun");
    expect(acq.shops[0]?.priceLabel).toBe("420,000g");
    expect(acq.shops[0]?.mapLabel).toContain("Mainland");
  });

  it("lists shell price when item.cash is set", () => {
    const G = stubG({
      items: {
        cosmo0: { name: "Cosmetics", type: "cosmetics", g: 1, cash: 289 },
      } as unknown as CustomGData["items"],
      npcs: {
        antip2w: { id: "antip2w", role: "premium", name: "Mr. Rich", items: ["cosmo0"] },
      } as unknown as CustomGData["npcs"],
    });

    const acq = getItemAcquisition("cosmo0" as ItemKey, G);
    expect(acq.shops[0]?.priceLabel).toBe("289 shells");
  });

  it("lists token shop offers with NPC vendor and cost", () => {
    const G = stubG({
      items: {
        rabbitsfoot: { name: "Rabbit's Foot", type: "orb" },
        funtoken: { name: "Fun Token", type: "token" },
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
        funtoken: { rabbitsfoot: 120 },
      } as unknown as CustomGData["tokens"],
    });

    const acq = getItemAcquisition("rabbitsfoot" as ItemKey, G);
    expect(acq.tokens).toHaveLength(1);
    expect(acq.tokens[0]?.npcId).toBe("funtokens");
    expect(acq.tokens[0]?.npcLabel).toBe("Tricksy");
    expect(acq.tokens[0]?.costLabel).toBe("120 × Fun Token");
  });

  it("does not list 'used in craft' — that belongs on ItemDetail craft cards", () => {
    const G = stubG({
      items: {
        vitearring: { name: "Earring of Vitality", type: "earring" },
        saffronloop: { name: "Saffron Loop", type: "earring" },
      } as unknown as CustomGData["items"],
      craft: {
        saffronloop: {
          items: [
            [1, "vitearring"],
            [1, "feather"],
          ],
          cost: 1000,
        },
      } as unknown as CustomGData["craft"],
    });

    const acq = getItemAcquisition("vitearring" as ItemKey, G);
    expect(acq.crafts.some((c) => c.label.includes("Used in craft"))).toBe(false);
    expect(acq.crafts).toHaveLength(0);
  });

  it("lists exchange rewards separately from monster drops", () => {
    const G = stubG({
      items: {
        armorbox: { name: "Armor Box", type: "box" },
        gem0: { name: "Raw Emerald", type: "gem", e: 1 },
      } as unknown as CustomGData["items"],
      drops: {
        monsters: {},
        // Weighted exchange table — odds are weight / sum (server_functions.js).
        gem0: [
          [1, "armorbox"],
          [1, "helmet"],
        ],
      },
    });

    const acq = getItemAcquisition("armorbox" as ItemKey, G);
    expect(acq.exchanges).toHaveLength(1);
    expect(acq.exchanges[0]?.inputKey).toBe("gem0");
    expect(acq.exchanges[0]?.label).toBe("Raw Emerald");
    expect(acq.exchanges[0]?.oddsLabel).toBe("50.00%");
    expect(acq.drops).toHaveLength(0);
  });
});
