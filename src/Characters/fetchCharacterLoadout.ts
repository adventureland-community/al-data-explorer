import axios from "axios";
import { ClassKey, ItemInfo, SlotType } from "typed-adventureland";

import { ClassLook, CharacterCx } from "../gameData/characterLook";
import { isClassKey } from "../gameData/classSkills";
import { SavedLoadout } from "../GearPlanner/types";

const AL_PROXY_BASE = "https://al-proxy.thmsn.workers.dev";
const CACHE_TTL_MS = 5 * 60 * 1000;

export type CharacterLoadout = SavedLoadout & {
  name: string;
  look?: ClassLook;
};

type CacheEntry = { at: number; value: CharacterLoadout };

const loadoutCache = new Map<string, CacheEntry>();

function characterUrl(name: string): string {
  const encoded = encodeURIComponent(name);
  const isLocal = process.env.NODE_ENV !== "production";
  return isLocal ? `/al/character/${encoded}` : `${AL_PROXY_BASE}/character/${encoded}`;
}

function cacheKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Parse armor skin + cosmetics from adventure.land character HTML. */
export function parseCharacterLookFromHtml(html: string): ClassLook | undefined {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const el = doc.querySelector(".cskin[data-skin]");
  if (!el) return undefined;
  const skin = el.getAttribute("data-skin")?.trim();
  if (!skin) return undefined;

  let cx: CharacterCx = {};
  const cxRaw = el.getAttribute("data-cx");
  if (cxRaw) {
    try {
      const parsed = JSON.parse(cxRaw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        cx = parsed as CharacterCx;
      }
    } catch {
      // ignore malformed cx
    }
  }
  return { skin, cx };
}

export function parseCharacterLoadoutHtml(html: string, fallbackName: string): CharacterLoadout {
  const match = html.match(
    /var slots[^=]+=(?<gear>.+);(?:.|\n)+Name:<\/span>(?<name>.+)<\/div>(?:.|\n)+Class:<\/span>(?<classKey>.+)<\/div>(?:.|\n)+Level:<\/span>(?<level>.+)<\/div>/,
  );
  if (!match?.groups) {
    throw new Error(`Could not parse character page for ${fallbackName}`);
  }

  const parsedName = match.groups.name.trim();
  const gear = JSON.parse(match.groups.gear) as { [slot in SlotType]?: ItemInfo };
  const classRaw = match.groups.classKey.trim().toLowerCase();
  const classKey: ClassKey | undefined = isClassKey(classRaw) ? classRaw : undefined;
  const level = Number(match.groups.level.trim());

  return {
    name: parsedName,
    gear,
    classKey,
    level: Number.isFinite(level) ? level : 0,
    look: parseCharacterLookFromHtml(html),
  };
}

export function getCachedCharacterLoadout(name: string): CharacterLoadout | undefined {
  const entry = loadoutCache.get(cacheKey(name));
  if (!entry) return undefined;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    loadoutCache.delete(cacheKey(name));
    return undefined;
  }
  return entry.value;
}

/** Fetch and parse a character page. Results are cached briefly across Characters routes. */
export async function fetchCharacterLoadout(
  name: string,
  options?: { force?: boolean },
): Promise<CharacterLoadout> {
  const key = cacheKey(name);
  if (!options?.force) {
    const cached = getCachedCharacterLoadout(name);
    if (cached) return cached;
  }

  const response = await axios.get<string>(characterUrl(name), {
    responseType: "text",
    timeout: 60000,
  });
  const value = parseCharacterLoadoutHtml(response.data, name);
  loadoutCache.set(key, { at: Date.now(), value });
  return value;
}

/** Prefetch several characters with a small concurrency limit (uses cache). */
export async function prefetchCharacterLoadouts(
  names: string[],
  concurrency = 3,
  onProgress?: (loaded: CharacterLoadout[]) => void,
): Promise<CharacterLoadout[]> {
  const results: CharacterLoadout[] = [];
  let index = 0;

  const workers = Array.from({ length: Math.min(concurrency, names.length) }, async () => {
    while (index < names.length) {
      const current = names[index];
      index += 1;
      try {
        const loadout = await fetchCharacterLoadout(current);
        results.push(loadout);
        onProgress?.([...results]);
      } catch (err) {
        console.error(`Failed to load gear for ${current}`, err);
      }
    }
  });

  await Promise.all(workers);
  return results;
}
