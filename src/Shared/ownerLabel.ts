/** Ignore seed-only names when deriving a shared owner label. */
const IGNORED_CHARACTER_NAMES = new Set(["LocalPutTester"]);

/**
 * Derive a short display name from character names (e.g. earthMer, earthWar → "earth").
 */
export function ownerLabelFromCharacters(characters: string[] | undefined): string | undefined {
  if (!characters?.length) {
    return undefined;
  }

  const names: string[] = [];
  for (const name of characters) {
    if (name && !IGNORED_CHARACTER_NAMES.has(name)) {
      names.push(name);
    }
  }
  if (names.length === 0) {
    return undefined;
  }

  let prefix = names[0];
  for (let i = 1; i < names.length; i++) {
    const name = names[i];
    while (prefix.length > 0 && !name.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }

  if (prefix.length >= 2) {
    return prefix;
  }
  return names[0];
}

export function formatOwnerLabel(ownerId: string, characters?: string[], label?: string): string {
  const derived = label || ownerLabelFromCharacters(characters);
  return derived || ownerId;
}
