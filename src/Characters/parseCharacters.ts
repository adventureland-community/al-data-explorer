import { ClassKey } from "typed-adventureland";

import { classNameToKey, sortClassNames } from "./characterClasses";

export type ListedCharacter = {
  name: string;
  className: string;
  classKey: ClassKey | undefined;
  level: number;
  online: boolean;
};

function fieldValue(cardText: string, label: string): string | undefined {
  const match = cardText.match(new RegExp(`${label}:</span>\\s*([^<\\n]+)`, "i"));
  return match?.[1]?.trim();
}

/** Parse adventure.land/characters HTML into character rows. */
export function parseCharactersHtml(html: string): ListedCharacter[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const cards = Array.from(doc.querySelectorAll('div[style*="border: 5px solid gray"]'));

  const characters: ListedCharacter[] = [];
  for (const card of cards) {
    const text = card.innerHTML;
    const name = fieldValue(text, "Name");
    const className = fieldValue(text, "Class");
    const levelRaw = fieldValue(text, "Level");
    if (!name || !className || !levelRaw) {
      continue;
    }
    const level = Number.parseInt(levelRaw, 10);
    if (!Number.isFinite(level)) {
      continue;
    }
    const online = /color:\s*green[^>]*>\s*Online/i.test(text);
    characters.push({
      name,
      className,
      classKey: classNameToKey(className),
      level,
      online,
    });
  }
  return characters;
}

export function compareByLevelDesc(a: ListedCharacter, b: ListedCharacter): number {
  return b.level - a.level || a.name.localeCompare(b.name);
}

/** Characters for one class, sorted by level desc. */
export function charactersForClass(
  characters: ListedCharacter[],
  className: string,
): ListedCharacter[] {
  return characters
    .filter((c) => c.className === className)
    .slice()
    .sort(compareByLevelDesc);
}

/** Top `limit` characters per class, sorted by level desc. */
export function topCharactersByClass(
  characters: ListedCharacter[],
  limit = 10,
): { className: string; characters: ListedCharacter[] }[] {
  const grouped = new Map<string, ListedCharacter[]>();
  for (const character of characters) {
    const list = grouped.get(character.className) ?? [];
    list.push(character);
    grouped.set(character.className, list);
  }

  return sortClassNames(Array.from(grouped.keys())).map((className) => ({
    className,
    characters: (grouped.get(className) ?? []).slice().sort(compareByLevelDesc).slice(0, limit),
  }));
}

export function filterCharacters(
  characters: ListedCharacter[],
  {
    search,
    classNames,
    onlineOnly,
  }: {
    search: string;
    classNames: string[];
    onlineOnly: boolean;
  },
): ListedCharacter[] {
  const q = search.trim().toLowerCase();
  const classSet = classNames.length > 0 ? new Set(classNames) : null;

  return characters
    .filter((c) => {
      if (onlineOnly && !c.online) return false;
      if (classSet && !classSet.has(c.className)) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    })
    .slice()
    .sort(compareByLevelDesc);
}
