import { deleteSavedOutfit, loadSavedOutfits, saveOutfit } from "../cosmeticOutfits";

describe("cosmeticOutfits", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => {
          memory.set(k, v);
        },
        removeItem: (k: string) => {
          memory.delete(k);
        },
      },
    });
  });

  it("saves and loads named looks", () => {
    expect(loadSavedOutfits()).toHaveLength(0);
    const rows = saveOutfit("Raid look", {
      skin: "marmor6d",
      cx: { head: "makeup117", hat: "bathat" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Raid look");
    expect(rows[0]?.look.cx.hat).toBe("bathat");
  });

  it("deletes a saved outfit", () => {
    const [saved] = saveOutfit("Temp", { skin: "marmor6d", cx: {} });
    expect(saved).toBeDefined();
    expect(deleteSavedOutfit(saved!.id)).toHaveLength(0);
  });
});
