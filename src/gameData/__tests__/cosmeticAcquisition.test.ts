import { readFileSync } from "fs";
import { join } from "path";

import { CustomGData } from "../../GDataContext";
import {
  acquireAvailability,
  acquireSourcesFor,
  buildAcquireBrowseMeta,
  buildCosmeticAcquireIndex,
  formatAcquireSummary,
  slotAcquireHint,
} from "../cosmeticAcquisition";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as CustomGData;
}

describe("cosmeticAcquisition", () => {
  const G = loadG();
  const index = buildCosmeticAcquireIndex(G);

  it("marks class starting looks as free defaults", () => {
    const sources = acquireSourcesFor(index, "hairdo105");
    expect(sources.some((s) => s.kind === "class")).toBe(true);
  });

  it("links armor skins to cosmo0 shell packs", () => {
    const sources = acquireSourcesFor(index, "marmor10a");
    const cosmo = sources.find((s) => s.kind === "cosmo");
    expect(cosmo?.packId).toBe("cosmo0");
    expect(cosmo?.shells).toBe(289);
    expect(cosmo?.chance).toBeGreaterThan(0);
    expect(formatAcquireSummary(sources)).toContain("shells");
  });

  it("deduces cxjar cosmetics from G.drops (e.g. breyes / bathat)", () => {
    const breyes = acquireSourcesFor(index, "breyes");
    const drop = breyes.find((s) => s.kind === "drop");
    expect(drop?.dropSourceType).toBe("monster");
    expect(drop?.dropSourceKey).toBe("mrpumpkin");
    expect(drop?.dropItemKey).toBe("cxjar");
    expect(drop?.chance).toBeGreaterThan(0);
    expect(acquireAvailability(breyes)).toBe("pack");
    expect(formatAcquireSummary(breyes)).toMatch(/pumpkin|CX Jar/i);

    const meta = buildAcquireBrowseMeta(index);
    expect(meta.availabilityById.get("breyes")).toBe("pack");
    expect(meta.availabilityById.get("bathat")).toBe("pack");

    const bathat = acquireSourcesFor(index, "bathat");
    expect(bathat.some((s) => s.kind === "drop" && s.dropSourceKey === "mrgreen")).toBe(true);
  });

  it("expands cxbundle members onto member skins", () => {
    const sources = acquireSourcesFor(index, "blackhead");
    const bundle = sources.find((s) => s.kind === "cosmo" && s.note?.includes("bundle"));
    expect(bundle?.packId).toMatch(/^cosmo/);
  });

  it("summarizes slot unlock packs", () => {
    expect(slotAcquireHint("hat", G)).toMatch(/Hat/i);
    expect(slotAcquireHint("hat", G)).toMatch(/shells/i);
    expect(slotAcquireHint("misc", G)).toMatch(/cosmo5|shells/i);
  });
});
