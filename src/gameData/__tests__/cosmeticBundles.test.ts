import { readFileSync } from "fs";
import { join } from "path";

import { CustomGData } from "../../GDataContext";
import { listCosmeticBundles } from "../cosmeticBundles";
import { listCosmetics } from "../cosmeticsCatalog";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as CustomGData;
}

describe("cosmeticBundles", () => {
  const G = loadG();
  const catalog = listCosmetics(G);
  const bundles = listCosmeticBundles(G, catalog);

  it("lists blackw / pinkb / rogueb unlock sets", () => {
    const ids = bundles.map((b) => b.id);
    expect(ids).toStrictEqual(expect.arrayContaining(["blackw", "pinkb", "rogueb"]));
  });

  it("builds a preview look from bundle skins", () => {
    const blackw = bundles.find((b) => b.id === "blackw");
    expect(blackw).toBeDefined();
    expect(blackw!.skins).toStrictEqual(
      expect.arrayContaining(["mbody6b", "mbody6c", "blackhead"]),
    );
    expect(blackw!.look.cx.head).toBe("blackhead");
  });
});
