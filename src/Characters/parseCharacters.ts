import { ClassKey, ItemInfo, SlotType } from "typed-adventureland";

import { ClassLook, CharacterCx } from "../gameData/characterLook";
import { CharacterLoadout } from "./fetchCharacterLoadout";
import { classNameToKey, sortClassNames } from "./characterClasses";

export type ListedCharacter = {
  name: string;
  className: string;
  classKey: ClassKey | undefined;
  level: number;
  online: boolean;
};

export type ParsedCharactersPage = {
  characters: ListedCharacter[];
  loadouts: CharacterLoadout[];
};

function fieldValue(cardText: string, label: string): string | undefined {
  const match = cardText.match(new RegExp(`${label}:</span>\\s*([^<\\n]+)`, "i"));
  return match?.[1]?.trim();
}

function parseLookFromCard(card: Element): ClassLook | undefined {
  const el = card.querySelector(".cskin[data-skin]");
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
      // ignore
    }
  }
  return { skin, cx };
}

/**
 * Extract every `var slots{id}={...};` map from the characters list page.
 * Keys are lowercase ids (matches `.slots[data-name]`).
 */
export function parseSlotsMapsFromHtml(
  html: string,
): Map<string, { [slot in SlotType]?: ItemInfo }> {
  const maps = new Map<string, { [slot in SlotType]?: ItemInfo }>();
  const re = /var slots([a-zA-Z0-9_]+)=(\{[\s\S]*?\});/g;
  let match = re.exec(html);
  while (match !== null) {
    const id = match[1].toLowerCase();
    try {
      maps.set(id, JSON.parse(match[2]) as { [slot in SlotType]?: ItemInfo });
    } catch {
      // skip malformed block
    }
    match = re.exec(html);
  }
  return maps;
}

/**
 * Parse adventure.land/characters HTML.
 * Cards include name/class/level/online/look; gear lives in sibling `var slots…` scripts.
 */
export function parseCharactersPage(html: string): ParsedCharactersPage {
  const slotsById = parseSlotsMapsFromHtml(html);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const cards = Array.from(doc.querySelectorAll('div[style*="border: 5px solid gray"]'));

  const characters: ListedCharacter[] = [];
  const loadouts: CharacterLoadout[] = [];

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
    const classKey = classNameToKey(className);
    const listed: ListedCharacter = {
      name,
      className,
      classKey,
      level,
      online,
    };
    characters.push(listed);

    const slotId =
      card.querySelector(".slots[data-name]")?.getAttribute("data-name")?.toLowerCase() ??
      name.toLowerCase();
    const gear = slotsById.get(slotId) ?? {};
    loadouts.push({
      name,
      classKey,
      level,
      gear,
      look: parseLookFromCard(card),
    });
  }

  return { characters, loadouts };
}

/** @deprecated Prefer parseCharactersPage — kept for callers that only need the list. */
export function parseCharactersHtml(html: string): ListedCharacter[] {
  return parseCharactersPage(html).characters;
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
