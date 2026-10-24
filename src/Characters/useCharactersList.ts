import { useEffect, useState } from "react";

import { seedLoadoutsFromCharactersPage } from "./fetchCharacterLoadout";
import { getCharactersHtml } from "./getCharacters";
import { ListedCharacter, parseCharactersPage } from "./parseCharacters";

type CharactersListState = {
  characters: ListedCharacter[];
  loading: boolean;
  error: string | null;
  /** True when showing a stale local snapshot because live fetch failed. */
  fromCache: boolean;
  /** Loadouts seeded from the characters list HTML (gear + looks). */
  loadoutsReady: boolean;
  reload: () => void;
};

const STORAGE_KEY = "al-characters-list-v1";
const STORAGE_TTL_MS = 30 * 60 * 1000;

let cached: ListedCharacter[] | null = null;
let loadoutsReady = false;
let inflight: Promise<ListedCharacter[]> | null = null;

function readPersisted(): ListedCharacter[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; characters: ListedCharacter[] };
    if (!parsed?.characters?.length) return null;
    if (Date.now() - parsed.at > STORAGE_TTL_MS) return null;
    return parsed.characters;
  } catch {
    return null;
  }
}

function writePersisted(characters: ListedCharacter[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), characters }));
  } catch {
    // ignore quota / private mode
  }
}

async function loadCharacters(force = false): Promise<ListedCharacter[]> {
  if (!force && cached && loadoutsReady) return cached;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    const html = await getCharactersHtml();
    const parsed = parseCharactersPage(html);
    if (parsed.characters.length === 0) {
      throw new Error("No characters found in the adventure.land characters page.");
    }
    seedLoadoutsFromCharactersPage(parsed.loadouts);
    loadoutsReady = true;
    cached = parsed.characters;
    writePersisted(parsed.characters);
    return parsed.characters;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

if (!cached) {
  cached = readPersisted();
}

/** Shared adventure.land/characters list (memory + localStorage across Characters routes). */
export function useCharactersList(): CharactersListState {
  const [characters, setCharacters] = useState<ListedCharacter[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached || !loadoutsReady);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [ready, setReady] = useState(loadoutsReady);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(!cached || !loadoutsReady);
      setError(null);
      setFromCache(false);
      try {
        const list = await loadCharacters(tick > 0);
        if (cancelled) return;
        setCharacters(list);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching characters:", err);
        const persisted = cached ?? readPersisted();
        if (persisted?.length) {
          cached = persisted;
          setCharacters(persisted);
          setFromCache(true);
          setError(
            "Live characters list unavailable. Showing a recent local snapshot (up to 30 minutes old).",
          );
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load adventure.land/characters via the AL proxy.",
          );
          setCharacters([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    characters,
    loading,
    error,
    fromCache,
    loadoutsReady: ready,
    reload: () => {
      cached = null;
      loadoutsReady = false;
      setReady(false);
      setTick((n) => n + 1);
    },
  };
}
