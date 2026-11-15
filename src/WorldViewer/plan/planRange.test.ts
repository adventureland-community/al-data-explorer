import { readFileSync } from "fs";
import { join } from "path";

import { CustomGData } from "../../GDataContext";
import { resolveGhostAttackRange } from "./planRange";
import { PlanGhostObject } from "./types";

function loadG(): CustomGData {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as CustomGData;
}

describe("planRange", () => {
  const G = loadG();

  const blankRanger: PlanGhostObject = {
    kind: "ghost",
    id: "g1",
    color: "#fff",
    x: 0,
    y: 0,
    classKey: "ranger",
  };

  it("resolves class attack range for a blank ghost", () => {
    const range = resolveGhostAttackRange({ ghost: blankRanger, G });
    expect(range).not.toBeNull();
    expect(range!).toBeGreaterThan(0);
  });

  it("lets radiusOverride win", () => {
    expect(
      resolveGhostAttackRange({
        ghost: blankRanger,
        G,
        radiusOverride: 42,
      }),
    ).toBe(42);
  });

  it("uses loadout gear when present", () => {
    const withBow = resolveGhostAttackRange({
      ghost: {
        ...blankRanger,
        loadout: {
          classKey: "ranger",
          level: 50,
          gear: { mainhand: { name: "bow", level: 0 } },
        },
      },
      G,
    });
    const blank = resolveGhostAttackRange({ ghost: blankRanger, G });
    expect(withBow).not.toBeNull();
    expect(blank).not.toBeNull();
    expect(withBow!).toBeGreaterThanOrEqual(blank!);
  });
});
