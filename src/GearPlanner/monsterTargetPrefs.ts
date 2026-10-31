import { MonsterKey } from "typed-adventureland";

const FAVORITES_KEY = "al-gear-monster-favorites-v1";
const LAST_KEY = "al-gear-monster-last-v1";

export function loadMonsterFavorites(): MonsterKey[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is MonsterKey => typeof k === "string") as MonsterKey[];
  } catch {
    return [];
  }
}

export function saveMonsterFavorites(keys: MonsterKey[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(keys));
}

export function toggleMonsterFavorite(key: MonsterKey): MonsterKey[] {
  const cur = loadMonsterFavorites();
  const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
  saveMonsterFavorites(next);
  return next;
}

export function loadLastMonster(): MonsterKey | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? (raw as MonsterKey) : null;
  } catch {
    return null;
  }
}

export function saveLastMonster(key: MonsterKey): void {
  localStorage.setItem(LAST_KEY, key);
}
