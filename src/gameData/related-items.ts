export type ItemDefForRelated = {
  type?: string;
  name?: string;
  grade?: number;
};

export type RelatedItemRef = {
  itemKey: string;
  level?: number;
  quantity?: number;
};

export type RelatedItemGroup = {
  id: string;
  label: string;
  items: RelatedItemRef[];
};

type GameDataForRelated = {
  items: Record<string, ItemDefForRelated>;
};

function numberedSeriesSiblings(
  itemKey: string,
  items: Record<string, ItemDefForRelated>,
): string[] {
  const match = itemKey.match(/^(.+?)(\d+)$/);
  if (!match) return [];
  const prefix = match[1]!;
  const siblings: string[] = [];
  for (const key of Object.keys(items)) {
    if (key === itemKey) continue;
    if (!key.startsWith(prefix)) continue;
    const suffix = key.slice(prefix.length);
    if (/^\d+$/.test(suffix)) siblings.push(key);
  }
  return siblings.sort((a, b) => {
    const na = Number(a.slice(prefix.length)) || 0;
    const nb = Number(b.slice(prefix.length)) || 0;
    return na - nb;
  });
}

function suffixSiblings(
  itemKey: string,
  suffix: string,
  items: Record<string, ItemDefForRelated>,
): string[] {
  if (!itemKey.endsWith(suffix)) return [];
  return Object.keys(items)
    .filter((key) => key !== itemKey && key.endsWith(suffix))
    .sort();
}

function refsFromKeys(keys: string[]): RelatedItemRef[] {
  return keys.map((itemKey) => ({ itemKey }));
}

/**
 * Series / gems / offerings / suffix siblings only.
 * Craft and item-set membership are owned by CraftRecipeCard / ItemSetCard.
 */
export function getRelatedItemGroups(itemKey: string, g: GameDataForRelated): RelatedItemGroup[] {
  const item = g.items[itemKey];
  if (!item) return [];

  const groups: RelatedItemGroup[] = [];
  const seenGroupIds = new Set<string>();

  function pushGroup(id: string, label: string, items: RelatedItemRef[]) {
    if (seenGroupIds.has(id) || items.length === 0) return;
    seenGroupIds.add(id);
    groups.push({ id, label, items });
  }

  if (item.type === "offering") {
    const offerings = Object.keys(g.items)
      .filter((key) => key !== itemKey && g.items[key]?.type === "offering")
      .sort((a, b) => (g.items[a]?.grade ?? 0) - (g.items[b]?.grade ?? 0));
    pushGroup("type:offering", "Offerings", refsFromKeys(offerings));
  }

  if (item.type === "gem" || /^gem\d+$/.test(itemKey)) {
    const gems = Object.keys(g.items)
      .filter((key) => key !== itemKey && /^gem\d+$/.test(key))
      .sort();
    pushGroup("type:gem", "Gems", refsFromKeys(gems));
  }

  for (const suffix of ["nugget", "ingot"] as const) {
    const siblings = suffixSiblings(itemKey, suffix, g.items);
    const label = suffix === "nugget" ? "Nugget tiers" : "Ingot tiers";
    pushGroup(`suffix:${suffix}`, label, refsFromKeys(siblings));
  }

  const series = numberedSeriesSiblings(itemKey, g.items);
  if (series.length > 0) {
    pushGroup(`series:${itemKey.replace(/\d+$/, "")}`, "Craft tier line", refsFromKeys(series));
  }

  return groups;
}
