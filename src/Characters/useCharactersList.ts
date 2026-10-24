import { useEffect, useState } from "react";

import { getCharactersHtml } from "./getCharacters";
import { ListedCharacter, parseCharactersHtml } from "./parseCharacters";

type CharactersListState = {
  characters: ListedCharacter[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

let cached: ListedCharacter[] | null = null;
let inflight: Promise<ListedCharacter[]> | null = null;

async function loadCharacters(force = false): Promise<ListedCharacter[]> {
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    const html = await getCharactersHtml();
    const parsed = parseCharactersHtml(html);
    if (parsed.length === 0) {
      throw new Error("No characters found in the adventure.land characters page.");
    }
    cached = parsed;
    return parsed;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Shared adventure.land/characters list (module cache across Characters routes). */
export function useCharactersList(): CharactersListState {
  const [characters, setCharacters] = useState<ListedCharacter[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(!cached);
      setError(null);
      try {
        const list = await loadCharacters(tick > 0);
        if (cancelled) return;
        setCharacters(list);
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching characters:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load adventure.land/characters via the AL proxy.",
        );
        if (!cached) setCharacters([]);
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
    reload: () => {
      cached = null;
      setTick((n) => n + 1);
    },
  };
}
