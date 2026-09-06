import { readFileSync } from "fs";
import { join } from "path";

import { CustomGData } from "../../GDataContext";
import { ClassLook } from "../characterLook";
import {
  cosmeticTileLook,
  cosmeticTilePreview,
  equipCosmetic,
  filterCosmetics,
  listCosmetics,
  clearCosmeticSlot,
  undressLook,
  sheetTypeLabel,
  sheetTypesForSlot,
  formatOutfitText,
  sortCosmetics,
} from "../cosmeticsCatalog";
import { isAnimatedCosmeticType } from "../spriteSkinLayout";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as CustomGData;
}

describe("cosmeticsCatalog", () => {
  const G = loadG();
  const catalog = listCosmetics(G);

  it("lists heads, hair, hats, and bodies from sprite sheets", () => {
    expect(catalog.length).toBeGreaterThan(500);
    expect(catalog.some((c) => c.id === "makeup117" && c.slot === "head")).toBe(true);
    expect(catalog.some((c) => c.id === "hairdo105" && c.slot === "hair")).toBe(true);
    expect(catalog.some((c) => c.id === "hat404" && c.slot === "hat")).toBe(true);
    expect(catalog.some((c) => c.id === "marmor6d" && c.slot === "skin")).toBe(true);
  });

  it("filters by slot and query", () => {
    const hair = filterCosmetics(catalog, { slot: "hair", query: "105" });
    expect(hair.every((c) => c.slot === "hair")).toBe(true);
    expect(hair.some((c) => c.id === "hairdo105")).toBe(true);
  });

  it("equips and clears cosmetics on a look", () => {
    let look: ClassLook = { skin: "marmor6d", cx: { head: "makeup117" } };
    look = equipCosmetic(look, {
      id: "hairdo105",
      slot: "hair",
      sheetType: "hair",
    }).look;
    expect(look.cx.hair).toBe("hairdo105");
    look = equipCosmetic(look, {
      id: "hat404",
      slot: "hat",
      sheetType: "hat",
    }).look;
    expect(look.cx.hat).toBe("hat404");
    look = clearCosmeticSlot(look, "hat");
    expect(look.cx.hat).toBeUndefined();
    look = equipCosmetic(look, {
      id: "marmor4b",
      slot: "skin",
      sheetType: "armor",
    }).look;
    expect(look.skin).toBe("marmor4b");
  });

  it("lists gravestones and cosmo5 emotes under stone/misc", () => {
    expect(catalog.some((c) => c.id === "gravestonea" && c.slot === "gravestone")).toBe(true);
    expect(catalog.some((c) => c.id === "wiggle" && c.slot === "misc" && c.kind === "emote")).toBe(
      true,
    );
  });

  it("previews stones as sprites and emotes as skill icons — not CharacterLook", () => {
    const stone = catalog.find((c) => c.id === "gravestonea");
    const emote = catalog.find((c) => c.id === "boop");
    expect(stone).toBeDefined();
    expect(emote).toBeDefined();
    expect(cosmeticTilePreview(stone!)).toStrictEqual({ mode: "sprite", skin: "gravestonea" });
    expect(cosmeticTilePreview(emote!)).toStrictEqual({ mode: "icon", skin: "emote_boop" });
    expect(emote!.previewSkin).toBe("emote_boop");
    expect(cosmeticTilePreview({ id: "hairdo105", slot: "hair", sheetType: "hair" })).toStrictEqual(
      { mode: "character" },
    );
  });

  it("filters free / pack / unpublished and sorts by shells", () => {
    const availabilityById = new Map<string, "free" | "pack" | "unpublished">([
      ["hairdo105", "free"],
      ["marmor10a", "pack"],
    ]);
    expect(
      filterCosmetics(catalog, { acquire: "free", availabilityById }).some(
        (c) => c.id === "hairdo105",
      ),
    ).toBe(true);
    expect(
      filterCosmetics(catalog, { acquire: "pack", availabilityById }).some(
        (c) => c.id === "marmor10a",
      ),
    ).toBe(true);
    expect(
      filterCosmetics(catalog, {
        slot: "hat",
        acquire: "unpublished",
        availabilityById,
      }).some((c) => c.id === "bathat"),
    ).toBe(true);

    const shellsById = new Map([
      ["z-expensive", 500],
      ["a-cheap", 100],
    ]);
    const sorted = sortCosmetics(
      [
        { id: "z-expensive", slot: "hat", sheetType: "hat" },
        { id: "a-cheap", slot: "hat", sheetType: "hat" },
      ],
      "shells",
      { shellsById },
    );
    expect(sorted.map((c) => c.id)).toStrictEqual(["a-cheap", "z-expensive"]);
  });

  it("builds a tile look that includes the cosmetic", () => {
    const base: ClassLook = { skin: "marmor6d", cx: { head: "makeup117" } };
    const tile = cosmeticTileLook({ id: "hairdo105", slot: "hair", sheetType: "hair" }, base);
    expect(tile.cx.hair).toBe("hairdo105");
    expect(tile.cx.head).toBe("makeup117");
  });

  it("undresses optional cosmetics but keeps body and a head", () => {
    const look = undressLook({
      skin: "marmor6d",
      cx: { head: "makeup105", hair: "hairdo105", hat: "hat404" },
    });
    expect(look.skin).toBe("marmor6d");
    expect(look.cx.head).toBe("makeup117");
    expect(look.cx.hair).toBeUndefined();
    expect(look.cx.hat).toBeUndefined();
  });

  it("labels animated sheet types and sorts them first", () => {
    expect(isAnimatedCosmeticType("a_hat")).toBe(true);
    expect(sheetTypeLabel("a_hat")).toBe("Animated");
    expect(sheetTypeLabel("hat")).toBe("Hats");
    const hatTypes = sheetTypesForSlot(catalog, "hat");
    expect(hatTypes[0]).toBe("a_hat");
    expect(hatTypes).toContain("hat");
  });

  it("formats a Narcissus-style outfit text list", () => {
    const text = formatOutfitText({
      skin: "marmor6d",
      cx: { head: "makeup117", hat: "bathat" },
    });
    expect(text).toContain("Body\tmarmor6d");
    expect(text).toContain("Head\tmakeup117");
    expect(text).toContain("Hat\tbathat");
  });
});
