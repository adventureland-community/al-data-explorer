import {
  CharacterCx,
  ClassLook,
  DEFAULT_PREVIEW_BODY,
  DEFAULT_PREVIEW_HEAD,
} from "./characterLook";
import { CustomGData } from "../GDataContext";
import { CosmeticEntry } from "./cosmeticsCatalog";
import { asRecord } from "./gRecord";

export type CosmeticBundle = {
  id: string;
  /** Skin ids unlocked together (`G.cosmetics.bundle`). */
  skins: string[];
  /** Preview look applying the bundle skins into slots. */
  look: ClassLook;
};

/**
 * Bundle unlocks from `G.cosmetics.bundle` / `cxbundle` drops (e.g. blackw, pinkb).
 */
export function listCosmeticBundles(
  G: Pick<CustomGData, "cosmetics" | "sprites">,
  catalog: CosmeticEntry[],
): CosmeticBundle[] {
  const cosmetics = asRecord(G.cosmetics);
  const bundleRec = asRecord(cosmetics?.bundle);
  if (!bundleRec) return [];

  const byId = new Map<string, CosmeticEntry>();
  for (const entry of catalog) byId.set(entry.id, entry);

  const out: CosmeticBundle[] = [];
  for (const [id, raw] of Object.entries(bundleRec)) {
    if (!Array.isArray(raw)) continue;
    const skins: string[] = [];
    for (const cell of raw) {
      if (typeof cell === "string" && cell) skins.push(cell);
    }
    if (!skins.length) continue;

    let skin = DEFAULT_PREVIEW_BODY;
    const cx: CharacterCx = { head: DEFAULT_PREVIEW_HEAD };
    for (const skinId of skins) {
      const entry = byId.get(skinId);
      if (!entry) {
        // Unknown sheet — treat as body if it looks like armor/body
        if (/^(m|s|l)(armor|body|char)/.test(skinId) || skinId.includes("armor")) {
          skin = skinId;
        }
        continue;
      }
      if (entry.slot === "skin") skin = entry.id;
      else if (entry.slot === "head") cx.head = entry.id;
      else cx[entry.slot] = entry.id;
    }

    out.push({ id, skins, look: { skin, cx } });
  }

  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

export function bundleTileEntry(bundle: CosmeticBundle): CosmeticEntry {
  return {
    id: bundle.id,
    slot: "skin",
    sheetType: "bundle",
    kind: "bundle",
  };
}
