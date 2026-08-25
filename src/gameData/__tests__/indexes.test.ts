import { buildGameDataIndexes } from "../indexes";

describe("indexes", () => {
  it("builds drop and shop indexes from minimal game data", () => {
    const indexes = buildGameDataIndexes({
      items: { leather: { type: "material", name: "Leather" } },
      drops: {
        monsters: {
          goo: [[0.5, "leather"]],
        },
      },
      npcs: {
        merchant: { role: "merchant", items: ["leather"] },
      },
      tokens: {},
      maps: {},
    } as unknown as Parameters<typeof buildGameDataIndexes>[0]);

    expect(indexes.dropsByItem.get("leather")?.[0]?.sourceKey).toBe("goo");
    expect(indexes.shopsByItem.get("leather")?.[0]?.npcId).toBe("merchant");
  });
});
