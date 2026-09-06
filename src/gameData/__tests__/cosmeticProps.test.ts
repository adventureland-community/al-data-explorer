import { readFileSync } from "fs";
import { join } from "path";
import { applyCosmeticCompatibility, hasCosmeticFlag } from "../cosmeticProps";
import { CustomGData } from "../../GDataContext";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as CustomGData;
}

describe("cosmeticProps", () => {
  const G = loadG();

  it("reads prop flags from G.cosmetics.prop", () => {
    expect(hasCosmeticFlag(G, "marmor12c", "no_hair")).toBe(true);
    expect(hasCosmeticFlag(G, "marmor12c", "covers")).toBe(true);
    expect(hasCosmeticFlag(G, "bathat", "manim")).toBe(true);
  });

  it("clears hair when body has no_hair", () => {
    const result = applyCosmeticCompatibility(G, {
      skin: "marmor12c",
      cx: { head: "makeup117", hair: "hairdo105", hat: "hat404" },
    });
    expect(result.look.cx.hair).toBeUndefined();
    expect(result.look.cx.hat).toBe("hat404");
    expect(result.notes.some((n) => n.code === "no_hair")).toBe(true);
    expect(result.notes.some((n) => n.code === "covers")).toBe(true);
  });
});
