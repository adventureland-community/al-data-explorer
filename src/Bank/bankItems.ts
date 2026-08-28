import { GData, ItemInfoPValues, ItemKey, ItemType } from "typed-adventureland";
import { itemMatchesSearch } from "../gameData/itemFilters";
import { getItemName, getTitleName } from "../Shared/iteminfo-util";
import { BankDataProps } from "./getBankData";

const types: { [key in ItemType | "exchange" | "other"]?: string } = {
  helmet: "Helmets",
  chest: "Armors",
  pants: "Pants",
  gloves: "Gloves",
  shoes: "Shoes",
  cape: "Capes",
  ring: "Rings",
  earring: "Earrings",
  amulet: "Amulets",
  belt: "Belts",
  orb: "Orbs",
  weapon: "Weapons",
  shield: "Shields",
  source: "Offhands",
  quiver: "Offhands",
  misc_offhand: "Offhands",
  elixir: "Elixirs",
  pot: "Potions",
  cscroll: "Scrolls",
  uscroll: "Scrolls",
  pscroll: "Scrolls",
  offering: "Scrolls",
  material: "Crafting and Collecting",
  exchange: "Exchangeables",
  dungeon_key: "Keys",
  token: "Tokens",
  other: "Others",
};

export type AggregatedBankItem = {
  p?: ItemInfoPValues;
  level: number;
  name: ItemKey;
  q: number;
  stack: number;
  category: string;
  type?: string;
};

export type BankItemChangeKind = "added" | "removed" | "changed";

export type BankItemChange = {
  kind: BankItemChangeKind;
  item: AggregatedBankItem;
  previousQ?: number;
  previousStack?: number;
  deltaQ?: number;
  deltaStack?: number;
};

export type BankRefreshSummary = {
  changes: BankItemChange[];
  goldDelta?: number;
  usedSlotsDelta?: number;
  hasChanges: boolean;
};

export type AggregatedBankData = {
  items: AggregatedBankItem[];
  itemsByCategory: Record<string, AggregatedBankItem[]>;
  usedSlots: number;
  totalSlots: number;
};

export function getUniqueItemKey(item: { p?: string; level: number; name: ItemKey | string }) {
  return `${item.p ?? ""}${item.level}${item.name}`;
}

export function aggregateBankData(bankData: BankDataProps, G?: GData): AggregatedBankData {
  let usedSlots = 0;
  let totalSlots = 0;
  const items: AggregatedBankItem[] = [];
  const itemsByKey: Record<string, AggregatedBankItem> = {};
  const itemsByCategory: Record<string, AggregatedBankItem[]> = {};

  // eslint-disable-next-line guard-for-in
  for (const bankKey in bankData) {
    const bankItems = bankData[bankKey];
    if (!Array.isArray(bankItems)) continue;

    totalSlots += 42;

    for (const item of bankItems) {
      if (!item) continue;

      usedSlots++;

      const key = getUniqueItemKey(item);
      let data = itemsByKey[key];
      if (!data) {
        const itemKey = item.name as ItemKey;
        const gItem = G?.items[itemKey];
        let category = (gItem && types[gItem.type]) ?? "Others";

        if (gItem && gItem.e) {
          category = types.exchange ?? "Others";
        }

        data = {
          p: item.p,
          level: item.level,
          name: item.name,
          q: 0,
          stack: 0,
          category,
          type: gItem?.type ?? undefined,
        };

        itemsByKey[key] = data;
        items.push(data);

        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        itemsByCategory[category].push(data);
      }
      data.q += item.q ?? 1;
      data.stack++;
    }
  }

  return { items, itemsByCategory, usedSlots, totalSlots };
}

export function formatBankItemLabel(item: AggregatedBankItem, G?: GData): string {
  const itemKey = item.name as ItemKey;
  const gItem = G?.items[itemKey];
  const titleName = G ? getTitleName(item, G) : "";
  const itemName = gItem ? getItemName(itemKey, gItem) : item.name;
  const levelPrefix = item.level > 0 ? `+${item.level} ` : "";
  const titlePrefix = titleName ? `${titleName} ` : "";
  return `${levelPrefix}${titlePrefix}${itemName}`;
}

export function bankItemMatchesSearch(
  item: AggregatedBankItem,
  G: GData | undefined,
  searchTerm: string,
): boolean {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;

  if (item.category.toLowerCase().includes(term)) return true;
  if (String(item.level).includes(term)) return true;

  const itemKey = item.name as ItemKey;
  const gItem = G?.items[itemKey];
  if (gItem && itemMatchesSearch(itemKey, gItem, term)) return true;

  if (G) {
    const titleName = getTitleName(item, G);
    if (titleName.toLowerCase().includes(term)) return true;
  }

  return item.name.toLowerCase().includes(term);
}

export function filterAggregatedBankItems(
  items: AggregatedBankItem[],
  G: GData | undefined,
  searchTerm: string,
): AggregatedBankItem[] {
  if (!searchTerm.trim()) return items;
  return items.filter((item) => bankItemMatchesSearch(item, G, searchTerm));
}

export function filterItemsByCategory(
  itemsByCategory: Record<string, AggregatedBankItem[]>,
  G: GData | undefined,
  searchTerm: string,
): Record<string, AggregatedBankItem[]> {
  const filtered: Record<string, AggregatedBankItem[]> = {};
  for (const [category, categoryItems] of Object.entries(itemsByCategory)) {
    const nextItems = filterAggregatedBankItems(categoryItems, G, searchTerm);
    if (nextItems.length) {
      filtered[category] = nextItems;
    }
  }
  return filtered;
}

export function compareBankItems(
  prev: AggregatedBankItem[],
  next: AggregatedBankItem[],
  options: {
    prevGold?: number;
    nextGold?: number;
    prevUsedSlots?: number;
    nextUsedSlots?: number;
  } = {},
): BankRefreshSummary {
  const prevByKey = new Map(prev.map((item) => [getUniqueItemKey(item), item]));
  const nextByKey = new Map(next.map((item) => [getUniqueItemKey(item), item]));
  const changes: BankItemChange[] = [];

  for (const [key, nextItem] of nextByKey) {
    const prevItem = prevByKey.get(key);
    if (!prevItem) {
      changes.push({ kind: "added", item: nextItem });
      continue;
    }

    const deltaQ = nextItem.q - prevItem.q;
    const deltaStack = nextItem.stack - prevItem.stack;
    if (deltaQ !== 0 || deltaStack !== 0) {
      changes.push({
        kind: "changed",
        item: nextItem,
        previousQ: prevItem.q,
        previousStack: prevItem.stack,
        deltaQ,
        deltaStack,
      });
    }
  }

  for (const [key, prevItem] of prevByKey) {
    if (!nextByKey.has(key)) {
      changes.push({ kind: "removed", item: prevItem });
    }
  }

  changes.sort((a, b) => formatBankItemLabel(a.item).localeCompare(formatBankItemLabel(b.item)));

  const goldDelta =
    options.prevGold != null && options.nextGold != null
      ? options.nextGold - options.prevGold
      : undefined;
  const usedSlotsDelta =
    options.prevUsedSlots != null && options.nextUsedSlots != null
      ? options.nextUsedSlots - options.prevUsedSlots
      : undefined;

  return {
    changes,
    goldDelta,
    usedSlotsDelta,
    hasChanges: changes.length > 0 || goldDelta !== 0 || usedSlotsDelta !== 0,
  };
}

export function formatBankItemChange(change: BankItemChange, G?: GData): string {
  const label = formatBankItemLabel(change.item, G);

  if (change.kind === "added") {
    return `Added ${label} (${change.item.q.toLocaleString()} qty, ${change.item.stack} stacks)`;
  }

  if (change.kind === "removed") {
    return `Removed ${label} (${change.item.q.toLocaleString()} qty, ${change.item.stack} stacks)`;
  }

  const parts: string[] = [];
  if (change.deltaQ) {
    parts.push(`${change.deltaQ > 0 ? "+" : ""}${change.deltaQ.toLocaleString()} qty`);
  }
  if (change.deltaStack) {
    parts.push(`${change.deltaStack > 0 ? "+" : ""}${change.deltaStack} stacks`);
  }

  return `${label}: ${parts.join(", ")}`;
}
