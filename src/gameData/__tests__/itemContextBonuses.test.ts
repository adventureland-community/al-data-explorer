import { readFileSync } from "fs";
import { join } from "path";

import { itemContextBonusRows } from "../itemContextBonuses";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as {
    items: Record<string, import("typed-adventureland").GItem>;
    maps: Record<string, { name?: string; ignore?: boolean }>;
  };
}

describe("itemContextBonusRows", () => {
  const G = loadG();

  it("lists tigerhelmet rogue-only bonuses including upgrade nest", () => {
    const rows = itemContextBonusRows(G.items.tigerhelmet, { maps: G.maps });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.scope).toMatchObject({ kind: "class", classKey: "rogue" });
    expect(rows[0]?.bonuses).toStrictEqual(
      expect.arrayContaining([{ key: "crit", label: "Crit", value: "+2%" }]),
    );
    expect(rows[0]?.upgrade).toStrictEqual(
      expect.arrayContaining([{ key: "crit", label: "Crit", value: expect.stringMatching(/\+/) }]),
    );
  });

  it("lists scorpionseal multi-class bonuses", () => {
    const rows = itemContextBonusRows(G.items.scorpionseal, { maps: G.maps });
    expect(rows.map((row) => (row.scope.kind === "class" ? row.scope.classKey : ""))).toStrictEqual(
      ["warrior", "paladin", "rogue"],
    );
  });

  it("lists iceskates winterland map bonus", () => {
    const rows = itemContextBonusRows(G.items.iceskates, { maps: G.maps });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.scope.kind).toBe("map");
    if (rows[0]?.scope.kind !== "map") throw new Error("expected map scope");
    expect(rows[0].scope.maps.map((m) => m.key)).toStrictEqual(["winterland"]);
    expect(rows[0].bonuses).toStrictEqual(
      expect.arrayContaining([{ key: "speed", label: "Speed", value: "+25" }]),
    );
  });

  it("groups identical graveglass map bonuses into one card", () => {
    const rows = itemContextBonusRows(G.items.graveglass, { maps: G.maps });
    expect(rows).toHaveLength(1);
    if (rows[0]?.scope.kind !== "map") throw new Error("expected map scope");
    expect(rows[0].scope.maps.map((m) => m.key).sort()).toStrictEqual(
      ["cave", "crypt", "halloween", "spookytown"].sort(),
    );
  });

  it("returns empty for items without context blocks", () => {
    expect(itemContextBonusRows(G.items.dagger, { maps: G.maps })).toStrictEqual([]);
  });
});
