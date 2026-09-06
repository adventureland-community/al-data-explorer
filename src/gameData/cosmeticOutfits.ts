import { ClassLook } from "./characterLook";

const STORAGE_KEY = "al-dressing-outfits-v1";

export type SavedOutfit = {
  id: string;
  name: string;
  look: ClassLook;
  updatedAt: number;
};

function readRaw(): SavedOutfit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: SavedOutfit[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      if (typeof rec.id !== "string" || typeof rec.name !== "string") continue;
      const look = rec.look as ClassLook | undefined;
      if (!look || typeof look.skin !== "string" || typeof look.cx !== "object") continue;
      out.push({
        id: rec.id,
        name: rec.name,
        look: { skin: look.skin, cx: { ...look.cx } },
        updatedAt: typeof rec.updatedAt === "number" ? rec.updatedAt : Date.now(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function writeRaw(rows: SavedOutfit[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // quota / private mode
  }
}

export function loadSavedOutfits(): SavedOutfit[] {
  return readRaw().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveOutfit(name: string, look: ClassLook, existingId?: string): SavedOutfit[] {
  const rows = readRaw();
  const id = existingId ?? `outfit-${Date.now().toString(36)}`;
  const next: SavedOutfit = {
    id,
    name: name.trim() || "Outfit",
    look: { skin: look.skin, cx: { ...look.cx } },
    updatedAt: Date.now(),
  };
  const without = rows.filter((row) => row.id !== id);
  without.push(next);
  writeRaw(without);
  return loadSavedOutfits();
}

export function deleteSavedOutfit(id: string): SavedOutfit[] {
  writeRaw(readRaw().filter((row) => row.id !== id));
  return loadSavedOutfits();
}
