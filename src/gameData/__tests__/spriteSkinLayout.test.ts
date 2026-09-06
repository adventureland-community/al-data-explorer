import { readFileSync } from "fs";
import { join } from "path";

import { CustomGData } from "../../GDataContext";
import {
  findSpriteSheet,
  idleWalkFrame,
  isAnimatedCosmeticType,
  spriteGridSize,
  spriteSkinView,
} from "../spriteSkinLayout";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as CustomGData;
}

describe("spriteSkinLayout", () => {
  const G = loadG();

  it("finds a sprite sheet once for a skin id", () => {
    const found = findSpriteSheet(G.sprites, "marmor6d");
    expect(found?.data.type).toBe("armor");
    expect(found?.col).toBeGreaterThanOrEqual(0);
    expect(findSpriteSheet(G.sprites, "no-such-skin-xyz")).toBeNull();
  });

  it("uses the standing walk column for armor and the first cell for heads", () => {
    expect(idleWalkFrame(3)).toBe(1);
    expect(idleWalkFrame(1)).toBe(0);

    const armor = spriteSkinView(G.sprites, G.images, G.dimensions, "marmor6d", 1);
    expect(armor?.colNum).toBe(3);
    expect(armor?.walkFrame).toBe(1);
    expect(armor?.direction).toBe(0);
    // matrix col 3, 3 walk frames, idle is column 1 → origin at (3*3+1)*27
    expect(armor?.originX).toBe((3 * 3 + 1) * 27);
    expect(armor?.originY).toBe(0);

    const head = spriteSkinView(G.sprites, G.images, G.dimensions, "makeup117", 1);
    expect(head?.colNum).toBe(1);
    expect(head?.walkFrame).toBe(0);
    expect(head?.originX).toBe(17 * 27);
    expect(head?.originY).toBe(0);

    const hair = spriteSkinView(G.sprites, G.images, G.dimensions, "hairdo105", 1);
    expect(hair?.colNum).toBe(1);
    expect(hair?.walkFrame).toBe(0);
  });

  it("treats a_hat / a_makeup as 3×4 animated strips", () => {
    expect(isAnimatedCosmeticType("a_hat")).toBe(true);
    expect(isAnimatedCosmeticType("a_makeup")).toBe(true);
    expect(isAnimatedCosmeticType("hat")).toBe(false);
    expect(spriteGridSize("a_hat")).toStrictEqual({ colNum: 3, rowNum: 4 });
    expect(spriteGridSize("a_makeup")).toStrictEqual({ colNum: 3, rowNum: 4 });

    const bathat = spriteSkinView(G.sprites, G.images, G.dimensions, "bathat", 1);
    expect(bathat?.sheetType).toBe("a_hat");
    expect(bathat?.colNum).toBe(3);
    expect(bathat?.rowNum).toBe(4);
    expect(bathat?.walkFrame).toBe(1);

    const frame0 = spriteSkinView(G.sprites, G.images, G.dimensions, "bathat", 1, {
      walkFrame: 0,
    });
    const frame1 = spriteSkinView(G.sprites, G.images, G.dimensions, "bathat", 1, {
      walkFrame: 1,
    });
    const frame2 = spriteSkinView(G.sprites, G.images, G.dimensions, "bathat", 1, {
      walkFrame: 2,
    });
    expect(frame0?.walkFrame).toBe(0);
    expect(frame2?.walkFrame).toBe(2);
    const step = (frame1?.originX ?? 0) - (frame0?.originX ?? 0);
    expect(step).toBeGreaterThan(0);
    expect((frame2?.originX ?? 0) - (frame0?.originX ?? 0)).toBe(2 * step);

    const bbeyes = spriteSkinView(G.sprites, G.images, G.dimensions, "bbeyes", 1, {
      walkFrame: 1,
    });
    expect(bbeyes?.sheetType).toBe("a_makeup");
    expect(bbeyes?.colNum).toBe(3);
  });
});
