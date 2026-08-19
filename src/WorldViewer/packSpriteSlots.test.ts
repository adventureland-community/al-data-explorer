import { MonsterFeature } from "./types";
import { packOverlayLabel, packSpriteSlots, pointInPolygon } from "./packSpriteSlots";

function pack(partial: Partial<MonsterFeature> & Pick<MonsterFeature, "type">): MonsterFeature {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    count: 1,
    grow: false,
    ...partial,
  };
}

describe("packSpriteSlots", () => {
  it("places a single sprite at the pack center", () => {
    expect(packSpriteSlots(pack({ type: "bee", x: 10, y: 20, count: 1 }))).toEqual([
      { x: 10, y: 20 },
    ]);
  });

  it("places one sprite per spawn count inside the boundary", () => {
    const monster = pack({ type: "bee", x: 50, y: 40, width: 80, height: 60, count: 9 });
    const slots = packSpriteSlots(monster);
    expect(slots).toHaveLength(9);
    for (const slot of slots) {
      expect(slot.x).toBeGreaterThan(monster.x - monster.width / 2);
      expect(slot.x).toBeLessThan(monster.x + monster.width / 2);
      expect(slot.y).toBeGreaterThan(monster.y - monster.height / 2);
      expect(slot.y).toBeLessThan(monster.y + monster.height / 2);
    }
  });

  it("keeps polygon pack sprites inside the polygon", () => {
    const polygon: Array<[number, number]> = [
      [0, 0],
      [40, 0],
      [20, 40],
    ];
    const monster = pack({
      type: "osnake",
      x: 20,
      y: 13,
      width: 40,
      height: 40,
      count: 7,
      polygon,
    });
    const slots = packSpriteSlots(monster);
    expect(slots).toHaveLength(7);
    for (const slot of slots) {
      expect(pointInPolygon(slot.x, slot.y, polygon)).toBe(true);
    }
  });

  it("offsets overlapping pack types so sprites do not share the same slots", () => {
    const bee = packSpriteSlots(pack({ type: "bee", count: 6, width: 80, height: 80 }));
    const goo = packSpriteSlots(pack({ type: "goo", count: 6, width: 80, height: 80 }));
    expect(bee).toHaveLength(6);
    expect(goo).toHaveLength(6);
    expect(bee[1]).not.toEqual(goo[1]);
  });

  it("labels grow and roam packs", () => {
    expect(packOverlayLabel(pack({ type: "bee", count: 12 }))).toBe("bee ×12");
    expect(packOverlayLabel(pack({ type: "bee", count: 12, grow: true }))).toBe("bee ×12 · grow");
    expect(packOverlayLabel(pack({ type: "a7", count: 1, roam: true }))).toBe("a7 ×1 · roam");
  });
});
