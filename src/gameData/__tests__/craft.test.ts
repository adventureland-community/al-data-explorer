import { buildCraftsByIngredient } from "../craft";

describe("buildCraftsByIngredient", () => {
  it("indexes outputs by each craft ingredient", () => {
    const map = buildCraftsByIngredient({
      basketofeggs: {
        cost: 100,
        items: [
          [1, "egg0"],
          [1, "egg1"],
        ],
      },
      omelette: {
        cost: 10,
        items: [[2, "egg0"]],
      },
    } as never);

    expect(map.get("egg0" as never)).toStrictEqual(["basketofeggs", "omelette"]);
    expect(map.get("egg1" as never)).toStrictEqual(["basketofeggs"]);
  });
});
